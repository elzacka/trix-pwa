<script lang="ts">
  // Kort: the front is the title and the first paragraph, the back is the rest.
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
</script>

{#each groups as group (group.line + group.title)}
  <section>
    {#if group.title}<h2 data-anchor={group.slug}>{group.title}</h2>{/if}
    <div class="cards columns-{tab.columns ?? 'auto'}">
      {#each group.items as entry (entry.id)}
        {@const turned = view.open === entry.id}
        {@const rest = entry.lead ? [{ ...entry.segments[0], text: entry.segments[0].text.slice(entry.lead.length) }, ...entry.segments.slice(1)] : entry.segments}
        <article class="flip" class:turned id="entry-{entry.id}" data-anchor={entry.slug}>
          <h3>
            <button type="button" class="flip-toggle" aria-pressed={turned} onclick={() => (view.open = turned ? null : entry.id)}>
              <span class="sr-only">{app.t('snu kort')}: </span>{plain(entry.title)}
            </button>
          </h3>
          {#if turned}
            <div class="face back">
              <Body {tab} {entry} segments={rest} />
              <Icon name="turn" />
            </div>
          {:else}
            <div class="face front" aria-hidden="true">
              <p class="title">{plain(entry.title)}</p>
              {#if entry.lead}<p class="lead">{plain(entry.lead)}</p>{/if}
              <Icon name="turn" />
            </div>
          {/if}
        </article>
      {/each}
    </div>
  </section>
{:else}
  <Empty />
{/each}
