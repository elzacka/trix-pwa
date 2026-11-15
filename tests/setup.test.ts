import { describe, expect, it } from 'vitest'
import { colorPair, defaultSetup, parseSetup } from '../src/lib/setup'
import { parseTab } from '../src/lib/content'
import { SETUP_TEMPLATE, STARTER, template } from '../src/lib/templates'

describe('setup', () => {
  it('splits light and dark, also with slashes inside brackets', () => {
    expect(colorPair('#fff / #000')).toEqual({ light: '#fff', dark: '#000' })
    expect(colorPair('rgb(0 0 0 / 50%)')).toEqual({ light: 'rgb(0 0 0 / 50%)', dark: 'rgb(0 0 0 / 50%)' })
    expect(colorPair('red; background: url(x)')).toBeNull()
  })
  it('keeps the good keys and names the bad one with its line', () => {
    const setup = parseSetup('---\nnavn: Min\nskrift:\n  størrelse: 99\nfarger:\n  aksent: "navy"\n---\n')
    expect(setup.name).toBe('Min')
    expect(setup.size).toBe(defaultSetup().size)
    expect(setup.colors.aksent).toEqual({ light: 'navy', dark: 'navy' })
    expect(setup.problems).toEqual(['Oppsett.md, linje 4: «skrift.størrelse» har en ugyldig verdi og blir ikke brukt'])
  })
  it('the template is valid and orders the starter tabs', () => {
    const setup = parseSetup(SETUP_TEMPLATE)
    expect(setup.problems).toEqual([])
    expect(setup.order).toEqual(Object.keys(STARTER))
  })
  it('every module template is a tab without problems', () => {
    for (const [file, module] of Object.entries(STARTER)) {
      const { tab, problems } = parseTab(file, template(module, 'Navn'))
      expect(problems, file).toEqual([])
      expect(tab?.module).toBe(module)
      expect(tab?.name).toBe('Navn')
    }
  })
})
