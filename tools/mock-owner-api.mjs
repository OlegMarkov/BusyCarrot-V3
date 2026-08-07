/**
 * A stand-in for Vegetable.API's owner-side surface, for running apps/admin (and
 * the mobile H5 build) without the .NET backend and a seeded Postgres.
 *
 * It is a development aid, not a fake of the API's behaviour: there is no auth,
 * no validation and no persistence beyond the process lifetime. Writes mutate
 * the in-memory arrays so create/update/delete round-trip within a session,
 * which is enough to exercise the editors; restart and the seed data is back.
 *
 *     node tools/mock-owner-api.mjs          # or: npm run mock:api
 *
 * Pair it with VITE_DEV_BYPASS_AUTH=true — the app then sends no bearer token,
 * which a real Vegetable.API would answer 401 to. See apps/admin/src/plugins/dev-auth.js.
 */
import { createServer } from 'node:http'

const PORT = Number(process.env.MOCK_API_PORT || 5098)
const OWNER_ID = 'a1111111-1111-1111-1111-111111111111'

const pad = (n) => String(n).padStart(2, '0')
const day = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const at = (offset, h, m = 0) => new Date(`${day(offset)}T${pad(h)}:${pad(m)}:00Z`).toISOString()
const uid = (prefix) => `${prefix}${Math.random().toString(36).slice(2, 8)}`

/* ── seed data ─────────────────────────────────────────────────────────── */

const EMPLOYEES = [
  { id: 'e1', ownerId: OWNER_ID, firstName: 'Анна', lastName: 'Петрова', phone: '79990000001', email: 'anna@example.com', color: 'green', isDeleted: false, isChecked: true },
  { id: 'e2', ownerId: OWNER_ID, firstName: 'Борис', lastName: 'Иванов', phone: '79990000002', email: 'boris@example.com', color: 'blue', isDeleted: false, isChecked: true },
  { id: 'e3', ownerId: OWNER_ID, firstName: 'Екатерина', lastName: 'Смирнова-Задунайская', phone: '79990000003', email: 'kate@example.com', color: 'orange', isDeleted: false, isChecked: true }
]

const SERVICES = [
  { id: 'sv1', ownerId: OWNER_ID, title: 'Стрижка', description: 'Мытьё и стрижка', cost: 2500, currencyCode: 'RUB', durationInMinutes: 60, duration: '01:00:00', color: 'green', isDeleted: false, isChecked: true },
  { id: 'sv2', ownerId: OWNER_ID, title: 'Окрашивание в несколько тонов', description: 'Полное окрашивание с уходом и укладкой', cost: 6000, currencyCode: 'RUB', durationInMinutes: 120, duration: '02:00:00', color: 'deep-purple', isDeleted: false, isChecked: true },
  { id: 'sv3', ownerId: OWNER_ID, title: 'Укладка', description: '', cost: 1500, currencyCode: 'RUB', durationInMinutes: 30, duration: '00:30:00', color: 'light-blue', isDeleted: false, isChecked: true }
]

const CUSTOMERS = Array.from({ length: 30 }, (_, i) => ({
  id: `c${i + 1}`,
  ownerId: OWNER_ID,
  firstName: ['Иван', 'Мария', 'Пётр', 'Ольга', 'Николай'][i % 5],
  lastName: ['Иванов', 'Кузнецова', 'Сидоров', 'Морозова', 'Волков'][i % 5] + (i > 4 ? ` ${i}` : ''),
  phone: `7999000${pad(i + 10)}00`,
  email: `customer${i + 1}@example.com`,
  notes: i % 3 === 0 ? 'Постоянный клиент, предпочитает утро' : '',
  isDeleted: false,
  chatId: i % 2 === 0 ? 100000 + i : null,
  sendConfirmationSms: i % 2 === 0
}))

