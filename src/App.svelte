<script lang="ts">
  import { tick } from 'svelte'
  import { app } from './lib/app.svelte'
  import { IMPORT_TYPES } from './lib/import'
  import { pressedCombo } from './lib/keys'
  import { canFloat, doc, float, pip } from './lib/pip.svelte'
  import { count, entryGroups, has, shortcutGroups } from './lib/view'
  import AddTab from './components/AddTab.svelte'
  import Cards from './components/Cards.svelte'
  import Customize from './components/Customize.svelte'
  import Editor from './components/Editor.svelte'
  import Guides from './components/Guides.svelte'
  import Library from './components/Library.svelte'
  import Icon from './components/Icon.svelte'
  import Lookup from './components/Lookup.svelte'
  import Move from './components/Move.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import Start from './components/Start.svelte'

  let menu = $state<HTMLElement>()
  let addDialog = $state<HTMLDialogElement>()
  let restoreInput = $state<HTMLInputElement>()
  let importInput = $state<HTMLInputElement>()
  let importDialog = $state<HTMLDialogElement>()
  let importing = $state<{ file: string; merged: string; replaced: string; original: string } | null>(null)
  let dropping = $state(false)
  let notice = $state('')
  let capturing = $state(false)

  const tab = $derived(app.tabs[app.current])
  const view = $derived(app.views[app.current])
  const reading = $derived(tab?.module === 'steg' && view?.reading != null)
  const searchable = $derived(tab && has(tab, 'søk') && !reading && !app.moving)
  const movable = $derived(tab && !has(tab, 'a–å') && (tab.module === 'hurtigtaster' ? tab.shortcuts : tab.groups).some(g => g.items.length))
  const results = $derived(
    !tab || !view || (!view.query.trim() && !view.tags.length) ? null : tab.module === 'hurtigtaster' ? count(shortcutGroups(tab, view, app.os)) : count(entryGroups(tab, view)),
  )
  const messages = $derived([...app.problems, app.error, notice].filter(Boolean))

  function run(action: () => unknown) {
    menu?.hidePopover()
    app.error = ''
    notice = ''
    Promise.resolve(action()).catch(error => (app.error = String(error)))
  }

  async function restore(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    // The floating window's own prompt: the main window's would open behind it.
    const ok = (pip.window ?? window).confirm('Filene i sikkerhetskopien erstatter filene med samme navn i trix-data. Vil du fortsette?')
    if (ok) notice = `Hentet ${await app.restore(file)} filer fra sikkerhetskopien`
    ;(event.target as HTMLInputElement).value = ''
  }

  /** The result opens in the editor, and the file changes only on «Lagre». */
  async function readImport(file: File) {
    const tab = app.tab
    if (!tab) return
    const result = await app.readImport(file)
    if (!result) return void (app.error = app.t('passer ikke', { fil: file.name, fane: tab.name }))
    if (!result.hasContent) return app.editWith(tab.file, result.replaced, result.original)
    importing = { file: file.name, ...result }
    importDialog?.showModal()
  }

  function finishImport(how: 'merged' | 'replaced' | null) {
    const tab = app.tab
    if (how && importing && tab) app.editWith(tab.file, importing[how], importing.original)
    importDialog?.close()
  }

  const canDrop = () => app.phase === 'ready' && !!app.tab && !app.editing && !app.customizing && !app.library && !doc().querySelector('dialog[open]')
  const files = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

  // Anything else dropped, such as a link, would make the browser leave the app and lose unsaved text.
  const editable = (event: DragEvent) => (event.target as Element).closest?.('input, textarea')

  function dragover(event: DragEvent) {
    if (!files(event)) {
      if (!editable(event)) {
        event.preventDefault()
        event.dataTransfer!.dropEffect = 'none'
      }
      return
    }
    event.preventDefault()
    event.dataTransfer!.dropEffect = canDrop() ? 'copy' : 'none'
    dropping = canDrop()
  }

  const dragleave = (event: DragEvent) => !event.relatedTarget && (dropping = false)

  /** A file dropped on a tab goes into that tab; anywhere else, into the tab shown. */
  async function drop(event: DragEvent) {
    if (!files(event)) return void (!editable(event) && event.preventDefault())
    event.preventDefault()
    dropping = false
    const file = event.dataTransfer?.files[0]
    if (!file || !canDrop()) return
    const target = (event.target as Element).closest?.('[role="tab"]')
    if (target) app.select(Number(target.id.slice('tab-'.length)))
    app.error = ''
    await readImport(file).catch(error => (app.error = String(error)))
  }

  async function selectTab(index: number) {
    app.select(index)
    await tick()
    doc().getElementById(`tab-${app.current}`)?.focus()
  }

  function tabKeys(event: KeyboardEvent) {
    const last = app.tabs.length - 1
    const to = { ArrowRight: app.current + 1, ArrowLeft: app.current - 1, Home: 0, End: last }[event.key]
    if (to === undefined) return
    event.preventDefault()
    selectTab(to < 0 ? last : to > last ? 0 : to)
  }

  function clearSearch() {
    view.query = ''
    view.tags = []
    doc().getElementById('query')?.focus()
  }

  /** The next combination pressed becomes the search; a plain Esc stops. Combinations the browser keeps never arrive. */
  function capture(event: KeyboardEvent) {
    event.preventDefault()
    const stop = event.key === 'Escape' && !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
    const combo = stop ? null : pressedCombo(event, app.os)
    if (!stop && !combo) return
    capturing = false
    if (combo) {
      view.query = combo
      view.open = null
    }
    doc().getElementById('query')?.focus()
  }

  async function startMoving() {
    app.moving = true
    await tick()
    doc().getElementById('done')?.focus()
  }

  /** Esc closes the innermost thing that is open. */
  function keydown(event: KeyboardEvent) {
    // While the app floats, the main window shows only the way back.
    if (event.currentTarget !== (pip.window ?? window)) return
    if (app.library && event.key === 'Escape' && !event.defaultPrevented && !doc().querySelector('dialog[open]')) return app.closeLibrary()
    if (app.phase !== 'ready' || app.editing || app.customizing || app.library || doc().querySelector('dialog[open]')) return
    if (capturing) return capture(event)
    const mod = app.os === 'mac' ? event.metaKey : event.ctrlKey
    if (mod && /^[1-9]$/.test(event.key)) {
      event.preventDefault()
      selectTab(Number(event.key) - 1)
    } else if (mod && event.key.toLowerCase() === 'f' && searchable) {
      event.preventDefault()
      doc().getElementById('query')?.focus()
    } else if (mod && event.key.toLowerCase() === 'e' && tab) {
      event.preventDefault()
      app.edit(tab.file)
    } else if (event.key === 'Escape' && view && !event.defaultPrevented) {
      if (app.moving) app.moving = false
      else if (app.trail.length) app.back()
      else if (view.reading) view.reading = null
      else if (view.open) view.open = null
      else if (view.tags.length || view.query) clearSearch()
    }
  }

  // The files are the user's: read them again when the app comes back into view.
  const reload = () => app.phase === 'ready' && !app.editing && !app.customizing && app.load().catch(error => (app.error = String(error)))

  // trix.tazk.no/#maler and #maler/<pakke> open the library once a folder is open.
  function openLink() {
    const link = /^#maler(?:\/([\w-]+))?$/.exec(location.hash)
    if (link && app.phase === 'ready') app.library = { pack: link[1] ?? null }
  }
  $effect(() => {
    if (app.phase === 'ready') openLink()
  })

  // In the floating window, keys, focus and drops reach that window, not this one.
  $effect(() => {
    const win = pip.window
    if (!win) return
    const handlers = { keydown, focus: reload, dragover, dragleave, drop } as Record<string, (event: never) => unknown>
    for (const [name, handler] of Object.entries(handlers)) win.addEventListener(name, handler as EventListener)
    return () => { for (const [name, handler] of Object.entries(handlers)) win.removeEventListener(name, handler as EventListener) }
  })
