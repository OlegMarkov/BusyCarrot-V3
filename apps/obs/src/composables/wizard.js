/**
 * The step wizard is driven by UIkit's tab/switcher components, which are
 * imperative: `UIkit.tab('#steps').show(n)` moves both the tab strip and the
 * connected `.uk-switcher` panes.
 *
 * Every step component in vegetable.web reached for the `UIkit` global directly.
 * That global comes from a CDN script tag, and the Razor layout that hosted the
 * app never included it — so each of those calls threw. Routing them through
 * here means one place to check for it, and one place to change if the wizard
 * ever stops being UIkit's.
 */
export function useWizard() {
  const tabs = () => (typeof window !== 'undefined' ? window.UIkit : undefined)

  function showStep(index) {
    const UIkit = tabs()
    if (!UIkit) {
      console.warn('[obs] UIkit is not loaded; cannot advance the booking wizard.')
      return
    }
    UIkit.tab('#steps').show(index)
  }

  function notify(message, status = 'success') {
    const UIkit = tabs()
    if (!UIkit) return
    UIkit.notification({
      message: `<span uk-icon='icon: check'></span> ${message}`,
      status,
      timeout: 3000
    })
  }

  function showModal(selector) {
    const UIkit = tabs()
    if (!UIkit) return
    UIkit.modal(selector).show()
  }

  function hideModal(selector) {
    const UIkit = tabs()
    if (!UIkit) return
    UIkit.modal(selector).hide()
  }

  function showOffcanvas(selector) {
    const UIkit = tabs()
    if (!UIkit) return
    UIkit.offcanvas(selector).show()
  }

  return { showStep, notify, showModal, hideModal, showOffcanvas }
}
