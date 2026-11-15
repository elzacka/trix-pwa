// The app's state: the folder, the parsed files and what each tab shows.

import { tick } from 'svelte'
import { parseTab, type Module, type Tab } from './content'
import { currentOs } from './keys'
import { linkKind } from './markdown'
import { defaultSetup, parseSetup, SETUP_FILE, type Setup } from './setup'
import {
  browserFolder, Changed, Folder, forgetFolder, loadFolder, permission, pickFolder, saveFolder, watch, type FileText, type Kind, type Saved,
} from './storage'
import { SETUP_TEMPLATE, STARTER, template } from './templates'
import { fill, isFileName, plain } from './text'
import type { TextKey } from './texts'
import { applyTheme } from './theme'
import { emptyView, findAnchor, type View } from './view'
import { makeBackup, readBackup, download } from './backup'
import { importable, importText, mergeContent, replaceContent } from './import'
import { setupChanged, tabChanged, writeSetup, writeTab, type Draft } from './customize'

type Phase = 'loading' | 'start' | 'reconnect' | 'ready'

interface Mark {
  tab: number
  views: View[]
  scroll: number
  place: string
}

export interface Editing {
  name: string
  original: string
  /** What the editor starts with, when not the file as read: an import. */
  text?: string
}

class App {
  phase = $state<Phase>('loading')
  kind = $state<Kind | null>(null)
  setup = $state.raw<Setup>(defaultSetup())
  tabs = $state.raw<Tab[]>([])
  views = $state<View[]>([])
  current = $state(0)
  problems = $state.raw<string[]>([])
  error = $state('')
  trail = $state<Mark[]>([])
  editing = $state.raw<Editing | null>(null)
  customizing = $state(false)
  moving = $state(false)
  update = $state.raw<(() => void) | null>(null)
  readonly os = currentOs()

  private folder: Folder | null = null
  private saved: Saved | null = null
  private files = new Map<string, FileText>()
  private loading: Promise<void> | null = null
  private unwatch: (() => void) | null = null
  private again: Promise<void> | null = null

  t = (key: TextKey, values: Record<string, string | number> = {}) => fill(this.setup.texts[key], { navn: this.setup.name, ...values })

  get tab(): Tab | undefined {
    return this.tabs[this.current]
  }

  get view(): View {
    return this.views[this.current] ?? emptyView()
  }

  async start() {
    try {
      this.saved = (await loadFolder()) ?? null
    } catch {
      this.saved = null
    }
    if (!this.saved) return void (this.phase = 'start')
    const state = await permission(this.saved.dir, false).catch(() => 'denied' as const)
    if (state === 'granted') await this.open(this.saved)
    else this.phase = 'reconnect'
  }

  /** From a button: the picker and the permission prompt need the user's click. */
  async choose(kind: Kind) {
    this.error = ''
    try {
      const dir = kind === 'mappe' ? await pickFolder() : await browserFolder()
      this.saved = { dir, kind }
      await saveFolder(this.saved)
      await this.open(this.saved)
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      // Safari refuses its private folder in private browsing, with an unhelpful error.
      this.error = kind === 'nettleser' ? 'Nettleseren lar ikke Trix lagre filer. Det skjer blant annet i privat nettlesing. Åpne Trix i et vanlig vindu og prøv på nytt.' : String(error)
    }
  }

  async reconnect() {
    if (!this.saved) return
    const state = await permission(this.saved.dir, true).catch(() => 'denied' as const)
    if (state === 'granted') await this.open(this.saved)
  }

  async switchFolder() {
    await forgetFolder()
    this.unwatch?.()
    this.unwatch = null
    this.folder = null
    this.saved = null
    this.files = new Map()
    this.tabs = []
    this.views = []
    this.trail = []
    this.phase = 'start'
  }

  private async open(saved: Saved) {
    this.folder = new Folder(saved.dir, saved.kind)
    this.kind = saved.kind
    this.files = new Map()
    try {
      await this.seed()
      await this.load()
      this.phase = 'ready'
      this.unwatch?.()
      // An open editor or form keeps its text.
      this.unwatch = watch(saved.dir, () => !this.editing && !this.customizing && void this.load().catch(error => (this.error = String(error))))
    } catch (error) {
      this.error = String(error)
      this.phase = 'start'
    }
  }

