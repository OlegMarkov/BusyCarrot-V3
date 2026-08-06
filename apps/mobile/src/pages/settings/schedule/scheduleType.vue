<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.schedule-type-title')"
      @clickLeft="navigateBack(selectedType)"
    />
    <items>
      <items-item
        v-for="option in typeOptions"
        :key="option.type"
        :title="option.title"
        :note="option.description"
        :selected="Number(selectedType) === option.type"
        @click="navigateBack(option.type)"
      />
    </items>
  </view>
</template>

<script>
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import items from '@/components/app/items.vue'
import itemsItem from '@/components/app/items-item.vue'
import { SCHEDULE_TYPES } from '@/constants/schedule-types'

/**
 * Ported from vegetable.mobile.vue/pages/settings/schedule/scheduleType.nvue.
 * Picks weekly / rotating / custom and reports back over `uni.$emit`.
 *
 * Changes: the three hand-written rows and their six title/description computeds
 * become one `v-for` over `typeOptions`; `selected` coerces before comparing,
 * since `option.type` arrives from the query string as a string (the original's
 * `==` was doing that implicitly); a stray `console.log` in `onLoad` is gone.
 */
export default {
  components: { uniNavBar, items, itemsItem },
  data() {
    return {
      selectedType: ''
    }
  },
  computed: {
    typeOptions() {
      const generalSuffix = this.$t('general-settings.schedule-type-suffix-general')
      return [
        {
          type: SCHEDULE_TYPES.Week,
          title: this.$t('general-settings.schedule-type-0') + generalSuffix,
          description: this.$t('general-settings.schedule-week-description')
        },
        {
          type: SCHEDULE_TYPES.Switch,
          title: this.$t('general-settings.schedule-type-1') + generalSuffix,
          description: this.$t('general-settings.schedule-switch-description')
        },
        {
          type: SCHEDULE_TYPES.Custom,
          title:
            this.$t('general-settings.schedule-type-2') +
            this.$t('general-settings.schedule-type-suffix-additional'),
          description: this.$t('general-settings.schedule-custom-description')
        }
      ]
    }
  },
  onLoad(option) {
    this.selectedType = option.type
  },
  methods: {
    navigateBack(type) {
      uni.$emit('update:scheduleType', { selectedType: type })
      uni.navigateBack()
    }
  }
}
</script>
