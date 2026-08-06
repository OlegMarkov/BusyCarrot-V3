/**
 * Schedule kinds, mirroring Vegetable.API's ScheduleType enum.
 *
 * `Week`   — the same pattern every week, one entry per weekday
 * `Switch` — a rotating cycle of N working days then M days off
 * `Custom` — a one-off override for a date range, which beats the general one
 *
 * The original repeated this map in five files (schedules.nvue, schedule/edit.nvue,
 * schedule-list-item.vue, onboarding.vue and dashboard-day.nvue).
 */
export const SCHEDULE_TYPES = Object.freeze({
  Week: 0,
  Switch: 1,
  Custom: 2
})
