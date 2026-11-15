// Search per tab: prefix and a little fuzz, æ, ø and å kept as letters.

import MiniSearch from 'minisearch'
import type { Entry, Group, Shortcut } from './content'
import { plain } from './text'

const OPTIONS = {
  processTerm: (term: string) => term.toLocaleLowerCase('nb'),
  searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' as const, boost: { title: 3, aliases: 2, english: 2 } },
}

const indexes = new WeakMap<object, MiniSearch>()

function index<T extends { id: string }>(groups: Group<T>[], fields: string[], doc: (item: T, group: Group<T>) => Record<string, string>) {
  let found = indexes.get(groups)
  if (!found) {
    found = new MiniSearch({ fields, storeFields: [], ...OPTIONS })
    found.addAll(groups.flatMap(g => g.items.map(item => ({ id: item.id, ...doc(item, g) }))))
    indexes.set(groups, found)
  }
  return found
}

/** Ids that match, best first. */
export function searchEntries(groups: Group<Entry>[], query: string): string[] {
  const mini = index(groups, ['title', 'aliases', 'english', 'tags', 'text'], e => ({
    title: plain(e.title), aliases: e.aliases.join(' '), english: e.english.join(' '), tags: e.tags.join(' '), text: e.text,
  }))
  return mini.search(query).map(r => String(r.id))
}

export function searchShortcuts(groups: Group<Shortcut>[], query: string): Set<string> {
  const mini = index(groups, ['title', 'group'], (s, g) => ({ title: plain(s.title), group: g.title }))
  return new Set(mini.search(query).map(r => String(r.id)))
}
