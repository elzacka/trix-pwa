<script lang="ts">
  // Oppslag: a list of entries; one opens in place.
  import type { Tab } from '../lib/content'
  import { app } from '../lib/app.svelte'
  import { entryGroups } from '../lib/view'
  import { plain } from '../lib/text'
  import Body from './Body.svelte'
  import Empty from './Empty.svelte'

  let { tab }: { tab: Tab } = $props()
  const view = $derived(app.views[app.current])
  const groups = $derived(entryGroups(tab, view))
</script>

{#each groups as group (group.line + group.title)}
  <section>
    {#if group.title}<h2 data-anchor={group.slug}>{group.title}</h2>{/if}
    <div class="card">
      {#each group.items as entry (entry.id)}
        {@const open = view.open === entry.id}
        <div class="entry" class:open id="entry-{entry.id}" data-anchor={entry.slug}>
          <h3>
            <button type="button" aria-expanded={open} onclick={() => (view.open = open ? null : entry.id)}>
              <span class="title">{plain(entry.title)}</span>
              {#if !open && entry.lead}<span class="preview">{plain(entry.lead)}</span>{/if}
            </button>
          </h3>
          {#if open}<div class="body"><Body {tab} {entry} segments={entry.segments} /></div>{/if}
        </div>
      {/each}
    </div>
  </section>
{:else}
  <Empty />
{/each}
