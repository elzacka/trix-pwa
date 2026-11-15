<script lang="ts">
  import Md from './Md.svelte'
  import { parseInline } from '../lib/markdown'

  let { text, links = true }: { text: string; links?: boolean } = $props()
</script>

<Md nodes={parseInline(text)} {links} />
