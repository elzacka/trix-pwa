<script lang="ts">
  import Md from './Md.svelte'
  import { parseInline } from '../lib/markdown'
  import { plain } from '../lib/text'

  let { text, links = true, markup = true }: { text: string; links?: boolean; markup?: boolean } = $props()
</script>

<Md nodes={markup ? parseInline(text) : [{ type: 'text', value: plain(text) }]} {links} />
