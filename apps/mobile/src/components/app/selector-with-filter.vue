<template>
  <view class="nv" :style="expandTransformObj">
    <search-input @input="onSearchInput" />

    <scroll-view scroll-y class="selector-scroll" @scrolltolower="increasePage">
      <uni-list>
        <uni-section v-if="addNewLabel">
          <uni-badge class="uni-badge-left-margin" :text="addNewLabel" @click="select('')" />
        </uni-section>

        <uni-list-item
          v-for="item in loadedObjects"
          :key="item.id"
          :title="rowTitle(item)"
          :note="rowNote(item)"
          @click="select(item)"
        />
      </uni-list>
    </scroll-view>
  </view>
</template>

<script>
import searchInput from '@/components/app/search-input.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniListItem from '@/components/ui/uni-list-item/uni-list-item.vue'
import uniSection from '@/components/ui/uni-section/uni-section.vue'
import uniBadge from '@/components/ui/uni-badge/uni-badge.vue'

const PAGE_SIZE = 25

/** Reads a possibly dotted path off an object — replaces underscore's `_.property`. */
function readField(object, path) {
  return String(path)
    .split('.')
    .reduce((value, key) => (value == null ? undefined : value[key]), object)
}

/**
 * Ported from vegetable.mobile.vue/components/app/selector-with-filter.nvue.
 *
 * The searchable picker that reservation/edit opens to choose a customer or a
 * service, with an "add new" badge at the top that emits an empty selection.
 *
 * Changes:
 *  - `calculateHeight` was declared as a **prop** and then assigned to in
 *    `mounted` and in the keyboard callback. Mutating a prop is a hard warning
 *    in Vue 3 and the parent never passed one anyway, so it is local state now,
 *    seeded from the `height` prop.
 *  - `uni-list`, `uni-list-item`, `uni-section` and `uni-badge` were imported
 *    but never registered; they only resolved because easycom picks up
 *    `uni-`-prefixed tags. They are registered explicitly here.
 *  - `<uni-list @scrolltolower>` never fired on the webview renderer (it was an
 *    nvue-only binding), so paging did nothing; a real `<scroll-view>` now
 *    provides it.
 *  - `_.property` → `readField`; `this.t(...)` in the template → `$t`
 *  - the two near-identical `uni-section` blocks differing only by `type` are
 *    one block driven by `addNewLabel`
 */
export default {
  name: 'SelectorWithFilter',
  components: { searchInput, uniList, uniListItem, uniSection, uniBadge },
  emits: ['onSelect'],
  props: {
    listOfObjects: { type: Array, default: () => [] },
    rowTitleDisplayFields: { type: Array, default: () => [] },
    rowNoteDisplayFields: { type: Array, default: () => [] },
    filterFields: { type: Array, default: () => [] },
    height: { type: Number, default: 300 },
    type: { type: String, default: '' },
    excludeField: { type: String, default: '' },
    excludeValues: { type: Array, default: () => [] }
  },
  data() {
    return {
      searchText: '',
      page: 1,
      calculateHeight: this.height
    }
  },
  computed: {
    addNewLabel() {
      if (this.type === 'customers') return this.$t('customer.add-new').toUpperCase()
      if (this.type === 'services') return this.$t('service.add-new').toUpperCase()
      return ''
    },

    /** Hides entries already chosen — e.g. services already on the reservation. */
    excludedList() {
      if (this.excludeField === '' || this.excludeValues.length === 0) return this.listOfObjects
      return this.listOfObjects.filter(
        (item) => !this.excludeValues.includes(readField(item, this.excludeField))
      )
    },

    filteredListOfObjects() {
      if (this.searchText === '') return this.excludedList
      const term = this.searchText.toLowerCase()
      return this.excludedList.filter((item) =>
        this.filterFields.some((field) => {
          const value = readField(item, field)
          return value && String(value).toLowerCase().includes(term)
        })
      )
    },

    loadedObjects() {
      return this.filteredListOfObjects.slice(0, this.page * PAGE_SIZE)
    },

    expandTransformObj() {
      return {
        transitionProperty: 'height',
        height: `${this.calculateHeight}px`,
        transitionDuration: '100ms'
      }
    }
  },
  mounted() {
    this.calculateHeight = this.height
    // Grow to stay above the on-screen keyboard while the search field is focused.
    this.keyboardCallback = (res) => {
      this.calculateHeight = this.height + res.height
    }
    uni.onKeyboardHeightChange(this.keyboardCallback)
  },
  unmounted() {
    uni.offKeyboardHeightChange?.(this.keyboardCallback)
  },
  methods: {
    select(item) {
      this.$emit('onSelect', item)
    },

    onSearchInput(text) {
      this.searchText = text
      this.page = 1
    },

    increasePage() {
      if (this.loadedObjects.length < this.filteredListOfObjects.length) this.page += 1
    },

    rowTitle(item) {
      return this.rowTitleDisplayFields
        .map((field) => readField(item, field))
        .filter(Boolean)
        .join(' ')
    },

    rowNote(item) {
      return this.rowNoteDisplayFields
        .map((field) => readField(item, field))
        .filter(Boolean)
        .join(', ')
    }
  }
}
</script>

<style scoped>
.selector-scroll {
  flex: 1;
}
</style>
