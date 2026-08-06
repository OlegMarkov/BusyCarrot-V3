<template>
  <view class="nv view">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.gallery')"
      @clickLeft="navigateBack"
    />
    <gallery :images="galleryImages" />
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import gallery from '@/components/app/gallery.vue'
import { useImageStore } from '@/stores/image'

/** Ported from vegetable.mobile.vue/pages/settings/mainGallery.nvue. */
export default {
  components: { uniNavBar, gallery },
  computed: {
    ...mapState(useImageStore, ['galleryImages'])
  },
  methods: {
    navigateBack() {
      uni.navigateBack()
    }
  }
}
</script>
