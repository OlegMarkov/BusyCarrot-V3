<template>
  <view v-if="showPopup" class="uni-popup" :class="[popupstyle]" @touchmove.stop.prevent="noop">
    <uni-transition
      v-if="maskShow"
      :mode-class="['fade']"
      :styles="maskClass"
      :duration="duration"
      :show="showTrans"
      @click="onTap"
    />
    <uni-transition
      :mode-class="ani"
      :styles="transClass"
      :duration="duration"
      :show="showTrans"
      @click="onTap"
    >
      <view class="uni-popup__wrapper-box" @click.stop>
        <slot />
      </view>
    </uni-transition>
  </view>
</template>

<script>
import uniTransition from '../uni-transition/uni-transition.vue'

/**
 * Ported from vegetable.mobile.vue/components/uni-popup/uni-popup.vue.
 *
 * Opened and closed imperatively through a template ref — `this.$refs.popup.open()`
 * — which is how all ~15 call sites use it, so `open()` / `close()` and the
 * `change` event keep their exact signatures.
 *
 * Simplifications: the popup.js / message.js mixin pair only existed to map
 * extra type aliases (message → top, dialog → center, share → bottom) and to
 * auto-close the `message` type. Only 'center' and 'bottom' are used in this
 * app, so the map is inlined below and the mixins are gone.
 *
 * Vue 3 note: `clear(e) { e.stopPropagation() }` became the `.stop` modifier on
 * the inner click — calling stopPropagation on the synthetic uni event object
 * was an nvue workaround.
 */
const POPUP_STYLES = {
  top: 'top',
  bottom: 'bottom',
  center: 'center',
  message: 'top',
  dialog: 'center',
  share: 'bottom'
}

export default {
  name: 'UniPopup',
  components: { uniTransition },
  emits: ['change'],
  props: {
    animation: { type: Boolean, default: true },
    type: { type: String, default: 'center' },
    maskClick: { type: Boolean, default: true }
  },
  provide() {
    return { popup: this }
  },
  data() {
    return {
      duration: 300,
      ani: [],
      showPopup: false,
      showTrans: false,
      maskClass: {
        position: 'fixed',
        bottom: 0,
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
      },
      transClass: {
        position: 'fixed',
        left: 0,
        right: 0
      },
      maskShow: true,
      mkclick: true,
      popupstyle: 'top'
    }
  },
  watch: {
    type: {
      handler(value) {
        this[POPUP_STYLES[value] || 'center']()
      },
      immediate: true
    },
    maskClick(value) {
      this.mkclick = value
    }
  },
  created() {
    this.mkclick = this.maskClick
    this.duration = this.animation ? 300 : 0
  },
  unmounted() {
    clearTimeout(this.timer)
    clearTimeout(this.msgtimer)
  },
  methods: {
    noop() {},

    open() {
      this.showPopup = true
      this.$nextTick(() => {
        clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.showTrans = true
          this.$nextTick(() => {
            clearTimeout(this.msgtimer)
            this.msgtimer = setTimeout(() => {
              this.customOpen && this.customOpen()
            }, 100)
            this.$emit('change', { show: true, type: this.type })
          })
        }, 50)
      })
    },

    close() {
      this.showTrans = false
      this.$nextTick(() => {
        this.$emit('change', { show: false, type: this.type })
        clearTimeout(this.timer)
        this.customClose && this.customClose()
        this.timer = setTimeout(() => {
          this.showPopup = false
        }, 300)
      })
    },

    onTap() {
      if (!this.mkclick) return
      this.$nextTick(() => this.close())
    },

    top() {
      this.popupstyle = 'top'
      this.ani = ['slide-top']
      this.transClass = { position: 'fixed', left: 0, right: 0 }
    },

    bottom() {
      this.popupstyle = 'bottom'
      this.ani = ['slide-bottom']
      this.transClass = { position: 'fixed', left: 0, right: 0, bottom: 0 }
    },

    center() {
      this.popupstyle = 'center'
      this.ani = ['zoom-out', 'fade']
      this.transClass = {
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        justifyContent: 'center',
        alignItems: 'center'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.uni-popup {
  position: fixed;
  z-index: 99;
}

.top {
  /* #ifdef H5 */
  top: var(--window-top);
  /* #endif */
  /* #ifndef H5 */
  top: 0;
  /* #endif */
}

.bottom {
  bottom: 0;
}

.uni-popup__wrapper-box {
  display: block;
  position: relative;
  /* iPhone X and later: keep content clear of the home indicator. */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
