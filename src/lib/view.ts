// What a tab shows: its groups narrowed by search and tags, sorted A–Å when chosen.

import type { Entry, Group, Shortcut, Tab } from './content'
import { comboKey, keyParts, type Os } from './keys'
import { searchEntries, searchShortcuts } from './search'
import { byTitle, collator, plain } from './text'

export interface View {
  query: string
  tags: string[]
  /** The open entry or turned card. */
  open: string | null
  /** The guide being read (steg). */
  reading: string | null
}

export const emptyView = (): View => ({ query: '', tags: [], open: null, reading: null })

export const has = (tab: Tab, option: string) => (tab.options as string[]).includes(option)

/** A–Å: groups and their entries sorted; a file without groups gets one group per first letter. */
export function alphabetical<T extends { title: string }>(groups: Group<T>[]): Group<T>[] {
  if (groups.every(g => !g.title)) {
    const letters = new Map<string, T[]>()
    for (const item of groups.flatMap(g => g.items).sort(byTitle)) {
      const letter = plain(item.title).charAt(0).toLocaleUpperCase('nb')
      letters.set(letter, [...(letters.get(letter) ?? []), item])
    }
    return [...letters].map(([title, items]) => ({ title, slug: '', line: -1, items }))
  }
  return [...groups].sort((a, b) => collator.compare(a.title, b.title)).map(g => ({ ...g, items: [...g.items].sort(byTitle) }))
}

export function entryGroups(tab: Tab, view: View): Group<Entry>[] {
  const tags = has(tab, 'emneknagger') ? view.tags : []
  const withTags = (e: Entry) => tags.every(t => e.tags.includes(t))
  const query = view.query.trim()
  if (query) {
    const all = new Map(tab.groups.flatMap(g => g.items).map(e => [e.id, e]))
    const found = searchEntries(tab.groups, query).map(id => all.get(id)!).filter(withTags)
    return found.length ? [{ title: '', slug: '', line: -1, items: found }] : []
  }
  const groups = has(tab, 'a–å') ? alphabetical(tab.groups) : tab.groups
  return groups.map(g => ({ ...g, items: g.items.filter(withTags) })).filter(g => g.items.length)
}

/** Matches by name, or by keys when the query is a combination such as «⌘⇧S» or «ctrl shift S». */
export function shortcutGroups(tab: Tab, view: View, os: Os): Group<Shortcut>[] {
  const query = view.query.trim()
  const groups = has(tab, 'a–å') ? alphabetical(tab.shortcuts) : tab.shortcuts
  if (!query) return groups
  const found = searchShortcuts(tab.shortcuts, query)
  const combo = comboKey(query, os)
  const pressed = (s: Shortcut) => keyParts(os === 'mac' ? s.mac : s.windows, os).some(alt => alt.some(p => 'keys' in p && comboKey(p.keys, os) === combo))
  return groups.map(g => ({ ...g, items: g.items.filter(s => found.has(s.id) || pressed(s)) })).filter(g => g.items.length)
}

export const count = <T>(groups: Group<T>[]) => groups.reduce((n, g) => n + g.items.length, 0)

/** Where a link lands: the entry to open and the anchor to scroll to. */
export function findAnchor(tab: Tab, anchor: string): { entry: Entry | null; anchor: string } | null {
  if (!anchor) return { entry: null, anchor: '' }
  for (const group of tab.groups) {
    if (group.slug === anchor) return { entry: null, anchor }
    const entry = group.items.find(e => e.slug === anchor) ?? group.items.find(e => e.anchors.includes(anchor))
    if (entry) return { entry, anchor }
  }
  for (const group of tab.shortcuts) {
    if (group.slug === anchor || group.items.some(s => s.slug === anchor)) return { entry: null, anchor }
  }
  return null
}
