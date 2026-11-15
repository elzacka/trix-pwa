<script lang="ts">
  // Shown in the main window while the app is in the floating window.
  import { app } from '../lib/app.svelte'
  import { pip } from '../lib/pip.svelte'
</script>

{#if pip.window}
  <main class="away">
    <p>{app.t('eget vindu')}</p>
    <button type="button" class="button primary" onclick={() => pip.window?.close()}>{app.t('vis her')}</button>
  </main>
{/if}
