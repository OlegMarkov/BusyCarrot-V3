<template>
  <view class="nv view">
    <!-- Fullscreen viewer for the tapped image -->
    <view v-if="zoomImageIndex >= 0" class="zoom-container">
      <view class="zoom-fill" />
      <image class="zoom-image" mode="aspectFit" :src="images[zoomImageIndex].url" @click="zoomOut" />
      <view class="buttons-container">
        <view @click.stop.prevent="prev">
          <image src="@/static/icons/straignht-left-arrow.png" mode="aspectFit" class="gallery-remove-icon" />
        </view>
        <view class="circle-button" @click.stop.prevent="deleteImage">
          <image src="@/static/icons/trash.png" mode="aspectFit" class="gallery-remove-icon" />
        </view>
        <view @click.stop.prevent="next">
          <image src="@/static/icons/straight-right-arrow.png" mode="aspectFit" class="gallery-remove-icon" />
        </view>
      </view>
    </view>

    <button @click="selectImage">{{ $t('common.upload') }}</button>

    <view class="gallery-grid">
      <view v-for="(image, index) in images" :key="image.id" class="gallery-cell">
        <image mode="aspectFill" class="gallery-image" :src="image.url" @click="zoomIn(index)" />
      </view>
    </view>
  </view>
</template>

<script>
import { pathToBase64 } from 'image-tools'
import { useImageStore } from '@/stores/image'

/**
 * Ported from vegetable.mobile.vue/components/app/gallery.nvue.
 *
 * A three-across thumbnail grid with a fullscreen viewer and delete.
 *
 * The nvue `<waterfall column-count="3">` with its `<header>` and `<cell>`
 * children has no webview equivalent, so the upload button moved out of the
 * header slot and the grid is `flex-wrap` with each cell at a third of the
 * width. That is a masonry-to-uniform-grid change: images now sit on a regular
 * grid rather than packing by height. Worth a look on a device — it is the one
 * place in this port where the layout is deliberately not identical.
 */
export default {
  name: 'AppGallery',
  props: {
    images: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      zoomImageIndex: -1
    }
  },
  methods: {
    selectImage() {
      uni.chooseImage({
        count: 10,
        sourceType: ['album'],
        success: (res) => {
          res.tempFilePaths.forEach((path) => {
            pathToBase64(path)
              .then((base64) => useImageStore().uploadImage({ ImageBase64: base64 }))
              .catch((error) => console.error(error))
          })
        }
      })
    },

    zoomIn(index) {
      this.zoomImageIndex = index
    },

    zoomOut() {
      this.zoomImageIndex = -1
    },

    deleteImage() {
      if (this.zoomImageIndex < 0) return
      useImageStore().deleteImage(this.images[this.zoomImageIndex].id)
      this.zoomOut()
    },

    prev() {
      this.zoomImageIndex =
        this.zoomImageIndex > 0 ? this.zoomImageIndex - 1 : this.images.length - 1
    },

    next() {
      this.zoomImageIndex =
        this.zoomImageIndex + 1 < this.images.length ? this.zoomImageIndex + 1 : 0
    }
  }
}
</script>

<style lang="scss" scoped>
.zoom-container {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  justify-content: center;
  z-index: 100;
}

.zoom-fill {
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  position: absolute;
  background-color: gray;
  opacity: 0.8;
}

.zoom-image {
  height: 900rpx;
  position: fixed;
  left: 50rpx;
  right: 50rpx;
  top: 100rpx;
  bottom: 300rpx;
}

.gallery-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.gallery-cell {
  width: 33.33%;
  padding: 7rpx;
}

.gallery-image {
  height: 200rpx;
  width: 100%;
  background-color: #eeeeee;
  margin-bottom: 20rpx;
}

.buttons-container {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  bottom: 50rpx;
  flex-direction: row;
  justify-content: space-around;
}

.circle-button {
  height: 150rpx;
  width: 150rpx;
  border-radius: 75rpx;
  justify-content: center;
  flex-direction: row;
  align-items: center;
  background-color: $uni-color-error;
}

.gallery-remove-icon {
  flex: 1;
  height: 100rpx;
  width: 100rpx;
}
</style>
