// «Tilpass appen»: the form's values written back into the files' YAML, with comments and the rest of the file kept.

import { parseDocument, type Document } from 'yaml'
import { OPTIONS, type Module, type Option, type Tab } from './content'
import { COLORS, type ColorName, type Pair, type Setup } from './setup'
import { frontmatter } from './text'
import { TEXTS, type TextKey } from './texts'

export interface TabDraft {
  file: string
  name: string
  module: Module
  options: Option[]
  placeholder: string
  columns: number | null
}

export interface Draft {
  name: string
  order: string[]
  colors: Record<ColorName, Pair>
  font: string
  size: number
  texts: Record<TextKey, string>
  tabs: TabDraft[]
}

/** The options a module uses: shortcuts have no tags. */
export const optionsFor = (module: Module): Option[] => OPTIONS.filter(o => module !== 'hurtigtaster' || o !== 'emneknagger')

export function draftOf(setup: Setup, tabs: Tab[], hex: (color: string) => string): Draft {
  const colors = {} as Record<ColorName, Pair>
  for (const name of COLORS) colors[name] = { light: hex(setup.colors[name].light), dark: hex(setup.colors[name].dark) }
  return {
    name: setup.name,
    order: tabs.map(t => t.file),
    colors,
    font: setup.font ?? '',
    size: setup.size,
    texts: { ...setup.texts },
    tabs: tabs.map(t => ({ file: t.file, name: t.name, module: t.module, options: [...t.options], placeholder: t.placeholder, columns: t.columns })),
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const pairText = ({ light, dark }: Pair) => (light === dark ? light : `${light} / ${dark}`)

/** The setup the form shows: changed values from the draft, the rest as read. */
export function previewOf(setup: Setup, before: Draft, after: Draft): Setup {
  const colors = { ...setup.colors }
  for (const name of COLORS) if (!same(before.colors[name], after.colors[name])) colors[name] = after.colors[name]
  const texts = { ...setup.texts }
  for (const key of Object.keys(TEXTS) as TextKey[]) texts[key] = after.texts[key].trim() || TEXTS[key]
  texts.navn = after.name.trim() || setup.name
  return { ...setup, name: texts.navn, colors, font: after.font.trim() || null, size: after.size, texts }
}

/** The file with its frontmatter changed by `edit`; a file without one gets it. */
export function editFrontmatter(text: string, edit: (doc: Document) => void): string {
  const { yaml, body } = frontmatter(text)
  const doc = parseDocument(yaml ?? '')
  edit(doc)
  return `---\n${doc.toString().trimEnd()}\n---\n${body}`
}

/** Oppsett.md with only the keys the form changed. */
export function writeSetup(text: string, before: Draft, after: Draft): string {
  return editFrontmatter(text, doc => {
    if (after.name !== before.name) doc.set('navn', after.name.trim())
    if (!same(after.order, before.order)) doc.set('faner', after.order)
    for (const name of COLORS) {
      if (!same(after.colors[name], before.colors[name])) doc.setIn(['farger', name], pairText(after.colors[name]))
    }
    if (after.font !== before.font) after.font.trim() ? doc.setIn(['skrift', 'tekst'], after.font.trim()) : doc.deleteIn(['skrift', 'tekst'])
    if (after.size !== before.size) doc.setIn(['skrift', 'størrelse'], after.size)
    for (const key of Object.keys(TEXTS) as TextKey[]) {
      if (key === 'navn' || after.texts[key] === before.texts[key]) continue
      const value = after.texts[key].trim()
      if (!value || value === TEXTS[key]) doc.deleteIn(['tekster', key])
      else doc.setIn(['tekster', key], value)
    }
  })
}

/** Whether Oppsett.md needs writing: anything but the tabs' own options changed. */
export const setupChanged = (before: Draft, after: Draft) => !same({ ...before, tabs: null }, { ...after, tabs: null })

export const tabChanged = (before: TabDraft, after: TabDraft) => !same(before, after)

/** A tab's file with its options from the form; the module stays. */
export function writeTab(text: string, after: TabDraft): string {
  return editFrontmatter(text, doc => {
    const options = OPTIONS.filter(o => after.options.includes(o))
    doc.set('valg', doc.createNode(options, { flow: true }))
    if (after.placeholder.trim()) doc.set('søketekst', after.placeholder.trim())
    else doc.delete('søketekst')
    if (after.columns) doc.set('bredde', after.columns)
    else doc.delete('bredde')
  })
}
