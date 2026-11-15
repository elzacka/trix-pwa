<script lang="ts">
  // «Endre rekkefølgen»: the tab's groups and entries in file order, each moved by a button and saved at once.
  import { tick } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { doc } from '../lib/pip.svelte'
  import type { Group, Tab } from '../lib/content'
  import { moveGroup, moveItem, type Place } from '../lib/move'
  import { plain } from '../lib/text'
  import Icon from './Icon.svelte'

  let { tab }: { tab: Tab } = $props()

  type Item = { title: string; line: number }
  const groups = $derived<Group<Item>[]>(tab.module === 'hurtigtaster' ? tab.shortcuts : tab.groups)
  const all = $derived(groups.flatMap(group => group.items.map(item => ({ item, group }))))
  const titled = $derived(groups.filter(g => g.line >= 0))

  // The move functions count lines from 0; a group above the first heading has heading -1.
  const heading = (group: Group<Item>) => (group.line < 0 ? -1 : group.line - 1)

  function itemPlace(k: number, by: -1 | 1): Place {
    const { group } = all[k]
    if (by < 0) return all[k - 1].group === group ? { before: all[k - 1].item.line - 1 } : { end: heading(all[k - 1].group) }
    if (all[k + 1].group !== group) return { before: all[k + 1].item.line - 1 }
    return all[k + 2]?.group === group ? { before: all[k + 2].item.line - 1 } : { end: heading(group) }
  }

  function groupPlace(j: number, by: -1 | 1): Place {
    if (by < 0) return { before: titled[j - 1].line - 1 }
    return titled[j + 2] ? { before: titled[j + 2].line - 1 } : { end: 0 }
  }

  async function move(line: number, by: -1 | 1, change: (text: string) => { text: string; line: number }) {
    const moved = await app.move(tab.file, change)
    await tick()
    const row = doc().querySelector(`.moving [data-line="${moved ?? line}"]`)
    const buttons = [...(row?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const button = buttons[by < 0 ? 0 : 1]
    ;(button && !button.disabled ? button : buttons.find(b => !b.disabled))?.focus()
  }

  const moveEntry = (k: number, by: -1 | 1) => move(all[k].item.line, by, text => moveItem(text, tab.module, all[k].item.line - 1, itemPlace(k, by)))
  const moveWhole = (j: number, by: -1 | 1) => move(titled[j].line, by, text => moveGroup(text, tab.module, titled[j].line - 1, groupPlace(j, by)))
</script>

{#snippet buttons(name: string, up: boolean, down: boolean, run: (by: -1 | 1) => void)}
  <button type="button" class="icon-button" disabled={!up} aria-label={app.t('flytt opp', { del: name })} title={app.t('flytt opp', { del: name })} onclick={() => run(-1)}><Icon name="up" /></button>
  <button type="button" class="icon-button" disabled={!down} aria-label={app.t('flytt ned', { del: name })} title={app.t('flytt ned', { del: name })} onclick={() => run(1)}><Icon name="down" /></button>
{/snippet}

<div class="moving">
  {#each groups as group (group.line)}
    <section>
      {#if group.line >= 0}
        {@const j = titled.indexOf(group)}
        <div class="move-row move-group" data-line={group.line}>
          <h2>{plain(group.title)}</h2>
          {@render buttons(plain(group.title), j > 0, j < titled.length - 1, by => moveWhole(j, by))}
        </div>
      {/if}
      <ol>
        {#each group.items as item (item.line)}
          {@const k = all.findIndex(a => a.item === item)}
          <li class="move-row" data-line={item.line}>
            <span>{plain(item.title)}</span>
            {@render buttons(plain(item.title), k > 0, k < all.length - 1, by => moveEntry(k, by))}
          </li>
        {/each}
      </ol>
    </section>
  {/each}
</div>
