import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'

/** Ported from vegetable.mobile.vue/store/image.module.js. */
export const useImageStore = defineStore('image', {
  state: () => ({
    images: []
  }),

  getters: {
    primaryImage: (state) => state.images.find((image) => image.isPrimary === true),
    galleryImages: (state) =>
      state.images.filter(
        (image) =>
          image.isPrimary === false &&
          !image.reservationId &&
          !image.customerId &&
          !image.serviceId &&
          !image.employeeId
      ),
    getImagesByCustomerId: (state) => (customerId) =>
      state.images.filter((image) => image.isPrimary === false && image.customerId === customerId),
    getImagesByReservationId: (state) => (reservationId) =>
      state.images.filter(
        (image) => image.isPrimary === false && image.reservationId === reservationId
      ),
    getImagesByServiceId: (state) => (serviceId) =>
      state.images.filter((image) => image.isPrimary === false && image.serviceId === serviceId)
  },

  actions: {
    setImages(images) {
      this.images = images
    },

    async fetchImages() {
      return tracked(async () => {
        const { data } = await apiClient.ImagesService.fetch()
        this.images = data
        return data
      })
    },

    async uploadImage(image) {
      await tracked(() => apiClient.ImagesService.add(image))
      return this.fetchImages()
    },

    async deleteImage(imageId) {
      await tracked(() => apiClient.ImagesService.delete(imageId))
      return this.fetchImages()
    },

    reset() {
      this.images = []
    }
  }
})
