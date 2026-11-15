import { describe, expect, it } from 'vitest'
import { formatCombo, keyParts, pressedCombo } from '../src/lib/keys'

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
  it('reads a pressed combination by the key’s place', () => {
    const press = (code: string, key: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}) =>
      ({ code, key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods })
    expect(pressedCombo(press('KeyS', 'Í', { metaKey: true, altKey: true }), 'mac')).toBe('⌥⌘S')
    expect(pressedCombo(press('KeyS', 'S', { ctrlKey: true, shiftKey: true }), 'windows')).toBe('Ctrl+Shift+S')
    expect(pressedCombo(press('F5', 'F5'), 'windows')).toBe('F5')
    expect(pressedCombo(press('ShiftLeft', 'Shift', { shiftKey: true }), 'mac')).toBeNull()
  })
})
