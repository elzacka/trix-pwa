// Key combinations as written in a shortcut list, shown the way each system names them.

export type Os = 'mac' | 'windows'
export type KeyPart = { keys: string } | { text: string }

const ALIASES: Record<string, string> = {
  ctrl: 'ctrl', control: 'ctrl', '⌃': 'ctrl',
  shift: 'shift', '⇧': 'shift',
  alt: 'alt', opt: 'alt', option: 'alt', '⌥': 'alt',
  cmd: 'cmd', command: 'cmd', '⌘': 'cmd',
  mod: 'mod', cmdorctrl: 'mod',
  win: 'win', windows: 'win', super: 'win', '⊞': 'win',
  fn: 'fn', '🌐': 'fn',
  mellomrom: 'space', space: 'space',
  retur: 'enter', enter: 'enter', return: 'enter', '↩': 'enter',
  tab: 'tab', '⇥': 'tab',
  esc: 'esc', escape: 'esc', '⎋': 'esc',
  slett: 'backspace', backspace: 'backspace', '⌫': 'backspace',
  delete: 'delete', del: 'delete', '⌦': 'delete',
  venstre: 'left', left: 'left', '←': 'left',
  høyre: 'right', right: 'right', '→': 'right',
  opp: 'up', up: 'up', '↑': 'up',
  ned: 'down', down: 'down', '↓': 'down',
}

const NAMES: Record<Os, Record<string, string>> = {
  mac: {
    ctrl: '⌃', shift: '⇧', alt: '⌥', cmd: '⌘', win: 'Win', fn: 'fn', space: 'Mellomrom', enter: '↩',
    tab: '⇥', esc: 'esc', backspace: '⌫', delete: '⌦', left: '←', right: '→', up: '↑', down: '↓',
  },
  windows: {
    ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', cmd: '⌘', win: 'Win', fn: 'Fn', space: 'Mellomrom',
    enter: 'Enter', tab: 'Tab', esc: 'Esc', backspace: 'Backspace', delete: 'Delete', left: '←',
    right: '→', up: '↑', down: '↓',
  },
}

const MODIFIERS = new Set(['ctrl', 'shift', 'alt', 'cmd', 'win', 'fn'])
const MAC_SYMBOL = /^[⌘⇧⌥⌃]/u

/** «ctrl+shift S», «⌘⇧S» → ['ctrl', 'shift', 'S']. */
function tokens(combo: string): string[] {
  const out: string[] = []
  for (const chunk of combo.trim().split(/\s+/).filter(Boolean)) {
    const parts = chunk === '+' ? ['+'] : chunk.split(/\+(?=.)/).map(p => (p === '' ? '+' : p))
    for (let part of parts) {
      while (MAC_SYMBOL.test(part) && part.length > 1) {
        out.push(part[0])
        part = part.slice(1)
      }
      if (part) out.push(part)
    }
  }
  return out
}

function keyName(token: string, os: Os): { id: string; name: string } {
  let id = ALIASES[token.toLowerCase()] ?? token
  if (id === 'mod') id = os === 'mac' ? 'cmd' : 'ctrl'
  const named = NAMES[os][id]
  if (named) return { id, name: named }
  const name = token.length === 1 || /^f\d{1,2}$/i.test(token) ? token.toUpperCase() : token
  return { id: name, name }
}

/** One combination as the system writes it: «⌘⇧S» on a Mac, «Ctrl+Shift+S» on Windows. */
export function formatCombo(combo: string, os: Os): string {
  const names = tokens(combo).map(t => keyName(t, os))
  if (os === 'mac') return names.map((k, i) => (MODIFIERS.has(k.id) || i === names.length - 1 ? k.name : `${k.name} `)).join('')
  return names.map(k => k.name).join('+')
}

/** The same combination however it is written: modifiers in a fixed order, names lowercased. */
export function comboKey(combo: string, os: Os): string {
  const ids = tokens(combo).map(t => keyName(t, os).id.toLowerCase())
  return [...ids.filter(id => MODIFIERS.has(id)).sort(), ...ids.filter(id => !MODIFIERS.has(id))].join(' ')
}

const CODE_NAMES: Record<string, string> = {
  Space: 'space', Enter: 'enter', Tab: 'tab', Escape: 'esc', Backspace: 'backspace', Delete: 'delete',
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
}
// With shift or alt the character changes, so the key's place names it.
const PUNCTUATION: Record<string, string> = {
  Period: '.', Comma: ',', Minus: '-', Equal: '=', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'",
  BracketLeft: '[', BracketRight: ']', Backquote: '`', IntlBackslash: '<',
}

type KeyEvent = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

/** A pressed combination as the system writes it, in the order its menus use; null while only modifiers are down. */
export function pressedCombo(e: KeyEvent, os: Os): string | null {
  const key = /^(Key[A-Z]|Digit\d)$/.test(e.code) ? e.code.at(-1)
    : /^F\d+$/.test(e.code) ? e.code
    : (CODE_NAMES[e.code] ?? (e.key.length === 1 && !e.shiftKey && !e.altKey ? e.key : PUNCTUATION[e.code]))
  if (!key) return null
  const mods = os === 'mac'
    ? [e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift', e.metaKey && 'cmd']
    : [e.metaKey && 'win', e.ctrlKey && 'ctrl', e.altKey && 'alt', e.shiftKey && 'shift']
  return formatCombo([...mods, key].filter(Boolean).join(' '), os)
}

const ALTERNATIVE_LIMIT = 20
const PART_LIMIT = 40

const QUOTED = /"([^"]+)"|«([^»]+)»/g

/** A cell of a shortcut list: alternatives split on «eller», quoted words kept as text. */
export function keyParts(cell: string, os: Os): KeyPart[][] {
  const alternatives = cell.split(/\s+eller\s+/i)
  // Real cells hold a few alternatives; a crafted one with thousands shows as text.
  if (alternatives.length > ALTERNATIVE_LIMIT || (cell.match(QUOTED)?.length ?? 0) > PART_LIMIT) return [[{ text: cell }]]
  return alternatives
    .map(alternative => {
      const parts: KeyPart[] = []
      let at = 0
      for (const match of alternative.matchAll(QUOTED)) {
        const before = alternative.slice(at, match.index).trim()
        if (before) parts.push({ keys: formatCombo(before, os) })
        parts.push({ text: match[1] ?? match[2] })
        at = match.index + match[0].length
      }
      const rest = alternative.slice(at).trim()
      if (rest) parts.push({ keys: formatCombo(rest, os) })
      return parts
    })
    .filter(parts => parts.length)
}

export function currentOs(): Os {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.userAgent
  return /mac|iphone|ipad/i.test(platform) ? 'mac' : 'windows'
}
