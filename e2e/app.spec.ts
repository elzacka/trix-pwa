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
  await page.goto('icon.svg')
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    for await (const name of (root as unknown as { keys(): AsyncIterable<string> }).keys()) await root.removeEntry(name, { recursive: true })
    await new Promise(done => Object.assign(indexedDB.deleteDatabase('trix'), { onsuccess: done, onerror: done, onblocked: done }))
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Velg mappe|Fortsett/ }).click()
  const alert = page.getByRole('alert')
  await expect(page.getByRole('tab', { name: 'Oppslag' }).or(alert)).toBeVisible()
  if (await alert.isVisible()) throw new Error(`Start failed: ${await alert.textContent()}`)
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
  await page.getByRole('button', { name: /Første oppslag/ }).click()
  await expect(page.getByText('Også: Oppslag, Begrep')).toBeVisible()
  await page.getByRole('button', { name: '#eksempel' }).click()
  await expect(page.getByRole('button', { name: 'Fjern #eksempel' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a link to another tab, and back', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Steg' }).click()
  await page.getByRole('button', { name: /Slik lager du en veiledning/ }).click()
  await page.getByRole('link', { name: 'Første oppslag' }).click()
  await expect(page.getByRole('tab', { name: 'Oppslag' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Også: Oppslag, Begrep')).toBeVisible()
  await page.getByRole('button', { name: 'Tilbake til Slik lager du en veiledning' }).click()
  await expect(page.getByRole('heading', { name: 'Slik lager du en veiledning' })).toBeVisible()
  await page.getByRole('link', { name: 'steg 1' }).click()
  await expect(page.getByRole('heading', { name: 'Steg 1: Skriv tittelen' })).toBeFocused()
  expect(errors).toEqual([])
})

test('a card turns', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Kort' }).click()
  await page.getByRole('button', { name: /Snu kortet: Kort 1/ }).click()
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

test('look up a shortcut by pressing it', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Hurtigtaster' }).click()
  await page.getByRole('button', { name: 'Finn hurtigtasten ved å trykke den' }).click()
  await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', 'Trykk hurtigtasten')
  // The app reads the system from the user agent, which Playwright's devices set.
  const mac = await page.evaluate(() => /mac|iphone|ipad/i.test(navigator.userAgent))
  await page.keyboard.press(mac ? 'Meta+Shift+KeyS' : 'Control+Shift+KeyS')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await expect(page.locator('.shortcut .name')).toHaveText(['Handling med ulike taster'])
  expect(errors).toEqual([])
})

test('move an entry and a group, saved to the file', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('tab', { name: 'Kort' }).click()
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Endre rekkefølgen' }).click()
  await expect(page.getByRole('button', { name: 'Ferdig' })).toBeFocused()
  await page.getByRole('button', { name: 'Flytt Kort 3 opp' }).click()
  await expect(page.getByRole('button', { name: 'Flytt Kort 3 opp' })).toBeFocused()
  await page.getByRole('button', { name: 'Flytt Gruppe 2 opp' }).click()
  await expect(page.getByRole('button', { name: 'Flytt Gruppe 2 ned' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Ferdig' })).toBeHidden()
  await page.reload()
  await page.getByRole('tab', { name: 'Kort' }).click()
  await expect(page.locator('.list h2')).toHaveText(['Gruppe 2', 'Gruppe 1'])
  await expect(page.locator('.list h3')).toHaveText([/Kort 4/, /Kort 1/, /Kort 3/, /Spørsmål/])
  expect(errors).toEqual([])
})

test('customize: name, tab order, options and a colour, saved to the files', async ({ page }) => {
  const errors = await start(page)
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Tilpass appen' }).click()
  await page.getByLabel('Navnet på appen').fill('Min app')
  await page.getByRole('button', { name: 'Flytt Steg opp' }).click()
  await expect(page.getByRole('button', { name: 'Flytt Steg opp' })).toBeFocused()
  await page.locator('summary', { hasText: 'Valg for Oppslag' }).click()
  await page.getByRole('group', { name: 'Valg for Oppslag' }).getByLabel('Tekst i søkefeltet').fill('Finn et ord')
  await page.getByLabel('Aksent, lys modus').fill('#7a0000')
  await expect(page.locator(':root')).toHaveCSS('--accent-light', '#7a0000')
  await page.getByRole('button', { name: 'Lagre' }).click()
  await expect(page.getByRole('tab')).toHaveText(['Hurtigtaster', 'Oppslag', 'Steg', 'Kort'])
  await expect(page).toHaveTitle('Min app')
  await page.getByRole('tab', { name: 'Oppslag' }).click()
  await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', 'Finn et ord')
  await page.reload()
  await expect(page.getByRole('tab')).toHaveText(['Hurtigtaster', 'Oppslag', 'Steg', 'Kort'])
  await expect(page.locator(':root')).toHaveCSS('--accent-light', '#7a0000')

  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Tilpass appen' }).click()
  await page.getByLabel('Tekst, lys modus', { exact: true }).fill('#eeeeee')
  await expect(page.getByText('Kontrasten mellom tekst og bakgrunn er under 4,5:1 i lys modus')).toBeVisible()
  await page.getByRole('button', { name: 'Avbryt' }).click()
  await page.getByRole('button', { name: 'Forkast endringene' }).click()
  await expect(page.locator(':root')).not.toHaveCSS('--text-light', '#eeeeee')
  expect(errors).toEqual([])
})

test('no WCAG 2.2 AA violations on any tab, an open entry, the editor or the form', async ({ page }) => {
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
  await page.getByRole('button', { name: /Snu kortet: Spørsmål/ }).click()
  await check('bakside, mørk')
  await page.emulateMedia({ colorScheme: 'light' })
  await page.getByRole('tab', { name: 'Oppslag' }).click()
  await page.getByRole('button', { name: /Oppslag med lukket boks/ }).click()
  await page.getByText('Mer om dette').click()
  await check('åpent oppslag')
  await page.getByRole('tab', { name: 'Hurtigtaster' }).click()
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Endre rekkefølgen' }).click()
  await check('endre rekkefølgen')
  await page.getByRole('button', { name: 'Ferdig' }).click()
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await expect(page.getByRole('link', { name: 'Brukerveiledning' })).toHaveAttribute('href', /BRUKERVEILEDNING\.md$/)
  await check('meny')
  await page.getByRole('button', { name: 'Endre innhold i Hurtigtaster' }).click()
  await check('editor')
  await page.getByRole('button', { name: 'Avbryt' }).click()
  await page.getByRole('button', { name: 'Flere valg' }).click()
  await page.getByRole('button', { name: 'Tilpass appen' }).click()
  for (const summary of await page.locator('summary').all()) await summary.click()
  await check('tilpass')
  await page.emulateMedia({ colorScheme: 'dark' })
  await check('tilpass, mørk')
})
