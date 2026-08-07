/**
 * The step wizard is driven by UIkit's tab/switcher components, which are
 * imperative: `UIkit.tab('#steps').show(n)` moves both the tab strip and the
 * connected `.uk-switcher` panes.
 *
 * Every step component in vegetable.web reached for the `UIkit` global directly.
 * That global comes from a script tag, and the Razor layout that hosted the app
 * never included it — so each of those calls threw. Routing them through here
 * means one place to check for it, and one place to change if the wizard ever
 * stops being UIkit's.
 *
 * The global is now served from this site rather than a CDN — see index.html
 * and tools/vendor-uikit.mjs. It is deliberately not an ES import: imported
 * through Vite, UIkit's automatic boot does not run, so the `uk-icon` elements
 * and the declarative switcher in the templates stay inert. The guards below
 * stay for the same reason they always applied — a script tag can fail to load
 * in a way an import cannot.
 */
export function useWizard() {
  const uikit = () => (typeof window !== 'undefined' ? window.UIkit : undefined)

  function showStep(index) {
    const UIkit = uikit()
    if (!UIkit) {
      console.warn('[obs] UIkit is not loaded; cannot advance the booking wizard.')
      return
    }
    UIkit.tab('#steps').show(index)
  }

  function notify(message, status = 'success') {
    const UIkit = uikit()
    if (!UIkit) return
    UIkit.notification({
      message: `<span uk-icon='icon: check'></span> ${message}`,
      status,
      timeout: 3000
    })
  }

  function showModal(selector) {
    const UIkit = uikit()
    if (!UIkit) return
    UIkit.modal(selector).show()
  }

  function hideModal(selector) {
    const UIkit = uikit()
    if (!UIkit) return
    UIkit.modal(selector).hide()
  }

  function showOffcanvas(selector) {
    const UIkit = uikit()
    if (!UIkit) return
    UIkit.offcanvas(selector).show()
  }

  return { showStep, notify, showModal, hideModal, showOffcanvas }
}
