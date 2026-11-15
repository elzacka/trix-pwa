// The data folder: a folder the user picked (File System Access) or the browser's own (OPFS).
// Both give a FileSystemDirectoryHandle, so reading and writing are the same code.

import { isFileName } from './text'

export const FOLDER_NAME = 'trix-data'
export type Kind = 'mappe' | 'nettleser'

export class Changed extends Error {}

export interface FileText {
  text: string
  modified: number
}

export class Folder {
  constructor(
    readonly dir: FileSystemDirectoryHandle,
    readonly kind: Kind,
  ) {}

  /** The Markdown files directly in the folder, by name. */
  async list(): Promise<string[]> {
    const names: string[] = []
    for await (const [name, handle] of this.dir.entries()) {
      if (handle.kind === 'file' && isFileName(name)) names.push(name)
    }
    return names.sort()
  }

  async read(name: string): Promise<FileText> {
    const file = await (await this.file(name)).getFile()
    return { text: await file.text(), modified: file.lastModified }
  }

  async exists(name: string): Promise<boolean> {
    try {
      await this.file(name)
      return true
    } catch {
      return false
    }
  }

  /** Writes only while the file still holds `original` (null: must not exist), so an edit made elsewhere survives. */
  async write(name: string, text: string, original: string | null): Promise<void> {
    if (!isFileName(name)) throw new Error(`Ugyldig filnavn: ${name}`)
    if (original === null ? await this.exists(name) : (await this.read(name)).text !== original) throw new Changed(name)
    const handle = await this.dir.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(original?.includes('\r\n') ? text.replace(/\r?\n/g, '\r\n') : text)
    await writable.close()
  }

  private file(name: string) {
    if (!isFileName(name)) throw new Error(`Ugyldig filnavn: ${name}`)
    return this.dir.getFileHandle(name)
  }
}

export const canPickFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

/** The user picks where the files live, Documents first; the app uses or makes `trix-data` there. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const picked = await (window as unknown as { showDirectoryPicker(o: object): Promise<FileSystemDirectoryHandle> })
    .showDirectoryPicker({ id: FOLDER_NAME, mode: 'readwrite', startIn: 'documents' })
  return picked.name === FOLDER_NAME ? picked : picked.getDirectoryHandle(FOLDER_NAME, { create: true })
}

/** The browser's private folder; asks the browser to keep it when space runs low. */
export async function browserFolder(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  await navigator.storage.persist?.().catch(() => false)
  return root.getDirectoryHandle(FOLDER_NAME, { create: true })
}

type Permission = 'granted' | 'prompt' | 'denied'
type Permitted = FileSystemDirectoryHandle & {
  queryPermission?(o: object): Promise<Permission>
  requestPermission?(o: object): Promise<Permission>
}

export async function permission(dir: FileSystemDirectoryHandle, ask: boolean): Promise<Permission> {
  const handle = dir as Permitted
  if (!handle.queryPermission) return 'granted'
  const state = await handle.queryPermission({ mode: 'readwrite' })
  return state === 'prompt' && ask && handle.requestPermission ? handle.requestPermission({ mode: 'readwrite' }) : state
}

// The chosen folder survives a restart: its handle in IndexedDB.

const DB = 'trix'
const STORE = 'mappe'

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const request = run(database.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).finally(() => database.close()) as Promise<T>
}

export type Saved = { dir: FileSystemDirectoryHandle; kind: Kind }

export const saveFolder = (saved: Saved) => transact('readwrite', s => s.put(saved, 'valgt'))
export const loadFolder = () => transact<Saved | undefined>('readonly', s => s.get('valgt'))
export const forgetFolder = () => transact('readwrite', s => s.delete('valgt'))
