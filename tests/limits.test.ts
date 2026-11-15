import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown, TEXT_LIMIT } from '../src/lib/markdown'
import { colorPair, parseSetup } from '../src/lib/setup'
import { plain } from '../src/lib/text'
import { parseTab } from '../src/lib/content'
import { Folder } from '../src/lib/storage'
import { fakeDir } from './fakefs'

// Crafted content from a shared file or a restored backup must not stall the app (TRIX-SEC-01, -02).
describe('limits', () => {
  it('strips a long run of link openers in linear time', () => {
    const started = performance.now()
    plain('[a]('.repeat(250_000))
    expect(performance.now() - started).toBeLessThan(500)
    expect(plain('Se [lenken](https://x.no) og [den](Fil.md#sted)')).toBe('Se lenken og den')
  })
  it('keeps long text out of the parser', () => {
    const text = '*a'.repeat(TEXT_LIMIT)
    const started = performance.now()
    expect(parseMarkdown(text).children).toEqual([{ type: 'paragraph', children: [{ type: 'text', value: text }] }])
    expect(parseInline('[a]('.repeat(1001))).toEqual([{ type: 'text', value: '[a]('.repeat(1001) }])
    expect(performance.now() - started).toBeLessThan(100)
  })
  it('takes only real colours and own text keys (TRIX-SEC-06, -07)', () => {
    expect(colorPair('var(--x)')).toBeNull()
    expect(colorPair('#fff / inherit')).toBeNull()
    expect(colorPair('rgb(0 0 0 / 50%)')).not.toBeNull()
    expect(parseSetup('---\ntekster:\n  toString: x\n---\n').problems).toHaveLength(1)
  })
  it('parses a large real table, and falls back on deep nesting (N3, TRIX-SEC-03)', () => {
    const table = ['| Vare | Pris |', '|---|---|', ...Array.from({ length: 1500 }, (_, i) => `| Vare ${i} | ${i} |`)].join('\n')
    expect(table.length).toBeGreaterThan(20_000)
    expect(parseMarkdown(table).children[0].type).toBe('table')
    expect(parseMarkdown('> '.repeat(6000) + 'bunn').children[0].type).toBe('paragraph')
  })
  it('lines that only look like rows or list items still count as one paragraph', () => {
    const fake = Array.from({ length: 200 }, () => '| ' + '*a'.repeat(400)).join('\n')
    expect(parseMarkdown(fake).children).toEqual([{ type: 'paragraph', children: [{ type: 'text', value: fake }] }])
    const uneven = ['|a|b|', '|-|', ...Array.from({ length: 100 }, () => '| ' + '*a'.repeat(400))].join('\n')
    expect(parseMarkdown(uneven).children[0]).toEqual({ type: 'paragraph', children: [{ type: 'text', value: uneven }] })
  })
  it('a shortcut tab full of markup shows its names as text', () => {
    const rows = Array.from({ length: 400 }, (_, i) => `- www.${'a'.repeat(280)}${i}.no | F1`).join('\n')
    expect(parseTab('H.md', `---\nmodul: hurtigtaster\n---\n${rows}\n`).tab!.markup).toBe(false)
    expect(parseTab('H.md', '---\nmodul: hurtigtaster\n---\n- **Lagre** | ctrl S\n').tab!.markup).toBe(true)
  })
  it('counts the size after Windows line endings', async () => {
    const folder = new Folder(fakeDir({ 'A.md': 'a\r\n' }), 'nettleser')
    await expect(folder.write('A.md', 'a\n'.repeat(800_000), 'a\r\n')).rejects.toThrow(/2 MB/)
  })
})
