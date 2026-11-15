import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test as base } from '@playwright/test'

// WebKit refuses OPFS in a temporary profile, as Safari does in private browsing: it gets a normal one.
export const test = base.extend({
  context: async ({ context, playwright, browserName }, use, testInfo) => {
    if (browserName !== 'webkit') return use(context)
    const { defaultBrowserType: _, ...options } = testInfo.project.use as Record<string, unknown>
    const persistent = await playwright.webkit.launchPersistentContext(mkdtempSync(join(tmpdir(), 'trix-e2e-')), options)
    await use(persistent)
    await persistent.close()
  },
  page: async ({ context }, use) => use(context.pages()[0] ?? (await context.newPage())),
})

export { expect } from '@playwright/test'
