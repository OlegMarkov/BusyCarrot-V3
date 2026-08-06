<template>
  <text
    v-if="text"
    class="uni-badge"
    :class="
      inverted
        ? `uni-badge--${type} uni-badge--${size} uni-badge--${type}-inverted`
        : `uni-badge--${type} uni-badge--${size}`
    "
    :style="badgeStyle"
    @click="$emit('click')"
    >{{ text }}</text
  >
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/uni-badge/uni-badge.vue.
 * The width-from-text-length calculation was a `data` field kept in sync by a
 * watcher plus a `mounted` hook; it is a computed here, which is the same thing
 * without the synchronisation.
 */
export default {
  name: 'UniBadge',
  emits: ['click'],
  props: {
    type: {
      type: String,
      default: 'default'
    },
    inverted: {
      type: Boolean,
      default: false
    },
    text: {
      type: [String, Number],
      default: ''
    },
    size: {
      type: String,
      default: 'normal'
    }
  },
  computed: {
    badgeStyle() {
      return `width: ${String(this.text).length * 8 + 12}px`
    }
  }
}
</script>

<style lang="scss" scoped>
$badge-size: 12px;
$badge-small: scale(0.8);
$badge-height: 20px;

.uni-badge {
  display: flex;
  justify-content: center;
  flex-direction: row;
  height: $badge-height;
  line-height: $badge-height;
  color: $uni-text-color;
  border-radius: 100px;
  background-color: transparent;
  text-align: center;
  font-size: $badge-size;
  padding: 0px 6px;
}

.uni-badge--inverted {
  padding: 0 5px 0 0;
  color: $uni-bg-color-hover;
}

.uni-badge--default {
  color: $uni-text-color;
  background-color: $uni-bg-color-hover;
}

.uni-badge--default-inverted {
  color: $uni-text-color-grey;
  background-color: transparent;
}

.uni-badge--primary {
  color: $uni-text-color-inverse;
  background-color: $uni-color-primary;
}

.uni-badge--primary-inverted {
  color: $uni-color-primary;
  background-color: transparent;
}

.uni-badge--success {
  color: $uni-text-color-inverse;
  background-color: $uni-color-success;
}

.uni-badge--success-inverted {
  color: $uni-color-success;
  background-color: transparent;
}

.uni-badge--warning {
  color: $uni-text-color-inverse;
  background-color: $uni-color-warning;
}

.uni-badge--warning-inverted {
  color: $uni-color-warning;
  background-color: transparent;
}

.uni-badge--error {
  color: $uni-text-color-inverse;
  background-color: $uni-color-error;
}

.uni-badge--error-inverted {
  color: $uni-color-error;
  background-color: transparent;
}

.uni-badge--small {
  transform: $badge-small;
  transform-origin: center center;
}
</style>