const reservation = (id, offset, hour, employee, services, customer) => ({
  id,
  ownerId: OWNER_ID,
  startTime: at(offset, hour),
  endTime: at(offset, hour + 1),
  cost: services.reduce((t, s) => t + s.cost, 0),
  employeeId: employee.id,
  employee,
  customerId: customer.id,
  customer,
  isConfirmed: id !== 'r3',
  reservationType: 0,
  remindInMin: 60,
  reservationServices: services.map((s) => ({ reservationId: id, serviceId: s.id, service: s })),
  images: []
})

const RESERVATIONS = [
  reservation('r1', 0, 9, EMPLOYEES[0], [SERVICES[0]], CUSTOMERS[0]),
  reservation('r2', 0, 11, EMPLOYEES[1], [SERVICES[1], SERVICES[2]], CUSTOMERS[1]),
  reservation('r3', 0, 14, EMPLOYEES[2], [SERVICES[2]], CUSTOMERS[2]),
  reservation('r4', 1, 10, EMPLOYEES[0], [SERVICES[1]], CUSTOMERS[3]),
  reservation('r5', -1, 16, EMPLOYEES[1], [SERVICES[0]], CUSTOMERS[4])
]

// dayNumber is Monday-indexed, matching Vegetable.API's scheduleOnDays.
// The hours vary by day so the week reads as a shape rather than a block:
// Mon–Thu 09:00–18:00, Fri to 19:00, Sat 10:00–16:00, Sun closed.
const DAY_HOURS = [
  ['09:00:00', '18:00:00'],
  ['09:00:00', '18:00:00'],
  ['09:00:00', '18:00:00'],
  ['09:00:00', '18:00:00'],
  ['09:00:00', '19:00:00'],
  ['10:00:00', '16:00:00'],
  null
]

const scheduleOnDay = (i) => ({
  id: `sod${i}`,
  // The real API numbers these with a 1-based `sequence` and carries no
  // `dayNumber`; consumers index the array positionally. Both are emitted so
  // the stub cannot make a reader look correct that would break against it.
  sequence: i + 1,
  dayNumber: i,
  isEnabled: DAY_HOURS[i] !== null,
  workStartTime: (DAY_HOURS[i] || DAY_HOURS[0])[0],
  workEndTime: (DAY_HOURS[i] || DAY_HOURS[0])[1],
  breakStartTime: '13:00:00',
  breakEndTime: '14:00:00',
  enableBreakTime: true
})

const SCHEDULES = EMPLOYEES.map((e, idx) => ({
  id: `sch${idx + 1}`,
  ownerId: OWNER_ID,
  employeeId: e.id,
  // 0 = weekly, the shape the Hours screen draws as a bar per weekday.
  scheduleType: 0,
  scheduleStartDate: day(-30),
  scheduleEndDate: day(365),
  onDays: 5,
  offDays: 2,
  scheduleOnDays: Array.from({ length: 7 }, (_, i) => scheduleOnDay(i))
}))

const OWNER = {
  id: OWNER_ID,
  title: 'Busy Carrot Studio',
  description: 'Салон красоты',
  alias: 'demo',
  email: 'owner@example.com',
  country: 'RU',
  timeZone: 'Europe/Moscow',
  currency: { code: 'RUB', symbol: '₽' },
  currencyCode: 'RUB',
  language: 'ru',
  disableReservationAtSameDay: false,
  // A subscribed owner, so the Settings panel exercises its figure and its
  // "personal site" row rather than only the never-subscribed default.
  subscription: { id: 'st1', title: 'Premium', cost: 500, currencyCode: 'RUB' },
  hasActiveSubscription: true,
  subscriptionEndDate: day(180),
  phoneNumbers: [{ id: 'p1', number: '+7 999 123-45-67', type: 1 }],
  addresses: [{ id: 'ad1', description: 'Главный салон', state: 'Москва', city: 'Москва', street: 'Тверская', unit: '12', points: '37.6156 55.7522' }],
  socialNetworks: [{ id: 's1', type: 11, url: 'instagram.com/busycarrot' }],
  employees: EMPLOYEES,
  services: SERVICES,
  customers: CUSTOMERS,
  schedules: SCHEDULES,
  reservations: RESERVATIONS,
  images: []
}

