import { describe, expect, it } from 'vitest'
import { parseTab } from '../src/lib/content'

const lookup = `---
modul: oppslag
---
# Ordliste

<!-- hjelp
### ikke dette -->

## Gruppe

### Første
Kort forklaring.

Mer tekst.
::: Boks
Inni boksen.
:::
#### Del
Også: Ett, To
Engelsk: First
#a #b

### Andre
- bare en liste
`

describe('content', () => {
  it('reads groups, entries, boxes, names and tags', () => {
    const { tab, problems } = parseTab('Ordliste.md', lookup)
    expect(problems).toEqual([])
    expect(tab!.name).toBe('Ordliste')
    expect(tab!.options).toEqual(['søk', 'emneknagger', 'a–å'])
    const [first, second] = tab!.groups[0].items
    expect(first.title).toBe('Første')
    expect(first.lead).toBe('Kort forklaring.')
    expect(first.segments.map(s => s.kind)).toEqual(['md', 'box', 'md'])
    expect(first.aliases).toEqual(['Ett', 'To'])
    expect(first.english).toEqual(['First'])
    expect(first.tags).toEqual(['a', 'b'])
    expect(first.anchors).toEqual(['del'])
    expect(second.lead).toBe('')
    expect(tab!.groups[0].items).toHaveLength(2)
  })
  it('reads shortcuts for both systems, boxes and escaped bars', () => {
    const { tab } = parseTab('H.md', '---\nmodul: hurtigtaster\n---\n## G\n- Lagre | ctrl S | ⌘S\n::: Mer\n- A \\| B | esc\n:::\n- Bare Mac |  | ⌘M\n')
    const items = tab!.shortcuts[0].items
    expect(items.map(i => [i.title, i.windows, i.mac, i.box])).toEqual([
      ['Lagre', 'ctrl S', '⌘S', null], ['A | B', 'esc', 'esc', 'Mer'], ['Bare Mac', '', '⌘M', null],
    ])
  })
  it('skips a file without a module, and says why', () => {
    expect(parseTab('README.md', '# Hei').tab).toBeNull()
    expect(parseTab('X.md', '---\nmodul: tull\n---\n').problems[0]).toContain('«modul»')
  })
})
