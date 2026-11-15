// The app in a window that stays above other windows (Document Picture-in-Picture), as Trix's panel does.

type Pip = { requestWindow(options: { width: number; height: number }): Promise<Window> }

const api = (globalThis as { documentPictureInPicture?: Pip }).documentPictureInPicture

export const canFloat = !!api

export const pip = $state<{ window: Window | null }>({ window: null })

/** The document the app is shown in. */
export const doc = () => pip.window?.document ?? document

/** Copies the theme set on the main document's root. CSSOM, so the CSP allows it. */
export function copyTheme() {
  const target = pip.window?.document
  if (!target) return
  target.documentElement.style.cssText = document.documentElement.style.cssText
  target.title = document.title
}

/** Focus back where it was if that is still shown, else on the menu button. */
function refocus(root: HTMLElement, was: Element | null) {
  const place = was instanceof HTMLElement && was !== root && root.contains(was) && was.checkVisibility() ? was : root.querySelector<HTMLElement>('.more')
  place?.focus()
}

/** Moves the app's root into a new floating window; it moves back when that window closes. */
export async function float(root: HTMLElement) {
  if (!api || pip.window) return
  const win = await api.requestWindow({ width: 420, height: 640 })
  const target = win.document
  target.documentElement.lang = document.documentElement.lang
  // Constructed sheets, not copied <style> or <link> elements: same rules, nothing the CSP has to allow.
  target.adoptedStyleSheets = [...document.styleSheets].map(sheet => {
    const copy = new (win as unknown as typeof globalThis).CSSStyleSheet({ baseURL: sheet.href ?? location.href })
    copy.replaceSync([...sheet.cssRules].map(rule => rule.cssText).join('\n'))
    return copy
  })
  const home = root.nextSibling
  win.addEventListener('pagehide', () => {
    const was = target.activeElement
    // A dialog or menu would lose its top layer in the move and stay open without it.
    root.querySelectorAll('dialog[open]').forEach(dialog => (dialog as HTMLDialogElement).close())
    root.querySelectorAll(':popover-open').forEach(popover => (popover as HTMLElement).hidePopover())
    document.body.insertBefore(root, home)
    pip.window = null
    refocus(root, was)
  }, { once: true })
  const was = document.activeElement
  target.body.append(root)
  pip.window = win
  copyTheme()
  refocus(root, was)
}
