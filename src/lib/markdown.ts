// Markdown to a syntax tree; the views render its nodes as elements, never as HTML.

import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import type { Nodes, Root, RootContent, PhrasingContent } from 'mdast'

/** Table cells per text: a crafted table must not stall rendering. */
export const CELL_LIMIT = 20000
// The parser slows down sharply on crafted inline text, so it reads only text it can finish:
// paragraphs up to 5000 characters, table rows and list items up to 2000, 200 000 in all. Anything else shows as plain text.
export const TEXT_LIMIT = 200_000
const BLOCK_LIMIT = 5000
const ROW_LIMIT = 2000
/** Titles and shortcut names: short, and a tab may hold thousands. */
export const INLINE_LIMIT = 300

const parseable = (text: string) =>
  text.length <= TEXT_LIMIT &&
  text.split(/\n[ \t]*\n/).every(block => {
    const lines = block.trim().split('\n')
    // Each table row and list item is parsed on its own, so their length counts line by line.
    const rows = lines.every(l => /^\s*(\||[-*+]\s|\d+[.)]\s)/.test(l))
    return rows ? lines.every(l => l.length <= ROW_LIMIT) : block.length <= BLOCK_LIMIT
  })

const plainRoot = (text: string): Root => ({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] })

const cache = new Map<string, Root>()

export function parseMarkdown(text: string): Root {
  let tree = cache.get(text)
  if (!tree) {
    try {
      tree = parseable(text) ? fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }) : plainRoot(text)
    } catch {
      // Deep nesting overflows the parser's stack.
      tree = plainRoot(text)
    }
    let cells = 0
    tree.children = tree.children.filter(node => node.type !== 'table' || (cells += node.children.reduce((n, r) => n + r.children.length, 0)) <= CELL_LIMIT)
    if (cache.size > 500) cache.clear()
    cache.set(text, tree)
  }
  return tree
}

/** A single line, such as a title or a shortcut's name, as inline nodes. */
export function parseInline(text: string, limit = INLINE_LIMIT): PhrasingContent[] {
  if (text.length > limit) return [{ type: 'text', value: text }]
  const first = parseMarkdown(text).children[0]
  return first?.type === 'paragraph' ? first.children : [{ type: 'text', value: text }]
}

export const textOf = (node: Nodes | RootContent): string =>
  'value' in node ? node.value : 'children' in node ? (node.children as Nodes[]).map(textOf).join('') : ''

export type LinkKind = { kind: 'web'; href: string } | { kind: 'app'; file: string; anchor: string } | { kind: 'none' }

/** Web links go to the browser; `Fil.md#sted` and `#sted` go to a place in the app; anything else is text. */
export function linkKind(href: string): LinkKind {
  if (/^https?:\/\/[^\s]+$/i.test(href) && href.length <= 2048) return { kind: 'web', href }
  const match = /^([^/\\:?#]*\.md)?(?:#(.+))?$/i.exec(href)
  if (!match || (!match[1] && !match[2])) return { kind: 'none' }
  const decode = (s = '') => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  return { kind: 'app', file: decode(match[1]), anchor: decode(match[2]).toLocaleLowerCase('nb') }
}
