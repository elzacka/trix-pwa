<script lang="ts">
  import { tick } from 'svelte'
  import { app } from './lib/app.svelte'
  import { count, entryGroups, has, shortcutGroups } from './lib/view'
  import AddTab from './components/AddTab.svelte'
  import Cards from './components/Cards.svelte'
  import Customize from './components/Customize.svelte'
  import Editor from './components/Editor.svelte'
  import Guides from './components/Guides.svelte'
  import Icon from './components/Icon.svelte'
  import Lookup from './components/Lookup.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import Start from './components/Start.svelte'

  let menu = $state<HTMLElement>()
  let addDialog = $state<HTMLDialogElement>()
  let restoreInput = $state<HTMLInputElement>()
  let notice = $state('')

  const tab = $derived(app.tabs[app.current])
  const view = $derived(app.views[app.current])
  const reading = $derived(tab?.module === 'steg' && view?.reading != null)
  const searchable = $derived(tab && has(tab, 'søk') && !reading)
  const results = $derived(
    !tab || !view || (!view.query.trim() && !view.tags.length) ? null : tab.module === 'hurtigtaster' ? count(shortcutGroups(tab, view)) : count(entryGroups(tab, view)),
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
    const ok = confirm('Filene i sikkerhetskopien erstatter filene med samme navn i trix-data. Vil du fortsette?')
    if (ok) notice = `Hentet ${await app.restore(file)} filer fra sikkerhetskopien`
    ;(event.target as HTMLInputElement).value = ''
  }

  async function selectTab(index: number) {
    app.select(index)
    await tick()
    document.getElementById(`tab-${app.current}`)?.focus()
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
    document.getElementById('query')?.focus()
  }

  /** Esc closes the innermost thing that is open. */
  function keydown(event: KeyboardEvent) {
    if (app.phase !== 'ready' || app.editing || app.customizing || document.querySelector('dialog[open]')) return
    const mod = app.os === 'mac' ? event.metaKey : event.ctrlKey
    if (mod && /^[1-9]$/.test(event.key)) {
      event.preventDefault()
      selectTab(Number(event.key) - 1)
    } else if (mod && event.key.toLowerCase() === 'f' && searchable) {
      event.preventDefault()
      document.getElementById('query')?.focus()
    } else if (mod && event.key.toLowerCase() === 'e' && tab) {
      event.preventDefault()
      app.edit(tab.file)
    } else if (event.key === 'Escape' && view && !event.defaultPrevented) {
      if (app.trail.length) app.back()
      else if (view.reading) view.reading = null
      else if (view.open) view.open = null
      else if (view.tags.length || view.query) clearSearch()
    }
  }

  // The files are the user's: read them again when the app comes back into view.
  const reload = () => app.phase === 'ready' && !app.editing && !app.customizing && app.load().catch(error => (app.error = String(error)))
</script>

<svelte:window onkeydown={keydown} onfocus={reload} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'visible' && reload()} />

{#if app.phase === 'start' || app.phase === 'reconnect'}
  <Start />
{:else if app.phase === 'ready'}
  {#if app.editing}
    <Editor editing={app.editing} />
  {:else if app.customizing}
    <Customize />
  {:else}
    <header class="bar">
      <img src="{import.meta.env.BASE_URL}icon.svg" alt="" class="logo" />
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
          <li><button type="button" onclick={() => run(() => addDialog?.showModal())}>{app.t('ny fane')}</button></li>
          <li><button type="button" onclick={() => run(() => (app.customizing = true))}>{app.t('oppsett')}</button></li>
          <li class="separator"><button type="button" onclick={() => run(() => app.backup())}>{app.t('eksporter')}</button></li>
          <li><button type="button" onclick={() => run(() => restoreInput?.click())}>{app.t('importer')}</button></li>
          <li><button type="button" onclick={() => run(() => app.switchFolder())}>{app.t('bytt mappe')}</button></li>
          <li class="version separator">v{__VERSION__} | elzacka</li>
        </ul>
      </div>
      <input type="file" accept=".zip,application/zip" hidden bind:this={restoreInput} onchange={restore} />
    </header>

    <main id="panel" role={app.tabs.length > 1 ? 'tabpanel' : undefined} aria-labelledby={app.tabs.length > 1 ? `tab-${app.current}` : undefined}>
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
            <input id="query" type="search" autocomplete="off" spellcheck="false" aria-label={app.t('søk')} placeholder={tab.placeholder || app.t('søk')}
              bind:value={view.query} oninput={() => (view.open = null)} />
            {#if view.query}<button type="button" class="icon-button" aria-label={app.t('tøm søk')} title={app.t('tøm søk')} onclick={clearSearch}><Icon name="close" /></button>{/if}
          </div>
        {/if}
        {#if view.tags.length && !reading}
          <div class="tools">
            <span>{app.t('merket', { antall: results ?? 0, emner: view.tags.map(t => `#${t}`).join(', ') })}</span>
            {#each view.tags as t (t)}
              <button type="button" class="chip" aria-label={app.t('fjern merke', { emne: `#${t}` })} onclick={() => (view.tags = view.tags.filter(x => x !== t))}>#{t}<Icon name="close" /></button>
            {/each}
          </div>
        {/if}
        <p class="sr-only" aria-live="polite">{results === null ? '' : app.t('treff', { antall: results })}</p>
        <div class="list">
          {#if tab.module === 'oppslag'}<Lookup {tab} />
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
{/if}
