import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

// Chromium gets the browser's private folder from the picker, so the folder path runs without a dialog.
async function start(page: Page) {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`))
    if ('showDirectoryPicker' in window) {
      Object.assign(window, { showDirectoryPicker: async () => navigator.storage.getDirectory() })
    }
  })
  // WebKit shares OPFS between profiles: start from an empty folder.
  await page.goto('manifest.webmanifest')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) await root.removeEntry(name, { recursive: true })
    await new Promise(done => Object.assign(indexedDB.deleteDatabase('trix'), { onsuccess: done, onerror: done, onblocked: done }))
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Velg mappe|Fortsett/ }).click()
  await expect(page.getByRole('tab', { name: 'Oppslag' })).toBeVisible()
  return errors
}

test('first start makes one tab per module, and they survive a reload', async ({ page }) => {
  const errors = await start(page)
  await expect(page.getByRole('tab')).toHaveText(['Hurtigtaster', 'Oppslag', 'Kort', 'Steg'])
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Steg' })).toBeVisible()
  expect(errors).toEqual([])
})

test('search, open an entry, tags', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Oppslag' }).click()
  await page.getByRole('searchbox').fill('begr')
  await page.getByRole('button', { name: /Oppslag/ }).click()
  await expect(page.getByText('Også: Begrep')).toBeVisible()
  await page.getByRole('button', { name: '#eksempel' }).click()
  await expect(page.getByRole('button', { name: 'Fjern #eksempel' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a link to another tab, and back', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Steg' }).click()
  await page.getByRole('button', { name: /Slik lager du en veiledning/ }).click()
  await page.getByRole('link', { name: 'Oppslag' }).click()
  await expect(page.getByRole('tab', { name: 'Oppslag' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Også: Begrep')).toBeVisible()
  await page.getByRole('button', { name: 'Tilbake til Oppslag' }).click()
  await expect(page.getByRole('heading', { name: 'Slik lager du en veiledning' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a card turns', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Kort' }).click()
  await page.getByRole('button', { name: /Snu kortet: Kort/ }).click()
  await expect(page.getByText('Baksiden har resten.')).toBeVisible()
  expect(errors).toEqual([])
})

test('edit and save a file, then add a tab', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Hurtigtaster' }).click()
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Endre innhold i Hurtigtaster' }).click()
  const editor = page.getByRole('textbox')
  await editor.fill((await editor.inputValue()).replace('- Søk | ctrl F | ⌘F', '- Finn noe | ctrl F | ⌘F'))
  await page.getByRole('button', { name: 'Lagre' }).click()
  await expect(page.getByText('Finn noe')).toBeVisible()

  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Legg til fane' }).click()
  await page.getByLabel('Navn').fill('Telefonliste')
  await page.getByRole('dialog').getByRole('button', { name: 'Legg til fane' }).click()
  await expect(page.getByRole('tab', { name: 'Telefonliste' })).toHaveAttribute('aria-selected', 'true')
  expect(errors).toEqual([])
})

test('no WCAG 2.2 AA violations on any tab, an open entry or the editor', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright')
  const check = async (where: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(violations.map(v => `${where}: ${v.id} ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([])
  }
  await start(page)
  for (const name of ['Hurtigtaster', 'Oppslag', 'Kort', 'Steg']) {
    await page.getByRole('tab', { name }).click()
    await check(name)
  }
  await page.emulateMedia({ colorScheme: 'dark' })
  for (const name of ['Hurtigtaster', 'Kort']) {
    await page.getByRole('tab', { name }).click()
    await check(`${name}, mørk`)
  }
  await page.getByRole('button', { name: /Snu kortet/ }).click()
  await check('bakside, mørk')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.getByRole('tab', { name: 'Oppslag' }).click()
  await page.getByRole('button', { name: /Oppslag/ }).click()
  await check('åpent oppslag')
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await check('meny')
  await page.getByRole('button', { name: 'Endre innhold i Oppslag' }).click()
  await check('editor')
})
