<script lang="ts">
  // First visit: where the files live. Later: access to the folder again.
  import { app } from '../lib/app.svelte'
  import { canPickFolder } from '../lib/storage'

  const folder = canPickFolder()
</script>

<main class="start">
  <img src="{import.meta.env.BASE_URL}icon.svg" alt="" class="start-logo" />
  {#if app.phase === 'reconnect'}
    <h1>Gi Trix tilgang til trix-data igjen</h1>
    <p>Nettleseren trenger lov til å bruke mappa på nytt.</p>
    <div class="actions">
      <button type="button" class="button primary" onclick={() => app.reconnect()}>Gi tilgang</button>
      <button type="button" class="button" onclick={() => app.switchFolder()}>Velg en annen mappe</button>
    </div>
  {:else if folder}
    <h1>Velg hvor filene skal ligge</h1>
    <p>Trix lagrer oppsettet og innholdet ditt som vanlige filer i mappa trix-data. Velg Dokumenter eller en annen mappe. Trix lager mappa trix-data der.</p>
    <p>Filene blir liggende også når du sletter nettleserdata, og du kan endre dem i andre programmer.</p>
    <div class="actions"><button type="button" class="button primary" onclick={() => app.choose('mappe')}>Velg mappe</button></div>
  {:else}
    <h1>Filene lagres i nettleseren</h1>
    <p>Nettleseren din kan ikke lagre filer i en mappe du velger. Trix lagrer derfor filene i nettleseren.</p>
    <p>Filene forsvinner hvis du sletter nettleserdata for denne siden. Lag en sikkerhetskopi fra menyen med jevne mellomrom.</p>
    <div class="actions"><button type="button" class="button primary" onclick={() => app.choose('nettleser')}>Fortsett</button></div>
  {/if}
  {#if app.error}<p class="error" role="alert">{app.error}</p>{/if}
</main>
