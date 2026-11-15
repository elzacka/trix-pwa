// The service worker, registered through a Trusted Types policy that allows only its own URL.

type Policy = { createScriptURL(url: string): unknown }
type Factory = { createPolicy(name: string, rules: { createScriptURL(url: string): string }): Policy }

export async function registerServiceWorker(onUpdate: (apply: () => void) => void) {
  if (import.meta.env.DEV || !navigator.serviceWorker) return
  const url = `${import.meta.env.BASE_URL}sw.js`
  const factory = (window as unknown as { trustedTypes?: Factory }).trustedTypes
  const policy = factory?.createPolicy('trix-sw', {
    createScriptURL: given => {
      if (given !== url) throw new TypeError(`Not the service worker: ${given}`)
      return given
    },
  })
  const registration = await navigator.serviceWorker.register((policy?.createScriptURL(url) ?? url) as string, { scope: import.meta.env.BASE_URL })
  if (!registration) return
  const offer = () => {
    const waiting = registration.waiting
    if (waiting && navigator.serviceWorker.controller) onUpdate(() => waiting.postMessage({ type: 'SKIP_WAITING' }))
  }
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    worker?.addEventListener('statechange', () => worker.state === 'installed' && offer())
  })
  offer()
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {
      reloading = true
      location.reload()
    }
  })
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && registration.update().catch(() => {}))
}
