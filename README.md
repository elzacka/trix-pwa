# Trix PWA

An app shell for building your own productivity app. Four modules, each
tab one of them: shortcuts (`hurtigtaster`), lookup (`oppslag`), flip cards
(`kort`) and step-by-step guides (`steg`). Start from the templates and
themed packs in the app's library (`trix.tazk.no/#maler`), then change
anything: setup and content are plain Markdown files in a folder named
`trix-data`. Installs from the browser and works offline.

Live: https://trix.tazk.no/

## Where the files live

| Browser | Folder | Survives clearing browser data |
|---|---|---|
| All, from the first visit | `trix-data` in the browser's private storage (OPFS); a dot on the menu asks the user to decide | No: the menu makes and restores a zip backup |
| Chrome, Edge (desktop), Chrome on Android, once chosen | `trix-data` in a folder the user picks, Documents first; the files in OPFS are copied there where missing | Yes; only the access must be given again |

The app never sends the files anywhere.

## Files

- `Oppsett.md`: YAML at the top sets the name, tab order, colours, font and
  UI texts. The menu's «Tilpass appen» edits it as a form and writes back only
  the changed keys, comments kept. Format: the file's top comment
  ([src/templates/Oppsett.md](src/templates/Oppsett.md)).
- One `.md` per tab. YAML at the top names the module (`modul: oppslag`); a
  file without it is not a tab. Format: each template in
  [src/templates/](src/templates/).
- Template library («Malbibliotek», `#maler`, `#maler/<pack>`): one folder
  per pack in [src/templates/bibliotek/](src/templates/bibliotek/), with
  `pakke.yaml` naming the pack and each template's file, tab name and
  module. A new pack is a folder and a push; `tests/library.test.ts` checks
  every template.

## Develop

| Command | Does |
|---|---|
| `npm run dev` | Dev server at `localhost:5173` (no CSP, no service worker) |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Builds, then runs Playwright in Chromium, WebKit and WebKit on a phone (CI adds Firefox), with axe-core for WCAG 2.2 AA |
| `npm run build` | `svelte-check`, then the build in `dist/` |

Stack: Svelte 5, Vite 8, vite-plugin-pwa (Workbox), TypeScript 6. Version:
`package.json`.

Icons, as PNG with `rsvg-convert -w N -h N <svg> -o public/<name>.png`:

| Source | PNG | Used for |
|---|---|---|
| `public/icon.svg` | `icon-192`, `-256`, `-512` | Dock, start screen, start page |
| `public/favicon.svg` | `icon-16`, `-24`, `-32`, `-48` | Browser tab, floating window, taskbar, Start menu |
| `assets/icon-maskable.svg` | `icon-maskable` (512), `apple-touch-icon` (180) | Android, iOS |

## Deploy

A push to `main` runs [deploy.yml](.github/workflows/deploy.yml): audit,
unit tests, browser tests, build, then GitHub Pages at the custom domain
`trix.tazk.no` (repository setting; DNS at Domeneshop).

User guide (nb, linked from the app's menu): [BRUKERVEILEDNING.md](BRUKERVEILEDNING.md).
Privacy (nb): [PERSONVERN.md](PERSONVERN.md). Security:
[SECURITY.md](SECURITY.md). Credits (nb): [TREDJEPART.md](TREDJEPART.md).
