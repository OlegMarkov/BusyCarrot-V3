import moment from 'moment-timezone'
import { useOwnerStore } from '@/stores/owner'

/**
 * Renders a slot returned by `publicowner/slots` or `publicowner/monthslots`
 * in the salon's own clock.
 *
 * These are real UTC instants and must be converted, not read literally. A
 * Moscow salon opening at 09:00 comes back as `2026-08-10T06:00:00Z`, and the
 * booking page has to say 09:00 — to the customer *and* to the barber, wherever
 * either of them happens to be sitting. So the owner's `timeZone` decides, not
 * the browser's.
 *
 * ## The mistake this file used to make
 *
 * It formatted the wall clock of the string as-sent, deliberately, on the
 * strength of an API that returned `09:00:00Z` for a 09:00 opening — from which
 * the obvious conclusion was that the `Z` was a lie and the digits should be
 * shown untouched.
 *
 * The `Z` was not a lie. The API was buggy: PublicController built its working
 * hours with `ToUniversalTime()` on a `DateTimeKind.Unspecified` value, which
 * reads it in the *server's* zone. The verification server was a UTC container,
 * so 09:00 stayed 09:00 and looked like a wall clock. On the Windows host, whose
 * zone matches the owner's, the same request returned the correct 06:00Z all
 * along. Two servers, one database, different answers — which is what gave it
 * away.
 *
 * With the API now converting through `owner.TimeZone`, these are proper
 * instants everywhere, and converting into the owner's zone is right.
 */

/** Falls back to the browser's zone only if the owner has none recorded. */
function ownerZone() {
  return useOwnerStore().owner?.timeZone || moment.tz.guess()
}

export function slotTime(value) {
  if (!value) return ''
  return moment(value).tz(ownerZone()).format('HH:mm')
}

/**
 * The calendar date a slot falls on, in the salon's zone. Matters near
 * midnight: an instant can belong to a different date for the customer than it
 * does for the salon, and the salon's is the one that means anything.
 */
export function slotDay(value) {
  if (!value) return ''
  return moment(value).tz(ownerZone()).format('YYYY-MM-DD')
}
