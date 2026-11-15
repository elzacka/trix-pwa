// A tab's file: frontmatter names the module, the body holds groups and entries.

import { parse as parseYaml } from 'yaml'
import * as v from 'valibot'
import { frontmatter, plain, slug, withoutComments } from './text'

export const MODULES = ['hurtigtaster', 'oppslag', 'kort', 'steg'] as const
export type Module = (typeof MODULES)[number]

export const OPTIONS = ['søk', 'emneknagger', 'a–å'] as const
export type Option = (typeof OPTIONS)[number]

export const DEFAULT_OPTIONS: Record<Module, Option[]> = {
  hurtigtaster: ['søk'],
  oppslag: ['søk', 'emneknagger', 'a–å'],
  kort: ['søk', 'emneknagger'],
  steg: ['søk', 'emneknagger', 'a–å'],
}

/** Text as Markdown, or a closed box with a title. */
export type Segment = { kind: 'md'; text: string } | { kind: 'box'; title: string; text: string }

export interface Entry {
  id: string
  title: string
  slug: string
  line: number
  segments: Segment[]
  /** The first paragraph: the preview in a list, the front of a card. */
  lead: string
  aliases: string[]
  english: string[]
  tags: string[]
  /** Slugs of the headings inside, for links to a place in the entry. */
  anchors: string[]
  /** Everything as plain text, for search. */
  text: string
}

export interface Group<T> {
  title: string
  slug: string
  line: number
  items: T[]
}

export interface Shortcut {
  id: string
  title: string
  slug: string
  line: number
  windows: string
  mac: string
  box: string | null
}

export interface Tab {
  file: string
  name: string
  module: Module
  options: Option[]
  placeholder: string
  columns: number | null
  /** False when the shortcut names are too long in all to parse: they show as plain text. */
  markup: boolean
  groups: Group<Entry>[]
  shortcuts: Group<Shortcut>[]
}

const Meta = v.object({
  modul: v.picklist(MODULES),
  valg: v.optional(v.array(v.picklist(OPTIONS))),
  søketekst: v.optional(v.pipe(v.string(), v.maxLength(80))),
  bredde: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(6))),
})

export type TabResult = { tab: Tab | null; problems: string[] }

