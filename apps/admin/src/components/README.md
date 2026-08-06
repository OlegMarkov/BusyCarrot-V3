# Components still to port (Admin)

Not yet migrated. Each needs a Vuetify 2 -> 3 pass (prop/slot renames, the
calendar events API changed most). Source: `vegetable/Vegetable.Admin/components/`.

| Original file | Notes |
|---|---|
| `calendar.vue` | Main calendar view |
| `calendar/calendar-header.vue` | Month/week/day switcher |
| `calendar/day.vue` | Day cell renderer |
| `actions-panel/actions-panel.vue` | Right-hand panel container |
| `actions-panel/general-settings.vue` | Company info, addresses, subscription form |
| `actions-panel/user-profile.vue` | Logout, invite link |
| `schedule/schedule-edit.vue` | Employee schedule editor |
| `elements/avatar-editor.vue` | Uses `vue-advanced-cropper` / `vue-image-crop-upload` — check Vue 3 compatible replacement |
| `elements/color-selector.vue` | Service color picker |
| `elements/datepicker.vue` | |
| `elements/datetime-range.vue` | |
| `elements/day-schedule.vue` | |
| `elements/repeatsettings.vue` | Recurring schedule rules |
| `elements/timepicker.vue` | |
| `elements/weekdays.vue` | |

`elements/avatar-editor.vue`'s cropper libraries should be checked for Vue 3
support before porting — that's the one component likely to need a library
swap rather than a straight port.
