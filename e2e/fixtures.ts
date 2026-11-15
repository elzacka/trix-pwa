import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test as base } from '@playwright/test'

// WebKit and Firefox refuse OPFS in a temporary profile, as in private browsing: they get a normal one.
export const test = base.extend({
  context: async ({ context, playwright, browserName }, use, testInfo) => {
    if (browserName === 'chromium') return use(context)
    const { defaultBrowserType: _, ...options } = testInfo.project.use as Record<string, unknown>
    const persistent = await playwright[browserName].launchPersistentContext(mkdtempSync(join(tmpdir(), 'trix-e2e-')), options)
    await use(persistent)
    await persistent.close()
  },
  page: async ({ context }, use) => use(context.pages()[0] ?? (await context.newPage())),
})

export { expect } from '@playwright/test'
