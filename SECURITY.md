# Security

Report a vulnerability: hei@tazk.no.

| Scope | Standard |
|---|---|
| App | [OWASP ASVS](https://github.com/OWASP/ASVS) 5.0.0 Level 1 (no personal data leaves the device) |
| Tests | [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) 4.2 |
| Risks | [OWASP Top 10:2025](https://owasp.org/Top10/2025/) |
| Build and deploy | [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) |

## Threat model

A static app on GitHub Pages at `trix.tazk.no`: no server code, no accounts, no network calls of its own.

| Entry point | Threat | Mitigation |
|---|---|---|
| Content and setup files (may come from someone else) | Script in the content | Rendered from the Markdown tree as elements, never as HTML; CSP `'self'` without `'unsafe-inline'`; Trusted Types required, policies `svelte-trusted-html` and `trix-sw` only |
| Links in the content | Script URL, page in the app | `https?://` opens a new browsing context with `noopener noreferrer`; `Fil.md#sted` matched against the tabs, never read as a path; anything else is text |
| Colours and font in `Oppsett.md` | CSS injection | CSSOM `setProperty`, only values `CSS.supports` accepts as a colour; font names letters, digits, space, `-`, `_` |
| File names | Path out of the folder | Plain names with `.md` only (`isFileName`), checked before every read and write |
| Backup zip | Zip bomb, other file types | `.md` with a plain name only; 500 files and 20 MB in all |
| Imported files (Word, Excel, RTF, CSV) | Zip bomb, XML entities, freeze, memory | Name and size checked before reading (documents 10 MB, text 2 MB); unzip budget shared by all parts, 1000 entries; own XML reader without entities or DTDs, 500 000 nodes; RTF 500 000 pieces; heading levels 1–9; output 2 MB; result shown in the editor, written only on «Lagre» while the file still holds the text it was built from |
| Crafted Markdown | Freeze (quadratic parsing), stack overflow | Files over 2 MB neither shown nor written; text parsed only when paragraphs stay under 5000 characters, table rows and list items under 2000, 200 000 in all, titles under 300, else shown as plain text; nesting past 32 levels and parser stack overflow shown as text; bounded link pattern |
| Another site framing the app | Clickjacking | The app does not start inside a frame (`main.ts`); `frame-ancestors` is not available in a meta CSP |
| Other apps of the same owner | Read OPFS and the folder handle | Own origin `trix.tazk.no`, no other app on it |
| Dependencies | Supply chain | Exact versions, `npm audit --audit-level=high` in CI, Dependabot alerts, security updates and weekly version updates after 7 days' cooldown; fix high and critical within 7 days, moderate within 30. Accepted: low and moderate advisories in build-time tools (workbox-build, vite-plugin-svelte), whose inputs are this repository's files |
| Workflow | Token misuse | Actions pinned to commit SHAs, required by the repository with GitHub's own actions only; CodeQL default setup; `contents: read`, Pages write only in the deploy job |
