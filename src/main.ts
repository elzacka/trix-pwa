import { mount } from 'svelte'
import App from './App.svelte'
import Away from './components/Away.svelte'
import { app } from './lib/app.svelte'
import { registerServiceWorker } from './lib/pwa'
import './app.css'

// Never inside another site's frame: the CSP in a meta tag cannot forbid framing.
if (window.top === window.self) {
  mount(App, { target: document.getElementById('app')! })
  mount(Away, { target: document.getElementById('away')! })
  app.start()
  registerServiceWorker(apply => (app.update = apply))
}
