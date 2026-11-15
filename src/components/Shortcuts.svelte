<script lang="ts">
  // Hurtigtaster: rows of an action and its keys on this system.
  import type { Shortcut, Tab } from '../lib/content'
  import { app } from '../lib/app.svelte'
  import { keyParts } from '../lib/keys'
  import { shortcutGroups } from '../lib/view'
  import Empty from './Empty.svelte'
  import Inline from './Inline.svelte'

  let { tab }: { tab: Tab } = $props()
  const view = $derived(app.views[app.current])
  const groups = $derived(shortcutGroups(tab, view))
  const keys = (s: Shortcut) => keyParts(app.os === 'mac' ? s.mac : s.windows, app.os)

  /** Rows in the same `:::` box, run by run. */
  function runs(items: Shortcut[]) {
    const out: { box: string | null; items: Shortcut[] }[] = []
    for (const item of items) {
      const last = out.at(-1)
      if (last && last.box === item.box) last.items.push(item)
      else out.push({ box: item.box, items: [item] })
    }
    return out
  }
</script>

{#snippet row(item: Shortcut)}
  {#if keys(item).length}
    <div class="shortcut" data-anchor={item.slug}>
      <span class="name"><Inline text={item.title} /></span>
      <span class="keys">
        {#each keys(item) as alternative, i (i)}
          {#if i > 0}<span class="or">eller</span>{/if}
          {#each alternative as part, j (j)}
            {#if 'keys' in part}<kbd>{part.keys}</kbd>{:else}<span class="or">{part.text}</span>{/if}
          {/each}
        {/each}
      </span>
    </div>
  {/if}
{/snippet}

{#each groups as group (group.line + group.title)}
  <section>
    {#if group.title}<h2 data-anchor={group.slug}>{group.title}</h2>{/if}
    <div class="card">
      {#each runs(group.items) as run (run.items[0].id)}
        {#if run.box}
          <details class="box" open={view.query.trim() !== ''}>
            <summary><Inline text={run.box} /></summary>
            {#each run.items as item (item.id)}{@render row(item)}{/each}
          </details>
        {:else}
          {#each run.items as item (item.id)}{@render row(item)}{/each}
        {/if}
      {/each}
    </div>
  </section>
{:else}
  <Empty />
{/each}
