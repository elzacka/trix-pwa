import { mount } from 'svelte'
import App from './App.svelte'
import { app } from './lib/app.svelte'
import { registerServiceWorker } from './lib/pwa'
import './app.css'

// Never inside another site's frame: the CSP in a meta tag cannot forbid framing.
if (window.top === window.self) {
  mount(App, { target: document.getElementById('app')! })
  app.start()
  registerServiceWorker(apply => (app.update = apply))
}