  /** Files are the user's: written only when missing. */
  private async seed() {
    const folder = this.folder!
    const names = await folder.list()
    if (!names.includes(SETUP_FILE)) await folder.write(SETUP_FILE, SETUP_TEMPLATE, null)
    if (!names.some(n => n !== SETUP_FILE)) {
      for (const [file, module] of Object.entries(STARTER)) await folder.write(file, template(module, file.replace(/\.md$/, '')), null)
    }
  }

  /** Reads what changed on disk and parses it again; one load at a time, and a call during one reads once more after it. */
  load(): Promise<void> {
    if (this.loading) {
      this.again ??= this.loading.then(() => {
        this.again = null
        return this.load()
      })
      return this.again
    }
    this.loading = this.read().finally(() => (this.loading = null))
    return this.loading
  }

  private async read() {
    const folder = this.folder
    if (!folder) return
    const problems: string[] = []
    const names = await folder.list()
    let changed = names.length !== this.files.size
    const next = new Map<string, FileText>()
    for (const name of names) {
      try {
        const file = await folder.read(name)
        const old = this.files.get(name)
        if (old?.text !== file.text) changed = true
        next.set(name, file)
      } catch (error) {
        problems.push(`${name}: ${(error as Error).message}`)
      }
    }
    if (!changed && this.tabs.length) return
    this.files = next
    const setup = parseSetup(next.get(SETUP_FILE)?.text ?? '')
    problems.push(...setup.problems)
    const tabs: Tab[] = []
    for (const [name, { text }] of next) {
      if (name === SETUP_FILE) continue
      const result = parseTab(name, text)
      problems.push(...result.problems)
      if (result.tab) tabs.push(result.tab)
    }
    const rank = (file: string) => {
      const at = setup.order.findIndex(f => f.toLowerCase() === file.toLowerCase())
      return at < 0 ? setup.order.length : at
    }
    tabs.sort((a, b) => rank(a.file) - rank(b.file) || a.file.localeCompare(b.file, 'nb'))
    const kept = new Map(this.tabs.map((tab, i) => [tab.file, this.views[i]]))
    const currentFile = this.tab?.file
    this.setup = setup
    this.tabs = tabs
    this.views = tabs.map(tab => kept.get(tab.file) ?? emptyView())
    this.current = Math.max(0, tabs.findIndex(tab => tab.file === currentFile))
    problems.push(...applyTheme(setup))
    this.problems = problems
  }

  select(index: number) {
    if (!this.tabs[index]) return
    this.current = index
    this.moving = false
  }

  // Links: a web address goes to the browser; a place in the app leaves a mark to come back to.

  async follow(href: string) {
    const link = linkKind(href)
    if (link.kind !== 'app') return
    const target = link.file ? this.tabs.findIndex(tab => tab.file.toLowerCase() === link.file.toLowerCase()) : this.current
    const tab = this.tabs[target]
    if (!tab) return void (this.error = `Fant ikke fila ${link.file}`)
    const found = findAnchor(tab, link.anchor)
    if (!found) return void (this.error = `Fant ikke «${link.anchor}» i ${tab.name}`)
    this.trail.push({ tab: this.current, views: $state.snapshot(this.views), scroll: scroller()?.scrollTop ?? 0, place: this.place() })
    const view = emptyView()
    if (found.entry) {
      if (tab.module === 'steg') view.reading = found.entry.id
      else view.open = found.entry.id
    }
    this.views[target] = view
    this.current = target
    await tick()
    const scope = found.entry ? document.getElementById(`entry-${found.entry.id}`) : document
    const place = found.anchor ? (scope?.querySelector(`[data-anchor="${CSS.escape(found.anchor)}"]`) ?? scope) : scope
    if (place instanceof HTMLElement) {
      place.scrollIntoView({ block: 'start' })
      place.classList.add('landed')
      if (!place.matches('button, a, input, [tabindex]')) place.tabIndex = -1
      place.focus({ preventScroll: true })
    }
  }

  /** Where a link was followed from: the open entry or guide, else the tab. */
  private place(): string {
    const id = this.view.open ?? this.view.reading
    const entry = this.tab?.groups.flatMap(g => g.items).find(e => e.id === id)
    return entry ? plain(entry.title) : (this.tab?.name ?? '')
  }

  async back() {
    const mark = this.trail.pop()
    if (!mark) return
    this.views = mark.views
    this.current = mark.tab
    await tick()
    const panel = scroller()
    if (panel) panel.scrollTop = mark.scroll
  }

  stay() {
    this.trail = []
  }

