<script lang="ts">
  // Markdown nodes as elements; text always goes in as text, never as HTML.
  import type { Nodes } from 'mdast'
  import Md from './Md.svelte'
  import { app } from '../lib/app.svelte'
  import { linkKind, textOf } from '../lib/markdown'
  import { slug } from '../lib/text'

  let { nodes, level = 4, links = true }: { nodes: Nodes[]; level?: number; links?: boolean } = $props()

  const heading = (depth: number) => `h${Math.min(6, Math.max(level, depth))}`

  function open(event: MouseEvent, href: string) {
    event.preventDefault()
    event.stopPropagation()
    app.follow(href)
  }
</script>

{#each nodes as node, i (i)}
  {#if node.type === 'text'}{node.value}
  {:else if node.type === 'paragraph'}<p><Md nodes={node.children} {level} {links} /></p>
  {:else if node.type === 'heading'}
    <svelte:element this={heading(node.depth)} class="subheading" data-anchor={slug(textOf(node))}><Md nodes={node.children} {level} {links} /></svelte:element>
  {:else if node.type === 'strong'}<strong><Md nodes={node.children} {level} {links} /></strong>
  {:else if node.type === 'emphasis'}<em><Md nodes={node.children} {level} {links} /></em>
  {:else if node.type === 'delete'}<del><Md nodes={node.children} {level} {links} /></del>
  {:else if node.type === 'inlineCode'}<code>{node.value}</code>
  {:else if node.type === 'code'}<pre><code>{node.value}</code></pre>
  {:else if node.type === 'break'}<br />
  {:else if node.type === 'thematicBreak'}<hr />
  {:else if node.type === 'blockquote'}<blockquote><Md nodes={node.children} {level} {links} /></blockquote>
  {:else if node.type === 'list'}
    {#if node.ordered}
      <ol start={node.start ?? 1}>{#each node.children as item, j (j)}<li><Md nodes={item.children} {level} {links} /></li>{/each}</ol>
    {:else}
      <ul>{#each node.children as item, j (j)}<li><Md nodes={item.children} {level} {links} /></li>{/each}</ul>
    {/if}
  {:else if node.type === 'table'}
    <div class="table">
      <table>
        <thead>
          <tr>{#each node.children[0]?.children ?? [] as cell, c (c)}<th scope="col" class="align-{node.align?.[c] ?? 'none'}"><Md nodes={cell.children} {level} {links} /></th>{/each}</tr>
        </thead>
        <tbody>
          {#each node.children.slice(1) as row, r (r)}
            <tr>{#each row.children as cell, c (c)}<td class="align-{node.align?.[c] ?? 'none'}"><Md nodes={cell.children} {level} {links} /></td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if node.type === 'link'}
    {@const link = linkKind(node.url)}
    {#if !links || link.kind === 'none'}<Md nodes={node.children} {level} links={false} />
    {:else if link.kind === 'web'}<a href={link.href} target="_blank" rel="noopener noreferrer"><Md nodes={node.children} {level} links={false} /></a>
    {:else}<a href={node.url} onclick={e => open(e, node.url)}><Md nodes={node.children} {level} links={false} /></a>
    {/if}
  {:else if node.type === 'image'}{node.alt ?? ''}
  {:else if node.type === 'html'}{node.value}
  {/if}
{/each}
