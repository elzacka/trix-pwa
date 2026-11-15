// Moving an entry or a group inside a tab's file: the lines move, everything else stays as written.

import type { Module } from './content'
import { frontmatter, withoutComments } from './text'

type Range = { start: number; end: number }
type GroupRange = { heading: number; items: Range[] }

/** Where a move lands: before the item or group at a line, or last in the group with its heading at `end` (-1: above the first group). */
export type Place = { before: number } | { end: number }

/** Each item's lines [start, end), 0-based, by group as the parsers read them; a group's `heading` is -1 above the first. */
function itemRanges(lines: string[], module: Module): GroupRange[] {
  const groups: GroupRange[] = []
  const group = (heading: number) => groups[groups.push({ heading, items: [] }) - 1]
  const body = lines.length - frontmatter(lines.join('\n')).body.split('\n').length
  let item: Range | null = null
  withoutComments(lines).forEach((line, i) => {
    if (i < body) return
    if (module === 'hurtigtaster') {
      if (/^##\s+\S/.test(line) && !/^###/.test(line)) group(i)
      else if (/^[-*]\s/.test(line.trim())) (groups.at(-1) ?? group(-1)).items.push({ start: i, end: i + 1 })
    } else if (/^#{1,3}\s/.test(line)) {
      item = null
      if (/^##\s/.test(line)) group(i)
      else if (/^###\s/.test(line)) (groups.at(-1) ?? group(-1)).items.push((item = { start: i, end: i + 1 }))
    } else if (item && lines[i].trim()) {
      item.end = i + 1
    }
  })
  return groups
}

/** The item starting at line `from` moved to `to`; returns the text and the item's new line, 0-based. */
export function moveItem(text: string, module: Module, from: number, to: Place): { text: string; line: number } {
  const lines = text.split(/\r?\n/)
  const groups = itemRanges(lines, module)
  const moved = groups.flatMap(g => g.items).find(item => item.start === from)
  if (!moved) return { text, line: from }
  const content = lines.slice(moved.start, moved.end)
  // Entries keep a blank line between them; shortcuts are one line each.
  const gap = module === 'hurtigtaster' ? [] : ['']
  let at: number
  let chunk = [...content, ...gap]
  if ('before' in to) at = to.before
  else {
    const group = groups.find(g => g.heading === to.end)!
    const rest = group.items.filter(item => item !== moved)
    at = rest.length ? rest.at(-1)!.end : group.heading + 1
    chunk = [...gap, ...content]
  }
  // The blank lines after it go too, unless they are all that parts the lines around it.
  let end = moved.end
  if (gap.length && (moved.start === 0 || !lines[moved.start - 1].trim())) while (end < lines.length && !lines[end].trim()) end++
  const out: string[] = []
  let line = -1
  const place = () => {
    line = out.length + ('before' in to ? 0 : gap.length)
    out.push(...chunk)
  }
  lines.forEach((text, i) => {
    if (i === at) place()
    if (i < moved.start || i >= end) out.push(text)
  })
  if (at >= lines.length) place()
  if (out.at(-1) !== '') out.push('')
  return { text: out.join('\n'), line }
}

/** The group with its heading at line `from`, with all its lines, before the group at `to.before`, or last. */
export function moveGroup(text: string, module: Module, from: number, to: Place): { text: string; line: number } {
  const lines = text.split(/\r?\n/)
  const heads = itemRanges(lines, module).map(g => g.heading).filter(h => h >= 0)
  const end = heads.find(h => h > from) ?? lines.length
  const chunk = lines.slice(from, end)
  while (chunk.length && !chunk.at(-1)!.trim()) chunk.pop()
  const rest = [...lines.slice(0, from), ...lines.slice(end)]
  let at = 'before' in to ? to.before - (to.before > from ? end - from : 0) : rest.length
  if (!('before' in to)) while (at && !rest[at - 1].trim()) at--
  const lead = at && rest[at - 1].trim() ? [''] : []
  const out = [...rest.slice(0, at), ...lead, ...chunk, '', ...rest.slice(at)]
  while (out.length > 1 && !out.at(-1)!.trim() && !out.at(-2)!.trim()) out.pop()
  if (out.at(-1)!.trim()) out.push('')
  return { text: out.join('\n'), line: at + lead.length }
}
