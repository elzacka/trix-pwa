<script lang="ts">
  // An entry's text: Markdown, closed boxes, other names and tags.
  import type { Entry, Segment, Tab } from '../lib/content'
  import { app } from '../lib/app.svelte'
  import { parseMarkdown } from '../lib/markdown'
  import { has } from '../lib/view'
  import Inline from './Inline.svelte'
  import Md from './Md.svelte'

  let { tab, entry, segments, level = 4 }: { tab: Tab; entry: Entry; segments: Segment[]; level?: number } = $props()

  const searching = $derived(app.view.query.trim() !== '')

  // One parse budget for the whole entry: past it, the rest shows as plain text, so many boxes cannot add up.
  const BUDGET = 100_000
  const parsed = $derived.by(() => {
    let used = 0
    return segments.map(s => (used += s.text.length) <= BUDGET)
  })
  const nodes = (text: string, i: number) => (parsed[i] ? parseMarkdown(text).children : [{ type: 'paragraph' as const, children: [{ type: 'text' as const, value: text }] }])

  function toggleTag(tag: string) {
    const view = app.views[app.current]
    view.tags = view.tags.includes(tag) ? view.tags.filter(t => t !== tag) : [...view.tags, tag]
    view.reading = null
  }
</script>

{#each segments as segment, i (i)}
  {#if segment.kind === 'md'}
    <Md nodes={nodes(segment.text, i)} {level} />
  {:else}
    <details class="box" open={searching}>
      <summary><span><Inline text={segment.title} /></span></summary>
      <Md nodes={nodes(segment.text, i)} {level} />
    </details>
  {/if}
{/each}
{#if entry.aliases.length}<p class="also">{app.t('også')}: {entry.aliases.join(', ')}</p>{/if}
{#if entry.english.length}<p class="also">{app.t('engelsk')}: {entry.english.join(', ')}</p>{/if}
{#if has(tab, 'emneknagger') && entry.tags.length}
  <div class="tags">
    {#each entry.tags as tag (tag)}
      <button type="button" class="tag" aria-pressed={app.view.tags.includes(tag)} onclick={() => toggleTag(tag)}>#{tag}</button>
    {/each}
  </div>
{/if}
