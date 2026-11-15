<script lang="ts">
  import { app } from '../lib/app.svelte'

  const view = $derived(app.views[app.current])
  const query = $derived(view?.query.trim() ?? '')
  const filtered = $derived(Boolean(query || view?.tags.length))

  function clear() {
    view.query = ''
    view.tags = []
    document.getElementById('query')?.focus()
  }
</script>

<div class="empty">
  <p>{query ? app.t('ingen treff', { søk: query }) : app.t('tom')}</p>
  {#if filtered}<button type="button" class="button" onclick={clear}>{app.t('vis alt')}</button>{/if}
</div>
