<script lang="ts">
  // A file in the app: «Lagre» writes it, unless it changed elsewhere since it was opened.
  import { app, type Editing } from '../lib/app.svelte'

  let { editing }: { editing: Editing } = $props()
  // svelte-ignore state_referenced_locally
  let text = $state((editing.text ?? editing.original).replace(/\r\n/g, '\n'))
  let discarding = $state(false)
  let error = $state('')
  let field: HTMLTextAreaElement

  const dirty = $derived(text !== editing.original.replace(/\r\n/g, '\n'))

  $effect(() => {
    field.focus()
    field.setSelectionRange(0, 0)
  })

  async function save() {
    error = ''
    try {
      if (!(await app.save(text))) error = app.t('endret utenfor')
    } catch (e) {
      error = String(e)
    }
  }

  function cancel() {
    if (dirty && !discarding) return void (discarding = true)
    app.editing = null
  }

  function keydown(event: KeyboardEvent) {
    const mod = app.os === 'mac' ? event.metaKey : event.ctrlKey
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault()
      save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }
</script>

<section class="editor" aria-labelledby="editor-title">
  <div class="editor-bar">
    <h1 id="editor-title">{editing.name}</h1>
    <button type="button" class="button" onclick={cancel}>{discarding ? app.t('forkast') : app.t('avbryt')}</button>
    <button type="button" class="button primary" onclick={save}>{app.t('lagre')}</button>
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <textarea bind:this={field} bind:value={text} oninput={() => (discarding = false)} onkeydown={keydown} spellcheck="false" aria-labelledby="editor-title"></textarea>
</section>
