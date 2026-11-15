// Markdown to a syntax tree; the views render its nodes as elements, never as HTML.

import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import type { Nodes, Root, RootContent, PhrasingContent } from 'mdast'

/** Table cells per text: a crafted table must not stall rendering. */
export const CELL_LIMIT = 20000
/** Longer text shows as plain text: the parser slows down sharply on crafted input. */
export const TEXT_LIMIT = 20000
const INLINE_LIMIT = 4000

const cache = new Map<string, Root>()

export function parseMarkdown(text: string): Root {
  let tree = cache.get(text)
  if (!tree && text.length > TEXT_LIMIT) tree = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] }
  if (!tree) {
    tree = fromMarkdown(text, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
    let cells = 0
    tree.children = tree.children.filter(node => node.type !== 'table' || (cells += node.children.reduce((n, r) => n + r.children.length, 0)) <= CELL_LIMIT)
    if (cache.size > 500) cache.clear()
    cache.set(text, tree)
  }
  return tree
}

/** A single line, such as a title or a shortcut's name, as inline nodes. */
export function parseInline(text: string): PhrasingContent[] {
  if (text.length > INLINE_LIMIT) return [{ type: 'text', value: text }]
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
