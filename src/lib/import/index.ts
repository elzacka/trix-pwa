// Imported files as a tab's Markdown. Pure functions, so tests run them without the app.

import type { Module } from '../content'
import { CELL_LIMIT, parseInline } from '../markdown'
import { FILE_LIMIT as TAB_LIMIT } from '../storage'
import { frontmatter } from '../text'
import { readDocx } from './docx'
import type { Block, Run } from './docx'
import { readRtf } from './rtf'
import { readXlsx } from './xlsx'
import { readCsv } from './csv'

export const IMPORT_TYPES = ['.md', '.markdown', '.txt', '.rtf', '.docx', '.xlsx', '.csv']

// Documents may hold images; text files go in as they are, so they get the limit of a tab file.
export const FILE_LIMIT = 10 * 1024 * 1024
const TEXT_TYPES = ['.md', '.markdown', '.txt', '.csv']

const typeOf = (name: string) => name.toLowerCase().match(/\.[^.]*$/)?.[0]

/** A file the app reads, by name and size: checked before the file is read. */
export const importable = (name: string, size: number): boolean =>
  IMPORT_TYPES.includes(typeOf(name) ?? '') && size <= (TEXT_TYPES.includes(typeOf(name) ?? '') ? TAB_LIMIT : FILE_LIMIT)

/** The file's content as Markdown for `module`; throws when the file is not one the app reads. */
export async function importText(name: string, bytes: Uint8Array, module: Module): Promise<string> {
  if (!importable(name, bytes.length)) throw new Error(`${name}: ukjent filtype eller for stor`)
  const text = await read(name, bytes, module)
  // The result becomes a tab file, which the app reads only up to this size.
  if (new TextEncoder().encode(text).length > TAB_LIMIT) throw new Error('Fila er for stor')
  return text
}

async function read(name: string, bytes: Uint8Array, module: Module): Promise<string> {
  const type = typeOf(name)
  if (type === '.docx') return toMarkdown(await readDocx(bytes), module)
  if (type === '.rtf') return toMarkdown(readRtf(bytes), module)
  // A sheet or a CSV file is an entry named after it, holding the table.
  const title = name.replace(/\.[^.]*$/, '')
  if (type === '.xlsx') return toMarkdown(await readXlsx(bytes, title), module)
  if (type === '.csv') return toMarkdown(readCsv(bytes, title), module)
  return new TextDecoder().decode(bytes)
}

/** A link the app shows as one, short enough that repeating it cannot blow up the text. */
function link(words: string, href: string | undefined): string {
  // A long label would make the parser slow; it stays text.
  if (!href || href.length > 2048 || words.length > 500) return words
  const out = `[${words}](${href})`
  const nodes = parseInline(out, 2600)
  return nodes.length === 1 && nodes[0].type === 'link' ? out : words
}

/** Runs as inline Markdown: bold or italic around the words, spaces outside; links as the app reads them, plain. */
function markdown(runs: Run[], spend: (text: string) => string): string {
  const merged: Run[] = []
  for (const run of runs) {
    // The app shows a link inside bold as text, and one link split by formatting repeats its address.
    const linked = /^https?:\/\//.test(run.href ?? '') && run.href!.length <= 2048
    const r = linked ? { ...run, bold: false, italic: false } : { ...run, href: undefined }
    const last = merged.at(-1)
    if (last && last.bold === r.bold && last.italic === r.italic && last.href === r.href) last.text += r.text
    else merged.push({ ...r })
  }
  return merged.map(({ text, bold, italic, href }) => {
    const [, before, words, after] = text.replace(/\s+/g, ' ').match(/^(\s*)(.*?)(\s*)$/)!
    if (!words) return before + after
    let out = link(words, href)
    if (bold) out = `**${out}**`
    else if (italic) out = `*${out}*`
    return spend(before + out + after)
  }).join('').trim()
}

const plainText = (runs: Run[]) => runs.map(r => r.text).join('').replace(/\s+/g, ' ').trim()

// The shortcut parser reads only `\|` as an escape (content.ts `cells`); every other backslash is text.
const cell = (text: string) => text.split('|').join('\\|')

// In a table the Markdown parser reads `\\|` as a backslash and a column break, so a backslash before a pipe is escaped too.
const tableCell = (text: string) => text.replace(/\\?\|/g, m => (m.length === 2 ? '\\\\\\|' : '\\|'))

// A table's first row names its columns when it holds one of these words.
const COLUMN_NAMES = ['navn', 'handling', 'windows', 'mac', 'macos', 'taster', 'hurtigtast', 'hurtigtaster', 'snarvei']

