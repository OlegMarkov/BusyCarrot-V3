import moment from 'moment'

/**
 * Renders a slot returned by `publicowner/slots` or `publicowner/monthslots`.
 *
 * These strings look like instants and are not. Vegetable.API stores the
 * schedule as wall-clock intervals — `SchedulesOnDays.WorkStartTime` is
 * `09:00:00`, with no zone — and serialises them with a `Z` suffix, so a salon
 * that opens at nine emits `2026-08-10T09:00:00Z`. Verified against the
 * database: the stored interval and the emitted hour are the same number.
 *
 * That makes the `Z` a lie, and it matters because the obvious reading of it is
 * wrong in both directions:
 *
 *  - `moment(value).format('HH:mm')` converts to the *viewer's* zone. That is
 *    what this app shipped with, and on a UTC+3 machine it displayed the salon's
 *    09:00 opening as 12:00. The customer and the barber would have been
 *    reading different times for the same booking.
 *  - Converting to the owner's zone instead — the owner record does carry
 *    `timeZone` — adds the offset a second time and is worse.
 *
 * The right answer while the API behaves this way is to show the wall clock
 * exactly as sent, which is what the original vegetable.web did by rendering
 * the raw value. `parseZone` keeps whatever offset is in the string instead of
 * shifting to local, so the digits survive.
 *
 * **If Vegetable.API is ever corrected to emit real instants**, this is the
 * place that has to change with it: it would then need to convert into the
 * owner's `timeZone` rather than preserve the offset, and it would need
 * moment-timezone, which obs does not currently depend on.
 */
export function slotTime(value) {
  if (!value) return ''
  return moment.parseZone(value).format('HH:mm')
}

/**
 * The calendar date a slot belongs to, by the same wall-clock reading. Used
 * where a slot has to be matched against a day rather than displayed — near
 * midnight, converting to local first can land it on the wrong date.
 */
export function slotDay(value) {
  if (!value) return ''
  return moment.parseZone(value).format('YYYY-MM-DD')
}
