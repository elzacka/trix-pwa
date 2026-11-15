<script lang="ts">
  // «Tilpass appen»: Oppsett.md and the tabs' options as a form. The app shows each change at once; «Lagre» writes the files.
  import { onDestroy, tick } from 'svelte'
  import { app } from '../lib/app.svelte'
  import type { Option } from '../lib/content'
  import { draftOf, optionsFor, previewOf } from '../lib/customize'
  import { COLORS, FONT, FONT_SIZE, SETUP_FILE, type ColorName } from '../lib/setup'
  import { TEXTS, type TextKey } from '../lib/texts'
  import { applyTheme, hex } from '../lib/theme'
  import Icon from './Icon.svelte'

  const COLOR_NAMES: Record<ColorName, string> = {
    bakgrunn: 'Bakgrunn', flate: 'Flater', linje: 'Linjer', tekst: 'Tekst', dempet: 'Dempet tekst',
    aksent: 'Aksent', lenke: 'Lenker', forside: 'Forsiden av kort', bakside: 'Baksiden av kort',
  }
  const OPTION_NAMES: Record<Option, string> = { søk: 'Søk', emneknagger: 'Emneknagger', 'a–å': 'Sorter A–Å' }
  const TEXT_KEYS = (Object.keys(TEXTS) as TextKey[]).filter(k => k !== 'navn')

  const before = draftOf(app.setup, app.tabs, hex)
  let draft = $state(structuredClone(before))
  let warnings = $state<string[]>([])
  let error = $state('')
  let discarding = $state(false)
  let form: HTMLFormElement

  const dirty = $derived(JSON.stringify(draft) !== JSON.stringify(before))
  const tabOf = (file: string) => draft.tabs.find(t => t.file === file)!

  $effect(() => {
    warnings = applyTheme(previewOf(app.setup, before, draft)).map(w => w.replace(`${SETUP_FILE}: `, ''))
  })
  onDestroy(() => applyTheme(app.setup))

  async function move(index: number, by: -1 | 1) {
    const order = draft.order
    const to = index + by
    ;[order[index], order[to]] = [order[to], order[index]]
    await tick()
    const id = (dir: string) => document.getElementById(`move-${dir}-${to}`) as HTMLButtonElement | null
    const button = id(by < 0 ? 'up' : 'down')
    ;(button && !button.disabled ? button : id(by < 0 ? 'down' : 'up'))?.focus()
  }

  function toggle(file: string, option: Option, on: boolean) {
    const tab = tabOf(file)
    tab.options = on ? [...tab.options, option] : tab.options.filter(o => o !== option)
  }

  async function save(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    if (draft.font.trim() && !FONT.test(draft.font.trim())) return void (error = 'Navnet på skriften kan bare ha bokstaver, tall, mellomrom, _ og -')
    if (!dirty) return void (app.customizing = false)
    try {
      if (!(await app.customize(before, $state.snapshot(draft)))) error = 'En av filene er endret utenfor appen. Velg Avbryt og åpne skjemaet på nytt.'
    } catch (e) {
      error = String(e)
    }
  }

  function cancel() {
    if (dirty && !discarding) return void (discarding = true)
    app.customizing = false
  }

  function keydown(event: KeyboardEvent) {
    const mod = app.os === 'mac' ? event.metaKey : event.ctrlKey
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault()
      form.requestSubmit()
    } else if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault()
      cancel()
    }
  }

  function asText() {
    app.customizing = false
    app.edit(SETUP_FILE)
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section class="editor" aria-labelledby="customize-title" onkeydown={keydown}>
  <div class="editor-bar">
    <h1 id="customize-title">{app.t('oppsett')}</h1>
    <button type="button" class="button" onclick={cancel}>{discarding ? app.t('forkast') : app.t('avbryt')}</button>
    <button type="submit" form="customize" class="button primary">{app.t('lagre')}</button>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  <form id="customize" class="customize" bind:this={form} onsubmit={save} oninput={() => (discarding = false)}>
    <section aria-labelledby="c-name">
      <h2 id="c-name">Navn</h2>
      <label for="name" class="label">Navnet på appen</label>
      <input id="name" class="field" bind:value={draft.name} required maxlength="40" autocomplete="off" />
    </section>

    <section aria-labelledby="c-tabs">
      <h2 id="c-tabs">Faner</h2>
      <p class="hint">Fanene står i appen i denne rekkefølgen</p>
      <ol class="order">
        {#each draft.order as file, i (file)}
          {@const tab = tabOf(file)}
          <li>
            <div class="order-head">
              <span><strong>{tab.name}</strong> <span class="hint">{file}</span></span>
              <button type="button" id="move-up-{i}" class="icon-button" disabled={i === 0} aria-label={app.t('flytt opp', { del: tab.name })} title={app.t('flytt opp', { del: tab.name })} onclick={() => move(i, -1)}><Icon name="up" /></button>
              <button type="button" id="move-down-{i}" class="icon-button" disabled={i === draft.order.length - 1} aria-label={app.t('flytt ned', { del: tab.name })} title={app.t('flytt ned', { del: tab.name })} onclick={() => move(i, 1)}><Icon name="down" /></button>
            </div>
            <details>
              <summary>Valg for {tab.name}</summary>
              <fieldset>
                <legend class="sr-only">Valg for {tab.name}</legend>
                {#each optionsFor(tab.module) as option (option)}
                  <label class="choice">
                    <input type="checkbox" checked={tab.options.includes(option)} onchange={e => toggle(file, option, e.currentTarget.checked)} />
                    <span>{OPTION_NAMES[option]}</span>
                  </label>
                {/each}
                {#if tab.options.includes('søk')}
                  <label for="placeholder-{i}" class="label">Tekst i søkefeltet</label>
                  <input id="placeholder-{i}" class="field" bind:value={tab.placeholder} maxlength="80" placeholder={app.t('søk')} autocomplete="off" />
                {/if}
                {#if tab.module === 'kort'}
                  <label for="columns-{i}" class="label">Kort ved siden av hverandre</label>
                  <select id="columns-{i}" class="field" bind:value={tab.columns}>
                    <option value={null}>Så mange det er plass til</option>
                    {#each [1, 2, 3, 4, 5, 6] as n (n)}<option value={n}>{n}</option>{/each}
                  </select>
                {/if}
              </fieldset>
            </details>
          </li>
        {/each}
      </ol>
    </section>

    <section aria-labelledby="c-colors">
      <h2 id="c-colors">Farger</h2>
      <p class="hint">Appen viser fargene med en gang og lagrer dem når du velger {app.t('lagre')}</p>
      <div class="colors">
        <span></span><span class="hint" aria-hidden="true">Lys modus</span><span class="hint" aria-hidden="true">Mørk modus</span>
        {#each COLORS as name (name)}
          <span>{COLOR_NAMES[name]}</span>
          <input type="color" bind:value={draft.colors[name].light} aria-label="{COLOR_NAMES[name]}, lys modus" />
          <input type="color" bind:value={draft.colors[name].dark} aria-label="{COLOR_NAMES[name]}, mørk modus" />
        {/each}
      </div>
      <div aria-live="polite">
        {#if warnings.length}<div class="problems">{#each warnings as warning (warning)}<p>{warning}</p>{/each}</div>{/if}
      </div>
    </section>

    <section aria-labelledby="c-font">
      <h2 id="c-font">Skrift</h2>
      <label for="font" class="label">Skriften i appen</label>
      <input id="font" class="field" bind:value={draft.font} maxlength="60" placeholder="Systemskriften" autocomplete="off" aria-describedby="font-hint" />
      <p id="font-hint" class="hint">Navnet på en skrift som er installert på enheten. Et tomt felt gir skriften til systemet.</p>
      <label for="size" class="label">Tekststørrelse</label>
      <input id="size" class="field size" type="number" bind:value={draft.size} required min={FONT_SIZE[0]} max={FONT_SIZE[1]} step="1" aria-describedby="size-hint" />
      <p id="size-hint" class="hint">{FONT_SIZE[0]}–{FONT_SIZE[1]}</p>
    </section>

    <details class="texts">
      <summary><h2>Tekstene i appen</h2></summary>
      <p class="hint">Ord i {'{klammer}'} fyller appen inn. Et tomt felt gir standardteksten.</p>
      {#each TEXT_KEYS as key (key)}
        <label for="text-{key}" class="label">{TEXTS[key]}</label>
        <input id="text-{key}" class="field" bind:value={draft.texts[key]} maxlength="200" autocomplete="off" />
      {/each}
    </details>

    {#if !dirty}<p><button type="button" class="button" onclick={asText}>Endre {SETUP_FILE} som tekst</button></p>{/if}
  </form>
</section>
