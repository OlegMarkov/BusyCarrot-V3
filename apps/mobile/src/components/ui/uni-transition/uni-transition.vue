<template>
  <view
    v-if="isShow"
    ref="ani"
    class="uni-transition"
    :class="[ani.in]"
    :style="'transform:' + transform + ';' + stylesObject"
    @click="$emit('click', { detail: isShow })"
  >
    <slot />
  </view>
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/uni-transition/uni-transition.vue.
 * The APP-NVUE branch, which drove the animation through
 * `uni.requireNativePlugin('animation')`, is gone — the CSS-transition branch
 * that the webview renderer already used is the only path now.
 *
 * Only consumed by uni-popup.
 */
export default {
  name: 'UniTransition',
  emits: ['click', 'change'],
  props: {
    show: { type: Boolean, default: false },
    modeClass: {
      type: Array,
      default() {
        return []
      }
    },
    duration: { type: Number, default: 300 },
    styles: {
      type: Object,
      default() {
        return {}
      }
    }
  },
  data() {
    return {
      isShow: false,
      transform: '',
      ani: { in: '', active: '' }
    }
  },
  watch: {
    show: {
      handler(value) {
        if (value) this.open()
        else this.close()
      },
      immediate: true
    }
  },
  computed: {
    stylesObject() {
      const styles = {
        ...this.styles,
        'transition-duration': this.duration / 1000 + 's'
      }
      return Object.keys(styles)
        .map((key) => `${this.toLine(key)}:${styles[key]};`)
        .join('')
    }
  },
  unmounted() {
    clearTimeout(this.timer)
  },
  methods: {
    open() {
      clearTimeout(this.timer)
      this.isShow = true
      this.transform = ''
      this.ani.in = ''

      const styles = this.getTransform(false)
      Object.keys(styles).forEach((key) => {
        if (key === 'opacity') this.ani.in = 'fade-in'
        else this.transform += `${styles[key]} `
      })

      this.$nextTick(() => {
        setTimeout(() => this.animate(true), 50)
      })
    },

    close() {
      clearTimeout(this.timer)
      this.animate(false)
    },

    animate(entering) {
      const styles = this.getTransform(entering)
      this.transform = ''

      Object.keys(styles).forEach((key) => {
        if (key === 'opacity') this.ani.in = `fade-${entering ? 'out' : 'in'}`
        else this.transform += `${styles[key]} `
      })

      this.timer = setTimeout(() => {
        if (!entering) this.isShow = false
        this.$emit('change', { detail: this.isShow })
      }, this.duration)
    },

    getTransform(entering) {
      const styles = { transform: '' }
      this.modeClass.forEach((mode) => {
        switch (mode) {
          case 'fade':
            styles.opacity = entering ? 1 : 0
            break
          case 'slide-top':
            styles.transform += `translateY(${entering ? '0' : '-100%'}) `
            break
          case 'slide-right':
            styles.transform += `translateX(${entering ? '0' : '100%'}) `
            break
          case 'slide-bottom':
            styles.transform += `translateY(${entering ? '0' : '100%'}) `
            break
          case 'slide-left':
            styles.transform += `translateX(${entering ? '0' : '-100%'}) `
            break
          case 'zoom-in':
            styles.transform += `scale(${entering ? 1 : 0.8}) `
            break
          case 'zoom-out':
            styles.transform += `scale(${entering ? 1 : 1.2}) `
            break
        }
      })
      return styles
    },

    toLine(name) {
      return name.replace(/([A-Z])/g, '-$1').toLowerCase()
    }
  }
}
</script>

<style>
.uni-transition {
  transition-timing-function: ease;
  transition-duration: 0.3s;
  transition-property: transform, opacity;
}

.fade-in {
  opacity: 0;
}

.fade-active {
  opacity: 1;
}
</style>
