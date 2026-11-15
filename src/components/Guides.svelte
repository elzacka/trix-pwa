<script lang="ts">
  // Steg: a list of guides; one opens to read in the tab.
  import { tick } from 'svelte'
  import type { Tab } from '../lib/content'
  import { app } from '../lib/app.svelte'
  import { entryGroups } from '../lib/view'
  import { plain } from '../lib/text'
  import Body from './Body.svelte'
  import Empty from './Empty.svelte'
  import Icon from './Icon.svelte'

  let { tab }: { tab: Tab } = $props()
  const view = $derived(app.views[app.current])
  const groups = $derived(entryGroups(tab, view))
  const reading = $derived(view.reading ? tab.groups.flatMap(g => g.items).find(e => e.id === view.reading) : undefined)

  async function read(id: string) {
    view.reading = id
    await tick()
    document.getElementById('panel')?.scrollTo({ top: 0 })
    document.getElementById('guide-title')?.focus()
  }

  async function close() {
    const id = view.reading
    view.reading = null
    await tick()
    document.querySelector<HTMLElement>(`#entry-${id} button`)?.focus()
  }
</script>

{#if reading}
  <article class="guide" id="entry-{reading.id}" data-anchor={reading.slug}>
    <button type="button" class="back-link" onclick={close}><Icon name="back" />{app.t('tilbake')}</button>
    <h2 id="guide-title" tabindex="-1">{plain(reading.title)}</h2>
    <Body {tab} entry={reading} segments={reading.segments} level={3} />
  </article>
{:else}
  {#each groups as group (group.line + group.title)}
    <section>
      {#if group.title}<h2 data-anchor={group.slug}>{group.title}</h2>{/if}
      <div class="card">
        {#each group.items as entry (entry.id)}
          <div class="entry" id="entry-{entry.id}" data-anchor={entry.slug}>
            <h3>
              <button type="button" onclick={() => read(entry.id)}>
                <span class="title">{plain(entry.title)}</span>
                {#if entry.lead}<span class="preview">{plain(entry.lead)}</span>{/if}
              </button>
            </h3>
          </div>
        {/each}
      </div>
    </section>
  {:else}
    <Empty />
  {/each}
{/if}