const NOTIFICATIONS = [
  { id: 'n1', ownerId: OWNER_ID, title: 'Напоминание о записи', text: 'Здравствуйте, {name}! Напоминаем о записи {date}.', notificationType: 0, isEnabled: true, remindInMin: 120 },
  { id: 'n2', ownerId: OWNER_ID, title: 'Подтверждение', text: 'Ваша запись подтверждена.', notificationType: 1, isEnabled: false, remindInMin: 0 }
]

const SUBSCRIPTION_TYPES = [
  { id: 'st1', title: 'Месяц', months: 1, cost: 500, currencyCode: 'RUB' },
  { id: 'st2', title: 'Полгода', months: 6, cost: 2500, currencyCode: 'RUB' },
  { id: 'st3', title: 'Год', months: 12, cost: 4500, currencyCode: 'RUB' }
]

/* ── the captcha plate ─────────────────────────────────────────────────
 *
 * The login screen asks the API for a base64 GIF and shows it in a 104 x 44
 * plate. Rather than serve a fixed placeholder, this draws one: a 5 x 7 bitmap
 * per digit, scaled 3x, on to an indexed GIF built by hand.
 *
 * Digits only — the real API issues alphanumerics. This exists so the login
 * screen can be exercised, not to reproduce the API's character set. The stub
 * accepts any answer.
 */

const DIGITS = [
  [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], // 0
  [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e], // 1
  [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f], // 2
  [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e], // 3
  [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], // 4
  [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e], // 5
  [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], // 6
  [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08], // 7
  [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], // 8
  [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c] // 9
]

const CAPTCHA_W = 104
const CAPTCHA_H = 44

// Palette indices: 0 ground, 1 ink, 2 accent ink, 3 hairline.
const PALETTE = [
  [0xf5, 0xf5, 0xf8],
  [0x42, 0x42, 0x44],
  [0x41, 0x61, 0x80],
  [0xc4, 0xc4, 0xc8]
]

function drawCaptcha(text) {
  const px = new Uint8Array(CAPTCHA_W * CAPTCHA_H) // index 0 everywhere
  const scale = 3
  const glyphW = 5 * scale
  const glyphH = 7 * scale
  const gap = 6
  const totalW = text.length * glyphW + (text.length - 1) * gap
  let x0 = Math.round((CAPTCHA_W - totalW) / 2)
  const y0 = Math.round((CAPTCHA_H - glyphH) / 2)

  for (let g = 0; g < text.length; g++) {
    const rows = DIGITS[Number(text[g])]
    const ink = g % 2 === 0 ? 1 : 2
    // A small vertical jitter per glyph, the way the design rotates its own.
    const dy = [-2, 1, -1, 2][g % 4]
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (!(rows[r] & (1 << (4 - c)))) continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = x0 + c * scale + sx
            const y = y0 + r * scale + sy + dy
            if (x >= 0 && x < CAPTCHA_W && y >= 0 && y < CAPTCHA_H) px[y * CAPTCHA_W + x] = ink
          }
        }
      }
    }
    x0 += glyphW + gap
  }

  // The strike-through the design draws across its plate.
  for (let x = 4; x < CAPTCHA_W - 4; x++) {
    const y = Math.round(CAPTCHA_H * 0.56 - (x - CAPTCHA_W / 2) * 0.07)
    if (y >= 0 && y < CAPTCHA_H) px[y * CAPTCHA_W + x] = 3
  }

  return gifBase64(px, CAPTCHA_W, CAPTCHA_H)
}

/**
 * A GIF87a with the "uncompressed LZW" trick: with a minimum code size of 7 the
 * codes are 8 bits wide, and emitting a clear code before the dictionary can
 * grow past 255 entries keeps them there — so every pixel is one literal byte
 * and no compressor is needed.
 */
