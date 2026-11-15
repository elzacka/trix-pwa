import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseTab } from '../src/lib/content'
import { keyParts } from '../src/lib/keys'
import { FILES, PACKS, fileText, packZip } from '../src/lib/library'
import { isFileName } from '../src/lib/text'

describe('template library', () => {
  const templates = PACKS.flatMap(pack => pack.templates)

  it('every template is a tab without problems, in the module its pack names, with a valid file name', async () => {
    for (const t of templates) {
      expect(isFileName(`${t.name}.md`), t.id).toBe(true)
      const { tab, problems } = parseTab(`${t.name}.md`, await fileText(t))
      expect(problems, t.id).toEqual([])
      expect(tab?.module, t.id).toBe(t.module)
      expect(tab?.name, t.id).toBe(t.name)
    }
  })

  it('every file in a pack folder is listed, and ids and names are unique', () => {
    const listed = new Set(templates.map(t => `../templates/bibliotek/${t.id}`))
    expect(Object.keys(FILES).filter(f => !listed.has(f))).toEqual([])
    expect(new Set(PACKS.map(p => p.id)).size).toBe(PACKS.length)
    for (const pack of PACKS) {
      expect(pack.id, pack.id).toMatch(/^[\w-]+$/)
      expect(new Set(pack.templates.map(t => t.name)).size, pack.id).toBe(pack.templates.length)
    }
  })

  it('no key cell in a shortcut list falls back to plain text', async () => {
    for (const t of templates.filter(t => t.module === 'hurtigtaster' && !t.id.startsWith('kom-i-gang/'))) {
      const { tab } = parseTab('X.md', await fileText(t))
      for (const s of tab!.shortcuts.flatMap(g => g.items)) {
        for (const cell of [s.windows, s.mac]) if (cell) expect(keyParts(cell, 'mac'), cell).not.toEqual([[{ text: cell }]])
      }
    }
  })

  it('a pack downloads as one zip with a file per template, named after the tab', async () => {
    const pack = PACKS.find(p => p.id === 'nettleseren')!
    const files = unzipSync(new Uint8Array(await (await packZip(pack)).arrayBuffer()))
    expect(Object.keys(files).sort()).toEqual(['Chrome.md', 'Edge.md'])
    expect(strFromU8(files['Chrome.md'])).toContain('# Chrome')
  })
})