  // Editing a file in the app.

  edit(name: string) {
    const file = this.files.get(name)
    if (file) this.editing = { name, original: file.text }
  }

  /** A file as content for the current tab, or null when it holds nothing the tab shows. */
  async readImport(file: File): Promise<{ merged: string; replaced: string; hasContent: boolean; original: string } | null> {
    const tab = this.tab
    const original = tab && this.files.get(tab.file)?.text
    if (!tab || original === undefined || !importable(file.name, file.size)) return null
    const imported = await importText(file.name, new Uint8Array(await file.arrayBuffer()), tab.module).catch(() => '')
    const count = (text: string) => {
      const parsed = parseTab(tab.file, text).tab
      return parsed ? [...parsed.groups, ...parsed.shortcuts].reduce((n, g) => n + g.items.length, 0) : 0
    }
    const replaced = replaceContent(original, imported)
    if (!count(replaced)) return null
    return { merged: mergeContent(original, imported), replaced, hasContent: count(original) > 0, original }
  }

  /** The editor with `text` built from `original`; «Lagre» writes it only while the file still holds `original`. */
  editWith(name: string, text: string, original: string) {
    this.editing = { name, original, text }
  }

  /** False when the file changed elsewhere since it was opened; nothing is written then. */
  async save(text: string): Promise<boolean> {
    const editing = this.editing
    if (!editing || !this.folder) return false
    try {
      await this.folder.write(editing.name, text, editing.original)
    } catch (error) {
      if (error instanceof Changed) return false
      throw error
    }
    this.editing = null
    await this.load()
    return true
  }

  /** Writes Oppsett.md and the tabs the form changed; false, with nothing written, when one of them changed elsewhere. */
  async customize(before: Draft, after: Draft): Promise<boolean> {
    const folder = this.folder!
    const writes: { name: string; text: string; original: string | null }[] = []
    if (setupChanged(before, after)) {
      const original = this.files.get(SETUP_FILE)?.text ?? null
      writes.push({ name: SETUP_FILE, text: writeSetup(original ?? '', before, after), original })
    }
    for (const tab of after.tabs) {
      const old = before.tabs.find(t => t.file === tab.file)
      const original = this.files.get(tab.file)?.text
      if (old && original !== undefined && tabChanged(old, tab)) writes.push({ name: tab.file, text: writeTab(original, tab), original })
    }
    for (const { name, original } of writes) {
      const now = (await folder.exists(name)) ? await folder.text(name) : null
      if (now !== original) return false
    }
    for (const { name, text, original } of writes) await folder.write(name, text, original)
    this.customizing = false
    await this.load()
    return true
  }

  /** Saves a move at once; the moved line, 1-based, or null when the file changed elsewhere and nothing moved. */
  async move(file: string, change: (text: string) => { text: string; line: number }): Promise<number | null> {
    const original = this.files.get(file)?.text
    if (original === undefined) return null
    const { text, line } = change(original)
    try {
      await this.folder!.write(file, text, original)
    } catch (error) {
      await this.load()
      if (!(error instanceof Changed)) throw error
      this.error = this.t('ikke flyttet')
      return null
    }
    await this.load()
    return line + 1
  }

  /** A new tab from a module's template, or from a ready-made list. */
  async addTab(name: string, module: Module, text = template(module, name.trim())): Promise<string | null> {
    const file = `${name.trim()}.md`
    if (!isFileName(file) || file.toLowerCase() === SETUP_FILE.toLowerCase()) return `«${name}» kan ikke være et filnavn`
    if (await this.folder!.exists(file)) return `Fila ${file} finnes allerede`
    await this.folder!.write(file, text.replaceAll('{navn}', name.trim()), null)
    await this.load()
    this.select(this.tabs.findIndex(tab => tab.file === file))
    return null
  }

  async backup() {
    const date = new Date().toISOString().slice(0, 10)
    download(await makeBackup(this.folder!), `trix-data-${date}.zip`)
  }

  /** Writes every file in the backup over the one with the same name. */
  async restore(file: File): Promise<number> {
    const files = readBackup(new Uint8Array(await file.arrayBuffer()))
    for (const [name, text] of files) {
      const current = (await this.folder!.exists(name)) ? await this.folder!.text(name) : null
      await this.folder!.write(name, text, current)
    }
    await this.load()
    return files.size
  }
}

const scroller = () => document.getElementById('panel')

export const app = new App()