function gifBase64(px, w, h) {
  const out = []
  const push = (...b) => out.push(...b)
  const short = (n) => push(n & 0xff, (n >> 8) & 0xff)

  push(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) // GIF87a
  short(w)
  short(h)
  push(0xf6, 0x00, 0x00) // global table, 128 entries (2^7)

  for (let i = 0; i < 128; i++) {
    const c = PALETTE[i] || [0, 0, 0]
    push(c[0], c[1], c[2])
  }

  push(0x2c) // image descriptor
  short(0)
  short(0)
  short(w)
  short(h)
  push(0x00)
  push(0x07) // LZW minimum code size

  const CLEAR = 128
  const EOI = 129
  const codes = []
  let sinceClear = 0
  codes.push(CLEAR)
  for (let i = 0; i < px.length; i++) {
    if (sinceClear >= 120) {
      codes.push(CLEAR)
      sinceClear = 0
    }
    codes.push(px[i])
    sinceClear++
  }
  codes.push(EOI)

  for (let i = 0; i < codes.length; i += 255) {
    const chunk = codes.slice(i, i + 255)
    push(chunk.length, ...chunk)
  }
  push(0x00, 0x3b)

  return Buffer.from(Uint8Array.from(out)).toString('base64')
}

const randomCaptcha = () =>
  Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 10))).join('')

/* ── reads ─────────────────────────────────────────────────────────────── */

const last = (path) => path.split('/').pop()

const GETS = [
  [/^owner$/, () => OWNER],
  [/^owner\/information$/, () => OWNER],
  [/^owner\/duplicate\/alias/, () => false],
  [/^owner\/employee$/, () => EMPLOYEES],
  [/^owner\/employee\/[^/]+$/, (p) => EMPLOYEES.find((e) => e.id === last(p)) || blank('employee')],
  [/^owner\/service$/, () => SERVICES],
  [/^owner\/service\/[^/]+$/, (p) => SERVICES.find((s) => s.id === last(p)) || blank('service')],
  [/^owner\/schedule\/all\/[^/]+$/, (p) => SCHEDULES.filter((s) => s.employeeId === last(p))],
  [/^owner\/schedule\/scheduleonday/, () => SCHEDULES[0].scheduleOnDays[0]],
  [/^owner\/schedule/, () => SCHEDULES[0]],
  [/^owner\/reservation\/countbydays$/, () => ({ [day(-1)]: 1, [day(0)]: 3, [day(1)]: 1 })],
  [/^owner\/reservation\/costbymonth$/, () => ({ 1: 12000, 2: 18000, 3: 9000, 4: 22000 })],
  // The empty guid is how the client asks for a blank template to start a new
  // booking from. Falling back to a real record here is not a harmless default:
  // the client spreads what it gets, so it would inherit that record's id and
  // the create would silently become an update.
  [
    /^owner\/reservation\/r\/[^/]+$/,
    (p) => RESERVATIONS.find((r) => r.id === last(p)) || blank('reservation')
  ],
  [/^owner\/reservation/, () => RESERVATIONS],
  [/^owner\/customer\/all$/, () => CUSTOMERS],
  [/^owner\/customer\/sharelink/, () => ({ link: 'https://busycarrot.com/c/abc123' })],
  [/^owner\/customer/, (p) => CUSTOMERS.find((c) => c.id === last(p)) || blank('customer')],
  [/^owner\/notification\/reminder/, () => ({ id: 'rem1', remindInMin: 120, isEnabled: true })],
  [/^owner\/notification/, () => NOTIFICATIONS],
  [/^owner\/user/, () => ({ id: 'u1', ownerId: OWNER_ID, phoneNumber: '79990000001', language: 'ru', onboardingCompleted: true, userDatas: [] })],
  [/^settings\/currency$/, () => [{ code: 'RUB', symbol: '₽', title: 'Рубль' }, { code: 'USD', symbol: '$', title: 'Dollar' }]],
  [/^settings\/hints$/, () => [{ id: 'h1', key: 'dashboard', text: 'Проведите влево для следующего дня' }]],
  [/^settings\/applicationsettings$/, () => ({ minVersion: '1.0.0', currentVersion: '1.0.0' })],
  [/^settings\/subscriptiontypes$/, () => SUBSCRIPTION_TYPES],
  [/^settings\/discounts$/, () => [{ id: 'd1', months: 6, percent: 10 }]],
  [/^images/, () => []],
  [/^log$/, () => ({ ok: true })],
  [/^users\/getcaptcha/, () => drawCaptcha(randomCaptcha())],
  [/^users\/sendverificationcall/, () => ({ ok: true })],
  [/^users\/sendverification/, () => ({ ok: true })],
  [/^users\/authenticate$/, () => ({ accessToken: 'mock-token', refreshToken: 'mock-refresh' })],
  [/^payment\/initpayment/, () => ({ url: 'https://example.com/pay' })]
]

