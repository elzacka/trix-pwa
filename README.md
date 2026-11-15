# Trix PWA

The web version of [Trix](https://github.com/elzacka/trix): an app shell for
quick reference. Four modules, each shown as a tab: shortcuts
(`hurtigtaster`), lookup (`oppslag`), flip cards (`kort`) and step-by-step
guides (`steg`). Setup and content are plain Markdown files in a folder
named `trix-data`.

Live: https://elzacka.github.io/trix-pwa/

## Where the files live

| Browser | Folder | Survives clearing browser data |
|---|---|---|
| Chrome, Edge (desktop), Chrome on Android | `trix-data` in a folder the user picks, Documents first | Yes; only the access must be given again |
| Safari (macOS, iOS), Firefox | `trix-data` in the browser's private storage (OPFS) | No: the menu makes and restores a zip backup |

The app never sends the files anywhere.

## Files

- `Oppsett.md`: YAML at the top sets the name, tab order, colours, font and
  UI texts. Format: the file's top comment ([src/templates/Oppsett.md](src/templates/Oppsett.md)).
- One `.md` per tab. YAML at the top names the module (`modul: oppslag`); a
  file without it is not a tab. Format: each template in
  [src/templates/](src/templates/).

## Develop

| Command | Does |
|---|---|
| `npm run dev` | Dev server at `localhost:5173/trix-pwa/` (no CSP, no service worker) |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Builds, then runs Playwright in Chromium, WebKit and WebKit on a phone (CI adds Firefox), with axe-core for WCAG 2.2 AA |
| `npm run build` | `svelte-check`, then the build in `dist/` |

Stack: Svelte 5, Vite 8, vite-plugin-pwa (Workbox), TypeScript 6. Version:
`package.json`.

## Deploy

A push to `main` runs [deploy.yml](.github/workflows/deploy.yml): audit,
unit tests, browser tests, build, then GitHub Pages. The base path is
`/trix-pwa/`; `TRIX_BASE=/` builds for a domain of its own.

Privacy (nb): [PERSONVERN.md](PERSONVERN.md). Security:
[SECURITY.md](SECURITY.md). Credits (nb): [TREDJEPART.md](TREDJEPART.md).
