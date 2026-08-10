/**
 * Shared API client for the Vegetable frontends (Admin, Obs, Mobile).
 *
 * Endpoint shapes are taken from vegetable.mobile.vue/store/api.service.js —
 * that file is the one that has actually been exercised against Vegetable.API
 * in production, so where it disagreed with the earlier Admin-only client
 * (`common/api.service.js`) it wins. See NOTE markers for the specific changes.
 *
 * Each *Service groups the endpoints of one Vegetable.API controller
 * (vegetable/Vegetable.API/Controllers/*.cs is the source of truth).
 *
 * ---------------------------------------------------------------------------
 * Transport
 * ---------------------------------------------------------------------------
 * The HTTP call itself is injected, because the three apps do not agree on how
 * to make one: the web apps use axios, while the mobile app has to go through
 * `uni.request` (there is no usable XHR in the app-plus container).
 *
 * A transport is:
 *
 *   transport({ method, url, baseURL, params, data, headers })
 *     -> Promise<{ data, status, headers }>
 *
 * and must throw on a non-2xx status, with `status` and `data` set on the
 * thrown error. `createAxiosTransport` (@vegetable/api-client/axios) is the web
 * implementation; the mobile one is apps/mobile/src/plugins/request.js.
 */

export function createApiClient({ baseURL, getToken, transport, onUnauthorized } = {}) {
  if (typeof transport !== 'function') {
    throw new TypeError(
      'createApiClient requires a `transport` function — use createAxiosTransport ' +
        'from @vegetable/api-client/axios, or createUniTransport in the mobile app.'
    )
  }

  async function request(method, url, { params, data, headers } = {}) {
    const finalHeaders = { ...headers }

    // Ported from Vegetable.Admin/plugins/axios.js and
    // vegetable.mobile.vue/plugins/axios.js — both attached a bearer token to
    // every request. Obs is anonymous and simply omits `getToken`.
    if (getToken) {
      const token = await getToken()
      if (token) finalHeaders.Authorization = `Bearer ${token}`
    }

    try {
      return await transport({ method, url, baseURL, params, data, headers: finalHeaders })
    } catch (error) {
      if (error && error.status === 401 && onUnauthorized) {
        await onUnauthorized(error)
      }
      throw error
    }
  }

  const join = (resource, guid) => (guid || guid === 0 ? `${resource}/${guid}` : resource)

  const query = (resource, params) => request('GET', resource, { params })
  const get = (resource, guid = '', params) => request('GET', join(resource, guid), { params })
  const post = (resource, data) => request('POST', resource, { data })
  const update = (resource, guid, data) => request('PUT', join(resource, guid), { data })
  const put = (resource, data) => request('PUT', resource, { data })
  const del = (resource, guid) => request('DELETE', join(resource, guid))

  const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

  const OwnerService = {
    // NOTE: the Admin-only client had `get(guid) -> owner/{guid}`. The mobile
    // client splits this into the full aggregate and the owner record proper,
    // which is what Vegetable.API actually exposes.
    getAllData: () => get('owner'),
    get: () => get('owner/information'),
    create: (owner) => post('owner', { ...owner }),
    update: (owner) => put('owner/information', { ...owner }),
    delete: () => del('owner'),
    verifyDuplicateAlias: (alias) => get('owner/duplicate/alias', alias)
  }

  const EmployeesService = {
    // NOTE: was `owner/{guid}/employees` in the Admin-only client.
    get: (guid = EMPTY_GUID) => get('owner/employee', guid),
    fetch: () => get('owner/employee'),
    create: (employee) => post('owner/employee', { ...employee }),
    update: (employeeId, employee) => update('owner/employee', employeeId, { ...employee }),
    delete: (employeeId) => del('owner/employee', employeeId)
  }

  const ServicesService = {
    // NOTE: was `owner/{guid}/services` in the Admin-only client.
    get: (guid = EMPTY_GUID) => get('owner/service', guid),
    fetch: () => get('owner/service'),
    create: (service) => post('owner/service', { ...service }),
    update: (serviceId, service) => update('owner/service', serviceId, { ...service }),
    delete: (serviceId) => del('owner/service', serviceId)
  }

  const SchedulesService = {
    get: (guid = EMPTY_GUID) => get('owner/schedule', guid),
    getOnDay: (guid = EMPTY_GUID) => get('owner/schedule/scheduleOnDay', guid),
    fetch: (employeeId) => get('owner/schedule/all', employeeId),
    create: (schedule) => post('owner/schedule', { ...schedule }),
    update: (schedule) => put('owner/schedule', { ...schedule }),
    delete: (scheduleId) => del('owner/schedule', scheduleId)
  }

  const ReservationsService = {
    get: (guid = EMPTY_GUID) => get('owner/reservation/r', guid),
    getCountByDays: () => get('owner/reservation/countbydays'),
    getTotalCostByMonth: () => get('owner/reservation/costbymonth'),
    fetch: (date, timezone) => get('owner/reservation', date, { timezone }),
    create: (reservation) => post('owner/reservation', { ...reservation }),
    update: (reservationId, reservation) =>
      update('owner/reservation', reservationId, { ...reservation }),
    delete: (reservationId) => del('owner/reservation', reservationId)
  }

  const CustomersService = {
    get: (guid = EMPTY_GUID) => get('owner/customer', guid),
    fetch: () => get('owner/customer/all'),
    create: (customer) => post('owner/customer', { ...customer }),
    importCustomers: (customers) => post('owner/customer/import', customers),
    update: (customerId, customer) => update('owner/customer', customerId, { ...customer }),
    delete: (customerId) => del('owner/customer', customerId),
    getShareLink: (guid = EMPTY_GUID) => get('owner/customer/sharelink', guid)
  }

  const UsersService = {
    create: (user) => post('owner/user', { ...user }),
    fetch: (phoneNumber) => get('owner/user', phoneNumber),
    update: (user) => put('owner/user', { ...user }),
    updateUserData: (phoneNumber, cid, platform) =>
      put(`owner/user/userdata/${phoneNumber}`, { cid, platform }),
    deleteUserData: (cid) => del('owner/user/userdata', cid),
    sendcode: (phoneNumber) => get('users/sendverification', phoneNumber),
    authenticate: (user) => post('users/authenticate', { ...user }),
    sendverificationcall: (phoneNumber, key, captcha) =>
      get('users/sendverificationcall', phoneNumber, { key, captcha }),
    getcaptcha: (key) => get('users/getcaptcha', key)
    // `users/updatemetadata` is not wrapped. It wrote `company_id` into Auth0
    // user metadata for admin's `?companyid=` invite link, and admin no longer
    // uses Auth0. The endpoint has also never worked: UserRepo.UpdateMetadata
    // interpolates the unawaited Task from GetToken() into its Authorization
    // header, so Auth0 has rejected every call it ever made.
  }

  const SettingsService = {
    getCurrencies: () => get('settings/currency'),
    getHints: () => get('settings/hints'),
    getApplicationSettings: () => get('settings/applicationSettings')
  }

  const ImagesService = {
    get: (imageName) => get('images', imageName),
    fetch: () => get('images/all'),
    add: (imageInfo) => post('images', { ...imageInfo }),
    delete: (imageId) => del('images', imageId)
  }

  const NotificationService = {
    get: (guid = EMPTY_GUID) => get('owner/notification', guid),
    fetch: () => get('owner/notification'),
    add: (notification) => post('owner/notification', { ...notification }),
    update: (notificationId, notification) =>
      update('owner/notification', notificationId, { ...notification }),
    delete: (notificationId) => del('owner/notification', notificationId),
    getReminder: (guid = EMPTY_GUID) => get('owner/notification/reminder', guid),
    createReminder: (reminder) => post('owner/notification/reminder', { ...reminder })
  }

  const SubscriptionService = {
    fetchSubscriptionTypes: () => get('settings/subscriptionTypes'),
    fetchSubscriptionDiscounts: () => get('settings/discounts'),
    initPayment: (subscriptionTypeId, quantity) =>
      get('payment/initPayment', subscriptionTypeId, { quantity })
  }

  const LogsService = {
    post: (log) => post('log', { ...log })
  }

  // Public/anonymous endpoints — used by Obs, which attaches no bearer token.
  //
  // NOTE: the earlier scaffold guessed at `public/owner` and `public/reservation`.
  // Neither exists. The controller is PublicOwnerController with [Route("[controller]")],
  // so every route below is under `publicowner/` — see
  // vegetable/Vegetable.API/Controllers/PublicController.cs.
  //
  // `createReservation` and `verifyCode` sit behind QueryTokenFilter
  // (Vegetable.API/Filters/TokenFilter.cs): they require a Google reCAPTCHA
  // token in `?token=`, and return 401 without one. Callers pass `captchaToken`.
  const PublicService = {
    getOwnerByAlias: (alias) => get('publicowner/search', alias),

    // Day-level availability for a calendar month: [{ item1: date, item2: bool }].
    getMonthSlots: (alias, { employeeId, duration, startDate, endDate }) =>
      get('publicowner/monthslots', alias, { employeeId, duration, startDate, endDate }),

    // Bookable start times on one day, as an array of ISO datetimes.
    getSlots: (alias, { employeeId, duration, date, excludeReservationId }) =>
      get('publicowner/slots', alias, { employeeId, duration, date, excludeReservationId }),

    // PUT, not POST. Does not create the reservation outright — it stashes it
    // against a command key and returns either
    //   { type: 'CustomerWithTlg', commandKey }  (known customer, confirm via Telegram)
    //   { type: 'NoTlg', tlgUrl, commandKey }    (new customer, subscribe first)
    createReservation: (alias, reservation, captchaToken) =>
      request('PUT', join('publicowner/reservation', alias), {
        data: reservation,
        params: { token: captchaToken }
      }),

    // Confirms the SMS code and is what actually writes the reservation.
    verifyCode: (phone, { code, commandKey, captchaToken }) =>
      get('publicowner/verifycode', phone, { code, commandKey, token: captchaToken }),

    getReservation: (alias, reservationId) =>
      get(`publicowner/reservation/${alias}`, reservationId)
  }

  const PaymentService = {
    init: (payload) => post('payment/init', payload)
  }

  return {
    request,
    query,
    get,
    post,
    update,
    put,
    delete: del,
    OwnerService,
    EmployeesService,
    ServicesService,
    SchedulesService,
    ReservationsService,
    CustomersService,
    UsersService,
    SettingsService,
    ImagesService,
    NotificationService,
    SubscriptionService,
    LogsService,
    PublicService,
    PaymentService
  }
}
