import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'

/** Ported from vegetable.mobile.vue/store/notification.module.js. */
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: []
  }),

  getters: {
    getNotificationById: (state) => (id) =>
      state.notifications.find((notification) => notification.id === id),
    getNotificationsByDate: (state) => (date) =>
      state.notifications.filter(
        (notification) =>
          moment(notification.notificationDateUTC).local().format('YYYY-MM-DD') === date
      ),
    getNotificationsByType: (state) => (type) =>
      state.notifications.filter((notification) => notification.notificationType === type),
    getNotificationsByCustomer: (state) => (customerId) =>
      state.notifications.filter((notification) => notification.customerId === customerId),
    getNotificationsByReservation: (state) => (reservationId) =>
      state.notifications.filter((notification) => notification.reservationId === reservationId)
  },

  actions: {
    /**
     * Converts each UTC timestamp to local time and sorts newest first.
     * The original used underscore's _.map/_.sortBy; plain array methods here.
     */
    setNotifications(notifications) {
      this.notifications = notifications
        .map((notification) => ({
          ...notification,
          notificationDateUTC: moment.utc(notification.notificationDateUTC).local().format()
        }))
        .sort((a, b) => (a.notificationDateUTC < b.notificationDateUTC ? 1 : -1))
    },

    async fetchNotifications() {
      return tracked(async () => {
        const { data } = await apiClient.NotificationService.fetch()
        this.setNotifications(data)
        return data
      })
    },

    async getNotification(notificationId) {
      return tracked(async () => {
        const { data } = await apiClient.NotificationService.get(notificationId)
        return data
      })
    },

    async getNotificationReminder(reservationId) {
      return tracked(async () => {
        const { data } = await apiClient.NotificationService.getReminder(reservationId)
        return data
      })
    },

    async createNotification(notification) {
      await tracked(() => apiClient.NotificationService.add(notification))
      return this.fetchNotifications()
    },

    async createReminder(reminder) {
      await tracked(() => apiClient.NotificationService.createReminder(reminder))
      return this.fetchNotifications()
    },

    async updateNotification({ notificationId, notification }) {
      await tracked(() => apiClient.NotificationService.update(notificationId, notification))
      return this.fetchNotifications()
    },

    async deleteNotification(notificationId) {
      await tracked(() => apiClient.NotificationService.delete(notificationId))
      return this.fetchNotifications()
    },

    reset() {
      this.notifications = []
    }
  }
})
