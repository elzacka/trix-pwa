// A backup is a zip of the folder's Markdown files; restoring writes them back.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { doc } from './pip.svelte'
import { isFileName } from './text'
import { FILE_LIMIT, type Folder } from './storage'

const LIMIT = { files: 500, bytes: 20 * 1024 * 1024 }

export async function makeBackup(folder: Folder): Promise<Blob> {
  const files = new Map<string, string>()
  for (const name of await folder.list()) files.set(name, await folder.text(name))
  return zipFiles(files)
}

/** Files as a zip in the shape a backup has: `trix-data/<name>`. */
export function zipFiles(files: Map<string, string>): Blob {
  const entries: Record<string, Uint8Array> = {}
  for (const [name, text] of files) entries[`trix-data/${name}`] = strToU8(text)
  return new Blob([zipSync(entries) as Uint8Array<ArrayBuffer>], { type: 'application/zip' })
}

/** The Markdown files in a backup, by plain name; anything else, or too much, is left out. */
export function readBackup(bytes: Uint8Array): Map<string, string> {
  let count = 0
  let total = 0
  const entries = unzipSync(bytes, {
    filter: file => {
      const name = file.name.split('/').pop() ?? ''
      if (!isFileName(name) || file.originalSize > FILE_LIMIT || ++count > LIMIT.files || (total += file.originalSize) > LIMIT.bytes) return false
      return true
    },
  })
  return new Map(Object.entries(entries).map(([path, data]) => [path.split('/').pop()!, strFromU8(data)]))
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  // From the document the app is in, so a download from the floating window starts there and not behind it.
  const link = Object.assign(doc().createElement('a'), { href: url, download: name })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
