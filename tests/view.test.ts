import { describe, expect, it } from 'vitest'
import { parseTab } from '../src/lib/content'
import { alphabetical, emptyView, entryGroups, findAnchor, shortcutGroups } from '../src/lib/view'
import { linkKind } from '../src/lib/markdown'

const tab = parseTab('O.md', '---\nmodul: oppslag\n---\n### Øre\nLyd.\n#kropp\n### Arm\nLem.\n#kropp #lem\n### Bein\nGå.\n#### Kne\n')!.tab!

describe('view', () => {
  it('sorts A–Å with Norwegian letters last and one group per letter', () => {
    expect(alphabetical(tab.groups).map(g => g.title)).toEqual(['A', 'B', 'Ø'])
  })
  it('searches by prefix and narrows by tags', () => {
    expect(entryGroups(tab, { ...emptyView(), query: 'ar' })[0].items.map(e => e.title)).toEqual(['Arm'])
    expect(entryGroups(tab, { ...emptyView(), tags: ['kropp'] }).flatMap(g => g.items).map(e => e.title)).toEqual(['Arm', 'Øre'])
  })
  it('finds a link target by entry, heading and group', () => {
    expect(findAnchor(tab, 'kne')?.entry?.title).toBe('Bein')
    expect(findAnchor(tab, 'arm')?.entry?.title).toBe('Arm')
    expect(findAnchor(tab, 'finnes-ikke')).toBeNull()
  })
  it('filters shortcuts', () => {
    const keys = parseTab('H.md', '---\nmodul: hurtigtaster\n---\n## G\n- Lagre | ctrl S\n- Åpne | ctrl O\n')!.tab!
    expect(shortcutGroups(keys, { ...emptyView(), query: 'lag' })[0].items.map(s => s.title)).toEqual(['Lagre'])
  })
  it('sorts links into web, app and text', () => {
    expect(linkKind('https://dsb.no').kind).toBe('web')
    expect(linkKind('javascript:alert(1)').kind).toBe('none')
    expect(linkKind('Steg.md#forbered%20deg')).toEqual({ kind: 'app', file: 'Steg.md', anchor: 'forbered deg' })
    expect(linkKind('#sted')).toEqual({ kind: 'app', file: '', anchor: 'sted' })
    expect(linkKind('../x.md').kind).toBe('none')
  })
})
