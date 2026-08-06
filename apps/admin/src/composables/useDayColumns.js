import { computed, unref } from 'vue'
import moment from 'moment'
import { useReservationStore } from '@/stores/reservation'
import { useScheduleStore } from '@/stores/schedule'
import { useCustomerStore } from '@/stores/customer'
import { useServiceStore } from '@/stores/service'
import { useOwnerStore } from '@/stores/owner'

/** The calendar's window and scale, matching the design. */
export const GRID_START = 480 // 08:00
export const GRID_END = 1200 // 20:00
export const PX_PER_MINUTE = 0.95

/** "09:30" → 570 */
export function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':')
  return Number(h) * 60 + Number(m)
}

/** 570 → "09:30" */
export function fromMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 75 → "1h 15m" */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/**
 * Turns the stores into the column shape TimeGrid draws: for each day, its
 * bookings positioned by start time and sized by duration, and the bookable
 * gaps between them.
 *
 * A gap shorter than 20 minutes is not offered — the design's threshold, and a
 * sensible one, since nothing in the price list is shorter.
 */
export function useDayColumns(days, selectedId) {
  const reservations = useReservationStore()
  const schedules = useScheduleStore()
  const customers = useCustomerStore()
  const services = useServiceStore()
  const owner = useOwnerStore()

  const currency = computed(() => owner.owner?.currency?.symbol ?? '')

  function reservationsOn(dayKey) {
    return [...reservations.getReservationsByDate(dayKey)].sort((a, b) =>
      moment(a.startTime).diff(moment(b.startTime))
    )
  }

  function nameOf(reservation) {
    const customer = customers.getCustomerById?.(reservation.customerId)
    if (!customer) return reservation.customer?.firstName
      ? [reservation.customer.firstName, reservation.customer.lastName].filter(Boolean).join(' ')
      : '—'
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  }

  function servicesOf(reservation) {
    return (reservation.reservationServices || [])
      .map((link) => services.getServiceById?.(link.serviceId)?.title || link.service?.title)
      .filter(Boolean)
      .join(', ')
  }

  return computed(() =>
    unref(days).map((day) => {
      const key = day.format('YYYY-MM-DD')
      const onDay = schedules.scheduleOnDate(day)
      const openM = onDay ? toMinutes(onDay.workStartTime) : null
      const closeM = onDay ? toMinutes(onDay.workEndTime) : null

      const list = reservationsOn(key)
      const blocks = []
      const gaps = []

      if (openM !== null && closeM !== null) {
        let cursor = openM

        const addGap = (from, to) => {
          if (to - from < 20) return
          gaps.push({
            key: `${key}-gap-${from}`,
            start: from,
            top: `${(from - GRID_START) * PX_PER_MINUTE}px`,
            height: `${(to - from) * PX_PER_MINUTE - 2}px`,
            // Only label the duration when there is room to read it.
            label: to - from >= 40 ? `+ ${formatDuration(to - from)}` : '+'
          })
        }

        for (const reservation of list) {
          const start = moment(reservation.startTime)
          const end = moment(reservation.endTime)
          const startM = start.hours() * 60 + start.minutes()
          const endM = end.hours() * 60 + end.minutes()

          addGap(cursor, startM)

          // A 20-minute booking would otherwise be too short to show anything.
          const heightPx = Math.max(24, (endM - startM) * PX_PER_MINUTE - 2)

          blocks.push({
            key: reservation.id,
            id: reservation.id,
            top: `${(startM - GRID_START) * PX_PER_MINUTE}px`,
            height: `${heightPx}px`,
            showTime: heightPx >= 46,
            showServices: heightPx >= 64,
            nameSize: heightPx < 34 ? '12px' : '13.5px',
            name: nameOf(reservation),
            cost: `${currency.value}${reservation.cost ?? 0}`,
            time: `${start.format('HH:mm')} – ${end.format('HH:mm')}`,
            services: servicesOf(reservation)
          })

          cursor = Math.max(cursor, endM)
        }

        addGap(cursor, closeM)
      }

      const total = list.reduce((sum, r) => sum + (r.cost ?? 0), 0)

      return {
        key,
        dow: day.format('dd'),
        dayNumber: day.format('D'),
        sub: onDay ? `${list.length} · ${currency.value}${total}` : '—',
        closed: !onDay,
        open: openM,
        close: closeM,
        total,
        reservations: list,
        blocks,
        gaps,
        selectedId: unref(selectedId)
      }
    })
  )
}