function blank(kind) {
  const common = { id: '', ownerId: OWNER_ID }
  if (kind === 'employee') return { ...common, firstName: '', lastName: '', phone: '', email: '', color: 'green' }
  if (kind === 'service') return { ...common, title: '', description: '', cost: 0, durationInMinutes: 30, currencyCode: 'RUB', color: 'green' }
  if (kind === 'reservation')
    return {
      ...common,
      startTime: null,
      endTime: null,
      cost: 0,
      customerId: null,
      employeeId: null,
      isConfirmed: false,
      reservationType: 0,
      remindInMin: 0,
      reservationServices: [],
      images: []
    }
  return { ...common, firstName: '', lastName: '', phone: '', email: '', notes: '' }
}

/* ── writes ────────────────────────────────────────────────────────────── */

// Which collection a path writes to, and the id prefix for new records.
const COLLECTIONS = [
  [/^owner\/employee/, EMPLOYEES, 'e'],
  [/^owner\/service/, SERVICES, 'sv'],
  [/^owner\/customer/, CUSTOMERS, 'c'],
  [/^owner\/reservation/, RESERVATIONS, 'r'],
  [/^owner\/schedule/, SCHEDULES, 'sch'],
  [/^owner\/notification/, NOTIFICATIONS, 'n']
]

const collectionFor = (path) => COLLECTIONS.find(([re]) => re.test(path))

function write(method, path, body) {
  // Login: any code is accepted — this stub does not place calls.
  if (path === 'users/authenticate') {
    return { token: 'mock-token', user: { id: 'u1', ownerId: OWNER_ID, phoneNumber: body?.user?.phoneNumber || '', language: body?.user?.language || 'ru', onboardingCompleted: true, userDatas: [] } }
  }

  const found = collectionFor(path)
  if (!found) return { ok: true }
  const [, items, prefix] = found

  if (method === 'DELETE') {
    const i = items.findIndex((x) => x.id === last(path))
    if (i >= 0) items.splice(i, 1)
    return { ok: true }
  }

  const id = body?.id || (/^[a-z]+[a-z0-9]*$/i.test(last(path)) && last(path) !== path ? last(path) : '')
  const existing = id && items.find((x) => x.id === id)

  if (existing) {
    Object.assign(existing, body)
    return existing
  }

  const created = { ownerId: OWNER_ID, ...body, id: body?.id || uid(prefix) }
  items.push(created)
  return created
}

/* ── server ────────────────────────────────────────────────────────────── */

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '').toLowerCase()

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  if (req.method === 'GET') {
    for (const [pattern, handler] of GETS) {
      if (pattern.test(path)) return res.end(JSON.stringify(handler(path)))
    }
    console.log('unmatched GET:', path)
    return res.end(JSON.stringify(null))
  }

  let raw = ''
  req.on('data', (chunk) => (raw += chunk))
  req.on('end', () => {
    let body = null
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      /* a malformed body is treated as none — this is a stub, not a validator */
    }
    console.log(req.method, path)
    res.end(JSON.stringify(write(req.method, path, body)))
  })
})

server.listen(PORT, () => {
  console.log(`mock owner api on http://localhost:${PORT}/`)
  console.log('seed: 3 employees, 3 services, 30 customers, 5 reservations (yesterday→tomorrow)')
})
