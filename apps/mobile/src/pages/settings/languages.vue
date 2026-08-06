<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="pageTitle"
      @clickLeft="navigateBack()"
    />
    <items>
      <items-item
        v-for="lang in languages"
        :key="lang"
        :title="$t('general-settings.language-' + lang)"
        :selected="lang === language"
        @click="navigateBack(lang)"
      />
    </items>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import items from '@/components/app/items.vue'
import itemsItem from '@/components/app/items-item.vue'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

/**
 * Ported from vegetable.mobile.vue/pages/settings/languages.nvue.
 *
 * Picking a language persists it, switches vue-i18n and relabels the native tab
 * bar (settings store `upsertLanguage`), then writes the choice back to the user
 * record — the same three effects as the original.
 *
 * The original keyed the v-for by index; the language code is stable, so it is
 * the key here. The `userDb` guard is new: the original assigned
 * `this.userDb.language` unconditionally, which threw when the user record had
 * not loaded yet (userDb starts as an empty string).
 */
export default {
  components: { uniNavBar, items, itemsItem },
  computed: {
    ...mapState(useSettingsStore, ['languages', 'language']),
    pageTitle() {
      return this.$t('general-settings.language')
    }
  },
  methods: {
    navigateBack(language) {
      if (language) {
        useSettingsStore().upsertLanguage(language)

        const user = useUserStore()
        if (user.userDb) {
          user.userDb.language = language
          user.updateUser(user.userDb)
        }
      }
      uni.navigateBack()
    }
  }
}
</script>