/** `## Group` from the document's top two heading levels; `- Name | keys[ | Mac keys]` from table rows and lines already in that form. */
function shortcuts(blocks: Block[]): string[] {
  const lines: string[] = []
  for (const b of blocks) {
    if (b.type === 'heading' && b.rank! <= 1) lines.push('', `## ${plainText(b.runs)}`, '')
    else if ((b.type === 'paragraph' || b.type === 'item') && /(?<!\\)\|/.test(plainText(b.runs))) lines.push(`- ${plainText(b.runs).replace(/^[-*]\s+/, '')}`)
    else if (b.type === 'table') {
      const rows = b.rows.map(row => row.map(plainText))
      if (rows[0]?.some(c => COLUMN_NAMES.includes(c.toLocaleLowerCase('nb')))) rows.shift()
      for (const [name, ...keys] of rows) {
        if (name && keys.some(Boolean)) lines.push(`- ${[name, ...keys.slice(0, 2)].map(cell).join(' | ')}`)
      }
    }
  }
  return lines
}

/** `##` groups, `###` entries, `####` sub-headings, paragraphs, lists and tables. One heading level in the document: entries. */
function entries(blocks: Block[], levels: number, spend: (text: string) => string): string[] {
  const lines: string[] = []
  let number = 0
  for (const b of blocks) {
    if (b.type !== 'item') number = 0
    if (b.type === 'heading') lines.push('', `${'#'.repeat(levels === 1 ? 3 : Math.min(b.rank!, 2) + 2)} ${plainText(b.runs)}`, '')
    else if (b.type === 'paragraph') lines.push('', markdown(b.runs, spend), '')
    else if (b.type === 'item') {
      lines.push(`${b.ordered ? `${++number}.` : '-'} ${markdown(b.runs, spend)}`)
      if (!b.ordered) number = 0
    } else if (b.type === 'table' && b.rows.length) {
      const width = widthOf(b)
      const row = (r: Run[][]) => `| ${Array.from({ length: width }, (_, i) => tableCell(markdown(r[i] ?? [], spend))).join(' | ')} |`
      // The header row is bold already; bold on top of it reads heavier and breaks words.
      const head = b.rows[0].map(runs => runs.map(r => ({ ...r, bold: false })))
      lines.push('', row(head), `| ${Array(width).fill('---').join(' | ')} |`, ...b.rows.slice(1).map(row), '')
    }
  }
  return lines
}

const widthOf = (table: Extract<Block, { type: 'table' }>) => table.rows.reduce((max, r) => Math.max(max, r.length), 0)

/** Blocks from the readers: `heading` (level 1–), `paragraph`, `item` (ordered), `table` (rows of cells); text in runs. */
export function toMarkdown(blocks: Block[], module: Module): string {
  const kept = blocks.filter(b => b.type === 'table' || plainText(b.runs))
  const cells = kept.reduce((n, b) => n + (b.type === 'table' ? b.rows.length * widthOf(b) : 0), 0)
  if (cells > CELL_LIMIT) throw new Error('For mange celler')
  // Levels count from the document's own top heading: a document may start at Overskrift 2.
  // Levels 1–9 only, as Word has: a crafted file could give every heading its own level.
  for (const b of kept) if (b.type === 'heading') b.level = Math.min(9, Math.max(1, Math.round(b.level) || 1))
  const levels = [...new Set(kept.flatMap(b => (b.type === 'heading' ? [b.level] : [])))].sort((a, b) => a - b)
  for (const b of kept) if (b.type === 'heading') b.rank = levels.indexOf(b.level)
  let left = TAB_LIMIT
  const spend = (text: string) => {
    left -= text.length
    if (left < 0) throw new Error('Fila er for stor')
    return text
  }
  const lines = module === 'hurtigtaster' ? shortcuts(kept) : entries(kept, levels.length, spend)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/** The tab's file with its body replaced; its frontmatter, title and top comment stay unless the import brings its own title or comment. */
export function replaceContent(current: string, imported: string): string {
  const { body } = frontmatter(current)
  const top = current.slice(0, current.length - body.length)
  // A file that ends at the closing --- would glue the body to it.
  const front = top && !top.endsWith('\n') ? `${top}\n` : top
  const next = frontmatter(imported).body
  if (/^\s*(#\s|<!--)/.test(next)) return front + next
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  let inside = false
  let end = 0
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    if (inside || line.startsWith('<!--')) inside = !line.includes('-->')
    else if (line && !/^#\s/.test(line)) break
    end = i + 1
  }
  const head = lines.slice(0, end).join('\n').trim()
  return front + (head ? `${head}\n\n${next}` : next)
}

/** The current file, a blank line, then the import's body without its frontmatter and `# Title` line. */
export function mergeContent(current: string, imported: string): string {
  const body = frontmatter(imported).body.replace(/^\s*#[ \t][^\n]*(?:\n|$)/, '').trim()
  return body ? `${current.trimEnd()}\n\n${body}\n` : current
}
