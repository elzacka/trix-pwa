import { describe, expect, it } from 'vitest'
import { Changed, Folder } from '../src/lib/storage'
import { makeBackup, readBackup } from '../src/lib/backup'
import { fakeDir } from './fakefs'

describe('storage', () => {
  it('writes only over the text it read', async () => {
    const folder = new Folder(fakeDir({ 'A.md': 'en' }), 'nettleser')
    await folder.write('A.md', 'to', 'en')
    expect((await folder.read('A.md')).text).toBe('to')
    await expect(folder.write('A.md', 'tre', 'en')).rejects.toBeInstanceOf(Changed)
    await expect(folder.write('A.md', 'ny', null)).rejects.toBeInstanceOf(Changed)
    await expect(folder.write('../B.md', 'x', null)).rejects.toThrow('Ugyldig filnavn')
  })
  it('keeps Windows line endings in a file that has them', async () => {
    const folder = new Folder(fakeDir({ 'A.md': 'a\r\nb' }), 'mappe')
    await folder.write('A.md', 'a\nc', 'a\r\nb')
    expect((await folder.read('A.md')).text).toBe('a\r\nc')
  })
  it('a backup restores the same files, and nothing else', async () => {
    const folder = new Folder(fakeDir({ 'A.md': 'æøå', 'B.md': 'b' }), 'nettleser')
    const files = readBackup(new Uint8Array(await (await makeBackup(folder)).arrayBuffer()))
    expect([...files]).toEqual([['A.md', 'æøå'], ['B.md', 'b']])
  })
})
