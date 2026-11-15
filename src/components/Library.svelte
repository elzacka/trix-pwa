<script lang="ts">
  // «Malbibliotek»: packs of templates to add as tabs or download. trix.tazk.no/#maler/<pakke> opens a pack.
  import { onMount, tick } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { download } from '../lib/backup'
  import { MODULES, parseTab, type Module } from '../lib/content'
  import { fileText, packZip, PACKS, type LibraryTemplate, type Pack } from '../lib/library'
  import { doc } from '../lib/pip.svelte'
  import { plain } from '../lib/text'
  import { MODULE_INFO } from '../lib/templates'

  const COUNTED: Record<Module, string> = { hurtigtaster: 'hurtigtaster', oppslag: 'oppslag', kort: 'kort', steg: 'veiledninger' }
  const GROUPS_SHOWN = 4
  type Preview = { count: number; groups: { title: string; items: string[] }[]; more: number }

  let filter = $state<Module | 'alle'>('alle')
  let previews = $state<Record<string, Preview>>({})
  let status = $state('')
  let error = $state('')
  let busy = $state(false)

  const shown = $derived(
    PACKS.map(pack => ({ pack, templates: pack.templates.filter(t => filter === 'alle' || t.module === filter) })).filter(p => p.templates.length),
  )

  onMount(async () => {
    await tick()
    const id = app.library?.pack
    const target = (id && doc().getElementById(`pack-${id}`)) || doc().getElementById('library-title')
    target?.scrollIntoView({ block: 'start' })
    target?.focus({ preventScroll: true })
  })

  async function preview(template: LibraryTemplate) {
    if (previews[template.id]) return void delete previews[template.id]
    const { tab } = parseTab(`${template.name}.md`, await fileText(template))
    const groups: { title: string; items: { title: string }[] }[] = !tab ? [] : tab.module === 'hurtigtaster' ? tab.shortcuts : tab.groups
    previews[template.id] = {
      count: groups.reduce((n, g) => n + g.items.length, 0),
      groups: groups.slice(0, GROUPS_SHOWN).map(g => ({ title: plain(g.title), items: g.items.slice(0, 3).map(i => plain(i.title)) })),
      more: Math.max(0, groups.length - GROUPS_SHOWN),
    }
  }

  async function add(templates: LibraryTemplate[]) {
    busy = true
    error = status = ''
    try {
      status = app.t('lagt til', { maler: (await app.addTemplates(templates)).join(', ') })
    } catch (e) {
      error = (e as Error).message
    }
    busy = false
  }

  async function save(template: LibraryTemplate) {
    download(new Blob([await fileText(template)], { type: 'text/markdown' }), `${template.name}.md`)
  }

  async function savePack(pack: Pack) {
    download(await packZip(pack), `${pack.name}.zip`)
  }

</script>

<section class="editor" aria-labelledby="library-title">
  <div class="editor-bar">
    <h1 id="library-title" tabindex="-1">{app.t('bibliotek')}</h1>
    <button type="button" class="button" onclick={() => app.closeLibrary()}>{app.t('lukk')}</button>
  </div>
  <div class="customize library">
    <p class="hint">{app.t('om biblioteket')}</p>
    <fieldset class="filter">
      <legend class="sr-only">Modul</legend>
      {#each ['alle', ...MODULES] as const as m (m)}
        <label class="tag"><input type="radio" name="library-filter" value={m} bind:group={filter} />{m === 'alle' ? app.t('alle moduler') : MODULE_INFO[m][0]}</label>
      {/each}
    </fieldset>
    <div aria-live="polite">{#if status}<p class="update">{status}</p>{/if}</div>
    {#if error}<p class="error" role="alert">{error}</p>{/if}

    {#each shown as { pack, templates } (pack.id)}
      <section class="pack" aria-labelledby="pack-{pack.id}">
        <h2 id="pack-{pack.id}" tabindex="-1">{pack.name}</h2>
        <p class="hint">{pack.description}</p>
        {#if filter === 'alle' && pack.templates.length > 1}
          <div class="pack-actions">
            <button type="button" class="button primary" disabled={busy} aria-label="{app.t('legg til alle')}: {pack.name}" onclick={() => add(pack.templates)}>{app.t('legg til alle')}</button>
            <button type="button" class="button" aria-label="{app.t('last ned')} {pack.name} (zip)" onclick={() => savePack(pack)}>{app.t('last ned')}</button>
          </div>
        {/if}
        <ul class="templates">
          {#each templates as template (template.id)}
            {@const open = previews[template.id]}
            <li>
              <div class="template-head">
                <span><strong>{template.name}</strong> <span class="hint">{MODULE_INFO[template.module][0]}</span></span>
                {#if template.description && pack.templates.length > 1}<span class="hint">{template.description}</span>{/if}
              </div>
              <div class="template-actions">
                <button type="button" class="button" aria-expanded={!!open} aria-controls="preview-{template.id}" aria-label="{app.t('forhåndsvis')} {template.name}" onclick={() => preview(template)}>{app.t('forhåndsvis')}</button>
                <button type="button" class="button" disabled={busy} aria-label="{app.t('legg til')} {template.name}" onclick={() => add([template])}>{app.t('legg til')}</button>
                <button type="button" class="button" aria-label="{app.t('last ned')} {template.name}" onclick={() => save(template)}>{app.t('last ned')}</button>
              </div>
              <div id="preview-{template.id}" class="preview-box" hidden={!open}>
                {#if open}
                  <p><strong>{open.count} {COUNTED[template.module]}</strong></p>
                  {#each open.groups as group, i (i)}
                    <p>{#if group.title}<strong>{group.title}:</strong> {/if}{group.items.join(', ')}{group.items.length ? ' …' : ''}</p>
                  {/each}
                  {#if open.more}<p class="hint">… og {open.more} grupper til</p>{/if}
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</section>
