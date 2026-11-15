// An in-memory FileSystemDirectoryHandle with the parts Folder uses.

export function fakeDir(files: Record<string, string> = {}): FileSystemDirectoryHandle {
  const store = new Map(Object.entries(files).map(([name, text]) => [name, { text, modified: 1 }]))
  const fileHandle = (name: string) => ({
    kind: 'file' as const,
    name,
    getFile: async () => {
      const file = store.get(name)!
      return { text: async () => file.text, lastModified: file.modified, size: new Blob([file.text]).size }
    },
    createWritable: async () => {
      let text = ''
      return {
        write: async (chunk: string) => void (text += chunk),
        close: async () => void store.set(name, { text, modified: (store.get(name)?.modified ?? 0) + 1 }),
      }
    },
  })
  const dir = {
    kind: 'directory',
    name: 'trix-data',
    async *entries() {
      for (const name of store.keys()) yield [name, fileHandle(name)]
    },
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!store.has(name)) {
        if (!options?.create) throw Object.assign(new Error('NotFound'), { name: 'NotFoundError' })
        store.set(name, { text: '', modified: 0 })
      }
      return fileHandle(name)
    },
  }
  return dir as unknown as FileSystemDirectoryHandle
}
