<script lang="ts">
  // Where the files live: asked from the menu, never before the app opens.
  import { app } from '../lib/app.svelte'
  import { canPickFolder } from '../lib/storage'

  let { dialog = $bindable(), pick }: { dialog?: HTMLDialogElement; pick: () => Promise<void> } = $props()

  const folder = canPickFolder()

  async function run(action: () => Promise<unknown>) {
    dialog?.close()
    await action()
  }
</script>

<dialog bind:this={dialog} aria-labelledby="storage-title">
  {#if folder}
    <h2 id="storage-title">{app.t('velg lagring')}</h2>
    <p>Nå ligger filene i nettleseren. De forsvinner hvis du sletter nettleserdata for denne siden.</p>
    <p>Velg en mappe, for eksempel Dokumenter. Trix lager mappa trix-data der og tar med filene dit. Da kan du også endre dem i andre programmer.</p>
    <div class="actions">
      <button type="button" class="button" onclick={() => run(() => app.decide())}>{app.t('behold')}</button>
      <button type="button" class="button primary" onclick={() => run(pick)}>{app.t('velg mappe')}</button>
    </div>
  {:else}
    <h2 id="storage-title">{app.t('lagret i nettleseren')}</h2>
    <p>Nettleseren din kan ikke lagre filer i en mappe du velger. Filene forsvinner hvis du sletter nettleserdata for denne siden.</p>
    <p>Lag en sikkerhetskopi med jevne mellomrom. Du kan også lage den fra menyen.</p>
    <div class="actions">
      <button type="button" class="button" onclick={() => run(() => app.decide())}>{app.t('forstått')}</button>
      <button type="button" class="button primary" onclick={() => run(async () => { await app.backup(); await app.decide() })}>{app.t('eksporter')}</button>
    </div>
  {/if}
</dialog>
