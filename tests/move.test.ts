import { describe, expect, it } from 'vitest'
import { parseEntries, parseShortcuts, parseTab } from '../src/lib/content'
import { moveGroup, moveItem } from '../src/lib/move'
import { template } from '../src/lib/templates'

const titles = (text: string) => parseEntries(text.split('\n')).map(g => g.items.map(e => e.title))

describe('move', () => {
  const text = '# Liste\n<!-- format -->\n## A\n\n### En\nTekst\n<!-- merknad -->\n::: Mer\nInni\n:::\n\n### To\nTo.\n\n## B\n\n### Tre\nTre.\n'
  it('moves an entry with its box and comment, before another or last in a group', () => {
    const into = moveItem(text, 'oppslag', 4, { before: 16 })
    expect(into.text).toBe('# Liste\n<!-- format -->\n## A\n\n### To\nTo.\n\n## B\n\n### En\nTekst\n<!-- merknad -->\n::: Mer\nInni\n:::\n\n### Tre\nTre.\n')
    expect(into.text.split('\n')[into.line]).toBe('### En')
    const last = moveItem(text, 'oppslag', 4, { end: 2 })
    expect(last.text.split('\n')[last.line]).toBe('### En')
    expect(titles(last.text)).toEqual([['To', 'En'], ['Tre']])
    expect(titles(moveItem(text, 'kort', 16, { before: 4 }).text)).toEqual([['Tre', 'En', 'To'], []])
  })
  it('keeps a blank line between entries and reads CRLF', () => {
    expect(moveItem('### A\na\n### B\nb', 'steg', 2, { before: 0 }).text).toBe('### B\nb\n\n### A\na\n')
    expect(moveItem('### A\r\nx\r\n\r\n### B\r\ny\r\n', 'oppslag', 0, { end: -1 }).text).toBe('### B\ny\n\n### A\nx\n')
  })
  it('skips the frontmatter', () => {
    const file = '---\nmodul: oppslag\n# not a heading\n---\n### A\na\n\n### B\nb\n'
    expect(moveItem(file, 'oppslag', 7, { before: 4 }).text).toBe('---\nmodul: oppslag\n# not a heading\n---\n### B\nb\n\n### A\na\n')
  })
  it('moves a shortcut across groups and boxes', () => {
    const keys = '## A\n- En | F1\n- To | F2\n::: Boks\n- Tre | F3\n:::\n## B\n- Fire | F4\n'
    const into = moveItem(keys, 'hurtigtaster', 1, { before: 4 })
    expect(into.text).toBe('## A\n- To | F2\n::: Boks\n- En | F1\n- Tre | F3\n:::\n## B\n- Fire | F4\n')
    expect(into.line).toBe(3)
    const [a, b] = parseShortcuts(moveItem(keys, 'hurtigtaster', 2, { end: 6 }).text.split('\n'))
    expect([a.items.map(i => i.title), b.items.map(i => i.title)]).toEqual([['En', 'Tre'], ['Fire', 'To']])
  })
  it('moves a group with all its lines', () => {
    const keys = '# H\n<!-- c -->\n\n## A\n- En | F1\n- To | F2\n\n## B\n- Tre | F3\n::: Boks\n- Fire | F4\n:::\n\n## C\n- Fem | F5'
    const up = moveGroup(keys, 'hurtigtaster', 7, { before: 3 })
    expect(up.text).toBe('# H\n<!-- c -->\n\n## B\n- Tre | F3\n::: Boks\n- Fire | F4\n:::\n\n## A\n- En | F1\n- To | F2\n\n## C\n- Fem | F5\n')
    expect(up.line).toBe(3)
    const last = moveGroup(keys, 'hurtigtaster', 3, { end: 0 })
    expect(last.text).toBe('# H\n<!-- c -->\n\n## B\n- Tre | F3\n::: Boks\n- Fire | F4\n:::\n\n## C\n- Fem | F5\n\n## A\n- En | F1\n- To | F2\n')
    const steg = '# Steg\n\n### Løs\nx\n\n## A\n\n### En\nTekst\n\n## B\n\n### To\nTo.\n'
    const groups = parseEntries(moveGroup(steg, 'steg', 10, { before: 5 }).text.split('\n'))
    expect(groups.map(g => [g.title, g.items.map(e => e.title)])).toEqual([['', ['Løs']], ['B', ['To']], ['A', ['En']]])
  })
  it('returns the line the parser gives the moved entry', () => {
    const text = template('kort', 'Kort')
    const [one, question, three] = parseTab('Kort.md', text).tab!.groups[0].items
    void one
    const moved = moveItem(text, 'kort', three.line - 1, { before: question.line - 1 })
    const again = parseTab('Kort.md', moved.text).tab!.groups[0].items
    expect(again.map(e => e.title)).toEqual(['Kort 1', 'Kort 3', 'Spørsmål på forsiden?'])
    expect(again[1].line).toBe(moved.line + 1)
  })
})
