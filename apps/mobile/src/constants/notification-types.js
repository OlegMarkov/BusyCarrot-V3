/**
 * Notification type ids, mirroring Vegetable.API's NotificationType enum.
 *
 * The original repeated this map verbatim in
 * pages/settings/notification/notifications.nvue,
 * pages/settings/notification/edit.nvue and
 * components/app/notification-list-item.vue. The misspelling of
 * `SubscriptionEdnded` is kept — the name is only used locally, but keeping it
 * identical makes the three copies easy to diff against the originals.
 */
export const NOTIFICATION_TYPES = Object.freeze({
  DailyReport: 0,
  NewReservationClient: 1,
  CancelReservationClient: 2,
  ChangeReservationClient: 3,
  NewReservationOwner: 4,
  CancelReservationOwner: 5,
  ChangeReservationOwner: 6,
  ReminderReservation: 7,
  SubscriptionCreated: 8,
  ReminderSubscriptionEnd: 9,
  SubscriptionEdnded: 10,
  ReminderClientBirthday: 11,
  ConfirmationReservationOwner: 12,
  ConfirmationReservationClient: 13
})
