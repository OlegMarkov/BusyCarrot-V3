import { defineStore } from 'pinia'
import moment from 'moment'
import { generateUUID } from '@/plugins/helpers'

/**
 * Ported from the root state/mutations/getters of
 * vegetable.mobile.vue/store/index.js.
 *
 * In Vuex these lived at the root and every module could `commit` them because
 * modules were not namespaced. Pinia has no shared namespace, so the other
 * stores import this one explicitly — see the `app` accessor at the top of each.
 */
export const useAppStore = defineStore('app', {
  state: () => ({
    apiCallsCount: 0,
    isBusy: false,
    errors: [],
    tabIndex: -1,
    today: moment(),
    activeDay: moment().local().format('YYYY-MM-DD'),
    ready: false,
    apiCallsAll: false,
    sessionKey: generateUUID()
  }),

  actions: {
    /** Was SET_API_CALLS_COUNT — a +1/-1 in-flight counter driving the spinner. */
    setApiCallsCount(count) {
      this.apiCallsCount += count
      this.isBusy = this.apiCallsCount !== 0
    },

    /** Was FETCH_ALL_OWNER_DATA_CALL — the "loading everything" flag. */
    setApiCallsAll(call) {
      this.apiCallsAll = call
    },

    setTabIndex(index) {
      this.tabIndex = index
    },

    raiseError(error) {
      this.errors.push(error)
    },

    dismissError(error) {
      const index = this.errors.indexOf(error)
      if (index !== -1) this.errors.splice(index, 1)
    },

    setToday() {
      this.today = moment()
    },

    setActiveDay(date) {
      this.activeDay = date
    },

    reset() {
      this.apiCallsCount = 0
      this.isBusy = false
      this.errors = []
      this.tabIndex = -1
      this.today = moment()
      this.ready = false
    }
  }
})

/**
 * The original wrapped nearly every API call in
 *   commit(SET_API_CALLS_COUNT, 1) … catch → RAISE_ERROR … finally → -1
 * This is that shape, so the stores below stay close to their originals.
 * Returns undefined when the call failed, exactly as the original did (its
 * catch blocks swallowed the error after recording it).
 */
export async function tracked(fn) {
  const app = useAppStore()
  app.setApiCallsCount(1)
  try {
    return await fn()
  } catch (error) {
    app.raiseError(error)
    return undefined
  } finally {
    app.setApiCallsCount(-1)
  }
}
