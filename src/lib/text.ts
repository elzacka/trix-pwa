// Plain text, slugs and sorting shared by the parsers and the views.

// Bounded, so a crafted run of `[a](` stays linear.
const LINK = /\[([^\][]{0,500})\]\(([^()\s]{0,2048})\)/g

/** Markdown inline markup removed: links become their label. */
export function plain(text: string): string {
  return text
    .replace(LINK, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\([|\\*`#[\]])/g, '$1')
    .trim()
}

/** The anchor a link names: lowercase, punctuation removed, spaces as hyphens. */
export const slug = (text: string): string =>
  plain(text).toLocaleLowerCase('nb').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-')

export const collator = new Intl.Collator('nb')

export const byTitle = <T extends { title: string }>(a: T, b: T) => collator.compare(plain(a.title), plain(b.title))

/** `{name}` in a text replaced by its value. */
export const fill = (text: string, values: Record<string, string | number> = {}) =>
  text.replace(/\{([^}]+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all))

/** A plain file name in the data folder: no path, no leading dot. */
export const isFileName = (name: string, extensions = ['.md']) =>
  /^[^\\/:*?"<>|.][^\\/:*?"<>|]*$/.test(name) && extensions.some(e => name.toLowerCase().endsWith(e)) && name.length <= 120

/** Splits YAML frontmatter from the body; `bodyLine` is the body's first line number, 1-based. */
export function frontmatter(text: string): { yaml: string | null; body: string; bodyLine: number } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  if (!match) return { yaml: null, body: text, bodyLine: 1 }
  return { yaml: match[1], body: text.slice(match[0].length), bodyLine: match[0].split('\n').length }
}

/** Lines with HTML comments blanked out, so line numbers stay. */
export function withoutComments(lines: string[]): string[] {
  let inside = false
  return lines.map(line => {
    let out = ''
    let rest = line
    while (rest) {
      if (inside) {
        const end = rest.indexOf('-->')
        if (end < 0) return out
        inside = false
        rest = rest.slice(end + 3)
      } else {
        const start = rest.indexOf('<!--')
        if (start < 0) return out + rest
        out += rest.slice(0, start)
        inside = true
        rest = rest.slice(start + 4)
      }
    }
    return out
  })
}