</script>

<svelte:window onhashchange={openLink} onkeydown={keydown} onfocus={reload} ondragover={dragover} ondragleave={dragleave} ondrop={drop} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'visible' && reload()} />

{#if app.phase === 'start' || app.phase === 'reconnect'}
  <Start />
{:else if app.phase === 'ready'}
  {#if app.editing}
    <Editor editing={app.editing} />
  {:else if app.customizing}
    <Customize />
  {:else if app.library}
    <Library />
  {:else}
    <header class="bar">
      <img src="{import.meta.env.BASE_URL}favicon.svg" alt="" class="logo" />
      {#if app.tabs.length > 1}
        <div class="tabs" role="tablist" aria-label={app.t('faner')} tabindex="-1" onkeydown={tabKeys}>
          {#each app.tabs as t, i (t.file)}
            <button type="button" role="tab" id="tab-{i}" aria-controls="panel" aria-selected={i === app.current} tabindex={i === app.current ? 0 : -1} onclick={() => app.select(i)}>{t.name}</button>
          {/each}
        </div>
      {:else}
        <h1 class="single">{tab?.name ?? app.setup.name}</h1>
      {/if}
      <button type="button" class="icon-button more" popovertarget="menu" aria-label={app.t('meny')} title={app.t('meny')}><Icon name="more" /></button>
      <div id="menu" popover bind:this={menu}>
        <ul>
          {#if tab}<li><button type="button" onclick={() => run(() => app.edit(tab.file))}>{app.t('rediger', { fane: tab.name })}</button></li>{/if}
          {#if tab}<li><button type="button" onclick={() => run(() => importInput?.click())}>{app.t('hent fil')}</button></li>{/if}
          {#if movable}<li><button type="button" onclick={() => run(() => startMoving())}>{app.t('rekkefølge')}</button></li>{/if}
          <li><button type="button" onclick={() => run(() => addDialog?.showModal())}>{app.t('ny fane')}</button></li>
          <li><button type="button" onclick={() => run(() => (app.library = { pack: null }))}>{app.t('bibliotek')}</button></li>
          <li><button type="button" onclick={() => run(() => (app.customizing = true))}>{app.t('oppsett')}</button></li>
          {#if pip.window}<li><button type="button" onclick={() => run(() => pip.window?.close())}>{app.t('hovedvindu')}</button></li>
          {:else if canFloat}<li><button type="button" onclick={() => run(() => float(document.getElementById('app')!))}>{app.t('over andre')}</button></li>{/if}
          <li class="separator"><button type="button" onclick={() => run(() => app.backup())}>{app.t('eksporter')}</button></li>
          <li><button type="button" onclick={() => run(() => restoreInput?.click())}>{app.t('importer')}</button></li>
          <li><button type="button" onclick={() => run(() => app.switchFolder())}>{app.t('bytt mappe')}</button></li>
          <li><a href="https://github.com/elzacka/trix-pwa/blob/main/BRUKERVEILEDNING.md" target="_blank" rel="noopener noreferrer">{app.t('hjelp')}</a></li>
          <li class="version separator">v{__VERSION__} | elzacka</li>
        </ul>
      </div>
      <input type="file" accept=".zip,application/zip" hidden bind:this={restoreInput} onchange={restore} />
      <input type="file" accept={IMPORT_TYPES.join(',')} hidden bind:this={importInput}
        onchange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) readImport(file).catch(error => (app.error = String(error))) }} />
    </header>

    <main id="panel" class:dropping role={app.tabs.length > 1 ? 'tabpanel' : undefined} aria-labelledby={app.tabs.length > 1 ? `tab-${app.current}` : undefined}>
      {#if app.update}
        <div class="update">
          <p>{app.t('ny versjon')}</p>
          <button type="button" class="button primary" onclick={() => app.update?.()}>{app.t('oppdater')}</button>
        </div>
      {/if}
      {#if messages.length}
        <div class="problems" role="alert">{#each messages as message (message)}<p>{message}</p>{/each}</div>
      {/if}
      {#if tab && view}
        {#if searchable}
          <div class="search">
            <Icon name="search" />
            <input id="query" type="search" autocomplete="off" spellcheck="false" aria-label={app.t('søk')} placeholder={capturing ? app.t('trykk tast') : tab.placeholder || app.t('søk')}
              bind:value={view.query} oninput={() => (view.open = null)} />
            {#if view.query}<button type="button" class="icon-button" aria-label={app.t('tøm søk')} title={app.t('tøm søk')} onclick={clearSearch}><Icon name="close" /></button>{/if}
            {#if tab.module === 'hurtigtaster'}
              <button type="button" class="icon-button" aria-pressed={capturing} aria-label={app.t('finn tast')} title={app.t('finn tast')}
                onclick={() => (capturing = !capturing)} onblur={() => (capturing = false)}><Icon name="keyboard" /></button>
            {/if}
          </div>
        {/if}
        {#if app.moving}
          <div class="tools moving-bar">
            <span>{app.t('rekkefølge')}</span>
            <button type="button" id="done" class="button primary" onclick={() => (app.moving = false)}>{app.t('ferdig')}</button>
          </div>
        {/if}
        {#if view.tags.length && !reading && !app.moving}
          <div class="tools">
            <span>{app.t('merket', { antall: results ?? 0, emner: view.tags.map(t => `#${t}`).join(', ') })}</span>
            {#each view.tags as t (t)}
              <button type="button" class="chip" aria-label={app.t('fjern merke', { emne: `#${t}` })} onclick={() => (view.tags = view.tags.filter(x => x !== t))}>#{t}<Icon name="close" /></button>
            {/each}
          </div>
        {/if}
        <p class="sr-only" aria-live="polite">{capturing ? app.t('trykk tast') : results === null ? '' : app.t('treff', { antall: results })}</p>
        <div class="list">
          {#if app.moving}<Move {tab} />
          {:else if tab.module === 'oppslag'}<Lookup {tab} />
          {:else if tab.module === 'kort'}<Cards {tab} />
          {:else if tab.module === 'steg'}<Guides {tab} />
          {:else}<Shortcuts {tab} />{/if}
        </div>
      {:else}
        <p class="empty">{app.t('tom')}</p>
      {/if}
      {#if app.trail.length}
        <div class="return">
          <button type="button" class="return-back" onclick={() => app.back()}><Icon name="back" />{app.t('tilbake til', { sted: app.trail.at(-1)!.place })}</button>
          <button type="button" class="icon-button" aria-label={app.t('bli her')} title={app.t('bli her')} onclick={() => app.stay()}><Icon name="close" /></button>
        </div>
      {/if}
    </main>
  {/if}
  <AddTab bind:dialog={addDialog} />
  <dialog bind:this={importDialog} aria-labelledby="import-question" onclose={() => (importing = null)}>
    <p id="import-question">{app.t('importspørsmål', { fane: tab?.name ?? '', fil: importing?.file ?? '' })}</p>
    <div class="actions">
      <button type="button" class="button" onclick={() => finishImport(null)}>{app.t('avbryt')}</button>
      <button type="button" class="button" onclick={() => finishImport('replaced')}>{app.t('erstatt')}</button>
      <button type="button" class="button primary" onclick={() => finishImport('merged')}>{app.t('legg til')}</button>
    </div>
  </dialog>
{/if}
