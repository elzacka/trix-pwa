import { describe, expect, it } from 'vitest'
import { formatCombo, keyParts } from '../src/lib/keys'

describe('keys', () => {
  it('names keys per system', () => {
    expect(formatCombo('ctrl shift S', 'windows')).toBe('Ctrl+Shift+S')
    expect(formatCombo('cmd shift S', 'mac')).toBe('⌘⇧S')
    expect(formatCombo('⌘⇧S', 'mac')).toBe('⌘⇧S')
    expect(formatCombo('mod E', 'windows')).toBe('Ctrl+E')
    expect(formatCombo('esc', 'mac')).toBe('esc')
  })
  it('splits alternatives and keeps quoted words as text', () => {
    expect(keyParts('esc eller ctrl W', 'windows')).toEqual([[{ keys: 'Esc' }], [{ keys: 'Ctrl+W' }]])
    expect(keyParts('"hold inne" ⌘W', 'mac')).toEqual([[{ text: 'hold inne' }, { keys: '⌘W' }]])
  })
})
