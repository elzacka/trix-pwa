import { describe, expect, it } from 'vitest'
import { parseTab } from '../src/lib/content'
import { draftOf, editFrontmatter, writeSetup, writeTab } from '../src/lib/customize'
import { parseSetup } from '../src/lib/setup'
import { SETUP_TEMPLATE, template } from '../src/lib/templates'

const draft = () => draftOf(parseSetup(SETUP_TEMPLATE), [], c => c)

describe('customize', () => {
  it('writes only the changed keys and keeps the comment', () => {
    const before = draft()
    const after = structuredClone(before)
    after.name = 'Min app'
    after.colors.lenke = { light: '#112233', dark: '#445566' }
    after.texts.søk = 'Finn'
    const text = writeSetup(SETUP_TEMPLATE, before, after)
    const setup = parseSetup(text)
    expect(setup.problems).toEqual([])
    expect(setup.name).toBe('Min app')
    expect(setup.colors.lenke).toEqual({ light: '#112233', dark: '#445566' })
    expect(setup.colors.aksent).toEqual({ light: '#00466a', dark: '#7598ad' })
    expect(setup.texts.søk).toBe('Finn')
    expect(text).toContain('# Oppsett\n\n<!--')
    expect(text).not.toMatch(/^  tekst:/m)
  })
  it('an emptied text goes back to the default', () => {
    const before = draft()
    before.texts.søk = 'Finn'
    const after = structuredClone(before)
    after.texts.søk = ''
    const text = writeSetup('---\ntekster:\n  søk: Finn\n---\n', before, after)
    expect(parseSetup(text).texts.søk).toBe('Søk')
  })
  it('writes a tab’s options and keeps the module and body', () => {
    const original = template('kort', 'Kort')
    const tab = parseTab('Kort.md', original).tab!
    const text = writeTab(original, { file: 'Kort.md', name: 'Kort', module: 'kort', options: ['emneknagger', 'søk'], placeholder: 'Finn kort', columns: 3 })
    const again = parseTab('Kort.md', text).tab!
    expect(again.options).toEqual(['søk', 'emneknagger'])
    expect(again.placeholder).toBe('Finn kort')
    expect(again.columns).toBe(3)
    expect(again.groups.flatMap(g => g.items.map(e => e.text))).toEqual(tab.groups.flatMap(g => g.items.map(e => e.text)))
    expect(text).toContain('valg: [ søk, emneknagger ]')
  })
  it('a file without frontmatter gets one', () => {
    expect(editFrontmatter('# Tekst\n', doc => doc.set('navn', 'X'))).toBe('---\nnavn: X\n---\n# Tekst\n')
  })
})