/** Parses one tab's file; `null` when it is not a tab (no `modul` at the top). */
export function parseTab(file: string, text: string): TabResult {
  const { yaml, body, bodyLine } = frontmatter(text)
  if (yaml === null) return { tab: null, problems: [`${file}: Øverst i fila mangler «modul», så fila vises ikke`] }
  let data: unknown
  try {
    data = parseYaml(yaml)
  } catch (error) {
    return { tab: null, problems: [`${file}: Toppen av fila kan ikke leses (${(error as Error).message.split('\n')[0]})`] }
  }
  const meta = v.safeParse(Meta, data)
  if (!meta.success) {
    const issue = meta.issues[0]
    const key = issue.path?.map(p => String(p.key)).join('.') ?? ''
    return { tab: null, problems: [`${file}: «${key}» har en ugyldig verdi, så fila vises ikke`] }
  }
  const { modul, valg, søketekst, bredde } = meta.output
  const lines = withoutComments(body.split(/\r?\n/))
  const title = lines.find(l => /^#\s+\S/.test(l))
  const tab: Tab = {
    file,
    name: title ? title.replace(/^#\s+/, '').trim() : file.replace(/\.md$/i, ''),
    module: modul,
    options: valg ?? DEFAULT_OPTIONS[modul],
    placeholder: søketekst ?? '',
    columns: bredde ?? null,
    markup: true,
    groups: [],
    shortcuts: [],
  }
  if (modul === 'hurtigtaster') {
    tab.shortcuts = parseShortcuts(lines, bodyLine)
    // Each name is short, but thousands of crafted ones would still stall the tab.
    const names = tab.shortcuts.flatMap(g => g.items.flatMap(s => [s.title, s.box ?? '']))
    tab.markup = names.reduce((n, name) => n + name.length, 0) <= 100_000
  }
  else tab.groups = parseEntries(lines, bodyLine)
  return { tab, problems: [] }
}

const BOX_START = /^:::\s+(\S.*)$/
const BOX_END = /^:::\s*$/
const TAGS = /^(?:#[\p{L}\p{N}_-]+\s*)+$/u
const ALSO = /^(?:\*\*)?også:(?:\*\*)?\s*(.*)$/i
const ENGLISH = /^(?:\*\*)?engelsk:(?:\*\*)?\s*(.*)$/i

const list = (text: string) => text.split(',').map(s => s.trim()).filter(Boolean)

/** `##` groups, `###` entries; lines before the first `###` in a group are left out. */
export function parseEntries(lines: string[], first = 1): Group<Entry>[] {
  const groups: Group<Entry>[] = []
  let entry: (Entry & { open: Segment | null }) | null = null
  let group: Group<Entry> | null = null

  const close = () => {
    if (!entry) return
    entry.segments = entry.segments.map(s => ({ ...s, text: s.text.trim() })).filter(s => s.text || s.kind === 'box')
    const paragraph = entry.segments[0]?.kind === 'md' ? entry.segments[0].text.split(/\n\s*\n/)[0] : ''
    // Only a plain paragraph leads; a list, table or heading stays in the body.
    entry.lead = paragraph.split('\n').every(l => !/^([-*+]\s|\d+\.\s|\||#)/.test(l.trim())) ? paragraph : ''
    entry.anchors = entry.segments.flatMap(s => s.text.split('\n').filter(l => /^#{4,6}\s/.test(l)).map(l => slug(l.replace(/^#+\s*/, ''))))
    entry.text = [entry.title, ...entry.aliases, ...entry.english, ...entry.segments.map(s => (s.kind === 'box' ? `${s.title} ${s.text}` : s.text))]
      .map(plain).join(' ')
    const { open: _open, ...done } = entry
    void _open
    group!.items.push(done)
    entry = null
  }

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()
    const at = first + i
    if (/^##\s+\S/.test(line) && !/^###/.test(line)) {
      close()
      const title = line.replace(/^##\s+/, '').trim()
      group = { title, slug: slug(title), line: at, items: [] }
      groups.push(group)
      return
    }
    if (/^###\s+\S/.test(line) && !/^####/.test(line)) {
      close()
      if (!group) {
        group = { title: '', slug: '', line: -1, items: [] }
        groups.push(group)
      }
      const title = line.replace(/^###\s+/, '').trim()
      entry = {
        id: `${at}`, title, slug: slug(title), line: at, segments: [], lead: '', aliases: [], english: [], tags: [], anchors: [], text: '', open: null,
      }
      return
    }
    if (!entry) return
    const trimmed = line.trim()
    const box = BOX_START.exec(trimmed)
    if (box) {
      entry.open = { kind: 'box', title: box[1].trim(), text: '' }
      entry.segments.push(entry.open)
      return
    }
    if (BOX_END.test(trimmed) && entry.open?.kind === 'box') {
      entry.open = null
      return
    }
    const also = ALSO.exec(trimmed)
    if (also) return void entry.aliases.push(...list(also[1]))
    const english = ENGLISH.exec(trimmed)
    if (english) return void entry.english.push(...list(english[1]))
    if (TAGS.test(trimmed)) {
      entry.tags.push(...trimmed.split(/\s+/).map(t => t.slice(1)))
      return
    }
    if (!entry.open) {
      entry.open = { kind: 'md', text: '' }
      entry.segments.push(entry.open)
    }
    entry.open.text += `${line}\n`
  })
  close()
  return groups.filter(g => g.items.length || g.title)
}

/** A row's cells split on `|`, with `\|` kept as a character. */
const cells = (row: string) => row.split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim())

/** `- Navn | taster` (both systems) or `- Navn | Windows | Mac`, under `##` groups. */
export function parseShortcuts(lines: string[], first = 1): Group<Shortcut>[] {
  const groups: Group<Shortcut>[] = []
  let group: Group<Shortcut> | null = null
  let box: string | null = null
  lines.forEach((raw, i) => {
    const line = raw.trim()
    const at = first + i
    if (/^##\s+\S/.test(line) && !/^###/.test(line)) {
      const title = line.replace(/^##\s+/, '')
      group = { title, slug: slug(title), line: at, items: [] }
      groups.push(group)
      box = null
      return
    }
    const start = BOX_START.exec(line)
    if (start) return void (box = start[1].trim())
    if (BOX_END.test(line)) return void (box = null)
    const row = /^[-*]\s+(.+)$/.exec(line)
    if (!row) return
    const [title, a = '', b] = cells(row[1])
    if (!title || (!a && !b)) return
    if (!group) {
      group = { title: '', slug: '', line: -1, items: [] }
      groups.push(group)
    }
    group.items.push({ id: `${at}`, title, slug: slug(title), line: at, windows: a, mac: b ?? a, box })
  })
  return groups.filter(g => g.items.length)
}
