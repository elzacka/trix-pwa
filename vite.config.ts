/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// The app's own domain, trix.tazk.no, serves it from the root.
const base = process.env.TRIX_BASE ?? '/'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  'trusted-types svelte-trusted-html trix-sw',
].join('; ')

/** The policy as a meta tag, in the build only: the dev server injects styles inline. */
function csp(): Plugin {
  return {
    name: 'trix-csp',
    apply: 'build',
    transformIndexHtml: html =>
      html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`),
  }
}

export default defineConfig({
  base,
  define: { __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0') },
  build: { target: 'es2024', cssCodeSplit: false },
  test: { include: ['tests/**/*.test.ts'] },
  plugins: [
    svelte(),
    csp(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Trix',
        short_name: 'Trix',
        description: 'Hurtigtaster, oppslag, kort og veiledninger i dine egne Markdown-filer',
        lang: 'nb',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        categories: ['productivity', 'utilities'],
        icons: [
          // Exact PNG sizes, so small surfaces get the small icon rather than the large tile scaled down.
          ...[16, 24, 32, 48].map(n => ({ src: `icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any' })),
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
