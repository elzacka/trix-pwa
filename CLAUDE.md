# Trix PWA

Svelte 5 PWA port of Trix (`~/dev/trix`): the same purpose, built anew for the web. Overview and commands: `README.md`.

- Verify: `npm test`, `npm run build` (`svelte-check --fail-on-warnings` first), `npm run e2e` for anything users see. CI runs the same.
- Shows only after a build: `src/templates/` (reaches only a folder that lacks the file).
- Files are the user's: `Folder.write` writes only while the file still holds the text it was read with (`null`: must not exist). Seed files are written only when missing.
- One storage path: the picked folder and OPFS are both a `FileSystemDirectoryHandle` (`storage.ts`). WebKit refuses OPFS in private browsing and in a temporary Playwright profile; e2e uses a persistent profile per test and empties OPFS first.
- Content is rendered from the mdast tree as elements (`Md.svelte`), never as HTML. Links: `https?:` to the browser, `Fil.md#sted` and `#sted` inside the app, anything else as text.
- CSP is a meta tag added at build (`vite.config.ts`), with Trusted Types: `svelte-trusted-html` (Svelte) and `trix-sw` (service worker URL only). A new policy name or an inline script or style breaks the build in the browser; e2e fails on any CSP violation.
- Colours and font from `Oppsett.md` go on `:root` through CSSOM (`theme.ts`), only values `CSS.supports` accepts.
- The origin must not change once users exist: their data and folder access belong to it. Base path from `TRIX_BASE` (default `/trix-pwa/`).
- UI text: Norwegian Bokmål, defaults in `texts.ts`, overridable under `tekster` in `Oppsett.md`. CHANGELOG: `dev_only/CHANGELOG.md`, private.
