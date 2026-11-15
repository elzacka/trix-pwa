// Oppsett.md: the app's name, tab order, colours, font and texts, as YAML at the top.

import { parseDocument } from 'yaml'
import * as v from 'valibot'
import { frontmatter, isFileName } from './text'
import { TEXTS, type TextKey } from './texts'

export const SETUP_FILE = 'Oppsett.md'

export const COLORS = ['bakgrunn', 'flate', 'linje', 'tekst', 'dempet', 'aksent', 'lenke', 'forside', 'bakside'] as const
export type ColorName = (typeof COLORS)[number]
export type Pair = { light: string; dark: string }

export const DEFAULT_COLORS: Record<ColorName, Pair> = {
  bakgrunn: { light: '#f8fafc', dark: '#111418' },
  flate: { light: '#ffffff', dark: '#1a1e23' },
  linje: { light: '#e2e8f0', dark: '#2b3138' },
  tekst: { light: '#1e293b', dark: '#e5e7eb' },
  dempet: { light: '#5a687c', dark: '#9aa3ae' },
  aksent: { light: '#00466a', dark: '#7598ad' },
  lenke: { light: '#1261a8', dark: '#58a6ff' },
  forside: { light: '#1e293b', dark: '#1a1e23' },
  bakside: { light: '#00466a', dark: '#7598ad' },
}

export const FONT_SIZE = [12, 24] as const

/** Light, dark, or as the device: light unless the user chooses otherwise. */
export const MODES = ['lys', 'mørk', 'system'] as const
export type Mode = (typeof MODES)[number]

export interface Setup {
  name: string
  order: string[]
  colors: Record<ColorName, Pair>
  mode: Mode
  font: string | null
  size: number
  texts: Record<TextKey, string>
  problems: string[]
}

export function defaultSetup(): Setup {
  return { name: TEXTS.navn, order: [], colors: structuredClone(DEFAULT_COLORS), mode: 'lys', font: null, size: 16, texts: { ...TEXTS }, problems: [] }
}

/** Characters a colour can hold; the browser checks the value itself before using it. */
const COLOR = /^[#\p{L}\p{N}\s(),.%/+-]{1,60}$/u

// A colour must be one: var(), attr(), env(), light-dark() and keywords pass CSS.supports but defeat the contrast check.
const INDIRECT = /\b(var|attr|env|light-dark)\s*\(|^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i
const valid = (value: string) => COLOR.test(value) && !INDIRECT.test(value)

/** «#fff / #000» → light and dark; one value serves both. The split ignores slashes inside brackets. */
export function colorPair(value: string): Pair | null {
  let depth = 0
  let split = -1
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    else if (value[i] === ')') depth--
    else if (value[i] === '/' && depth === 0) split = i
  }
  const [light, dark] = split < 0 ? [value, value] : [value.slice(0, split), value.slice(split + 1)]
  const pair = { light: light.trim(), dark: dark.trim() }
  return valid(pair.light) && valid(pair.dark) ? pair : null
}

export const FONT = /^[\p{L}\p{N} _-]{1,60}$/u

/** Each key on its own, so one bad value never drops the rest; a problem names the key and its line. */
export function parseSetup(text: string): Setup {
  const setup = defaultSetup()
  const { yaml } = frontmatter(text)
  if (yaml === null) {
    if (text.trim()) setup.problems.push(`${SETUP_FILE}: Toppen av fila mangler, så appen bruker standardoppsettet`)
    return setup
  }
  const doc = parseDocument(yaml, { prettyErrors: false })
  if (doc.errors.length) {
    setup.problems.push(`${SETUP_FILE}, linje ${lineOf(yaml, doc.errors[0].pos[0]) + 2}: Kan ikke leses, så appen bruker standardoppsettet`)
    return setup
  }
  const data = doc.toJS() as Record<string, unknown> | null
  if (!data || typeof data !== 'object') return setup
  const problem = (key: string) => {
    const node = doc.getIn(key.split('.'), true) as { range?: number[] } | undefined
    const line = node?.range ? lineOf(yaml, node.range[0]) + 2 : null
    setup.problems.push(`${SETUP_FILE}${line ? `, linje ${line}` : ''}: «${key}» har en ugyldig verdi og blir ikke brukt`)
  }

  const name = v.safeParse(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(40)), data.navn)
  if (data.navn !== undefined) name.success ? (setup.name = name.output) : problem('navn')
  setup.texts.navn = setup.name

  if (data.faner !== undefined) {
    const order = v.safeParse(v.array(v.string()), data.faner)
    if (order.success && order.output.every(f => isFileName(f))) setup.order = order.output
    else problem('faner')
  }

  if (data.farger !== undefined) {
    const colors = data.farger
    if (colors && typeof colors === 'object') {
      for (const [key, value] of Object.entries(colors)) {
        const pair = typeof value === 'string' && (COLORS as readonly string[]).includes(key) ? colorPair(value) : null
        if (pair) setup.colors[key as ColorName] = pair
        else problem(`farger.${key}`)
      }
    } else problem('farger')
  }

  if (data.modus !== undefined) (MODES as readonly unknown[]).includes(data.modus) ? (setup.mode = data.modus as Mode) : problem('modus')

  const skrift = data.skrift as Record<string, unknown> | undefined
  if (skrift !== undefined) {
    if (skrift && typeof skrift === 'object') {
      if (skrift.tekst !== undefined) typeof skrift.tekst === 'string' && FONT.test(skrift.tekst) ? (setup.font = skrift.tekst) : problem('skrift.tekst')
      if (skrift.størrelse !== undefined) {
        const size = v.safeParse(v.pipe(v.number(), v.integer(), v.minValue(FONT_SIZE[0]), v.maxValue(FONT_SIZE[1])), skrift.størrelse)
        size.success ? (setup.size = size.output) : problem('skrift.størrelse')
      }
    } else problem('skrift')
  }

  const texts = data.tekster as Record<string, unknown> | undefined
  if (texts !== undefined) {
    if (texts && typeof texts === 'object') {
      for (const [key, value] of Object.entries(texts)) {
        if (Object.hasOwn(TEXTS, key) && key !== 'navn' && typeof value === 'string' && value.trim() && value.length <= 200) setup.texts[key as TextKey] = value.trim()
        else problem(`tekster.${key}`)
      }
    } else problem('tekster')
  }
  return setup
}

const lineOf = (text: string, offset: number) => text.slice(0, offset).split('\n').length - 1
