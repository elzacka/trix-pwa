<script lang="ts">
  // «Legg til fane»: a new file from the module's template; ready-made content is in the library.
  import { app } from '../lib/app.svelte'
  import { MODULES, type Module } from '../lib/content'
  import { MODULE_INFO } from '../lib/templates'

  let { dialog = $bindable() }: { dialog?: HTMLDialogElement } = $props()

  let name = $state('')
  let choice = $state<Module>('oppslag')
  let error = $state('')

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    error = (await app.addTab(name, choice)) ?? ''
    if (!error) {
      dialog?.close()
      name = ''
    }
  }
</script>

<dialog bind:this={dialog} aria-labelledby="add-title" onclose={() => (error = '')}>
  <form onsubmit={submit}>
    <h2 id="add-title">{app.t('ny fane')}</h2>
    <label for="add-name">Navn</label>
    <input id="add-name" bind:value={name} required maxlength="80" autocomplete="off" />
    <fieldset>
      <legend>Modul</legend>
      {#each MODULES as m (m)}
        <label class="choice">
          <input type="radio" name="module" value={m} bind:group={choice} />
          <span><strong>{MODULE_INFO[m][0]}</strong> {MODULE_INFO[m][1]}</span>
        </label>
      {/each}
    </fieldset>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="actions">
      <button type="button" class="button" onclick={() => dialog?.close()}>{app.t('avbryt')}</button>
      <button type="submit" class="button primary">{app.t('ny fane')}</button>
    </div>
  </form>
</dialog>
