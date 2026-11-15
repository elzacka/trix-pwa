<script lang="ts">
  // Outline icons from Tabler Icons (MIT).
  const PATHS = {
    search: ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'],
    close: ['M18 6l-12 12', 'M6 6l12 12'],
    more: ['M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'],
    back: ['M5 12l14 0', 'M5 12l6 6', 'M5 12l6 -6'],
    up: ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6'],
    down: ['M12 5l0 14', 'M18 13l-6 6', 'M6 13l6 6'],
    keyboard: ['M2 8a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z', 'M6 10l0 .01', 'M10 10l0 .01', 'M14 10l0 .01', 'M18 10l0 .01', 'M6 14l0 .01', 'M18 14l0 .01', 'M10 14l4 .01'],
    turn: ['M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4', 'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'],
  }
  let { name }: { name: keyof typeof PATHS } = $props()
</script>

<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">{#each PATHS[name] as d (d)}<path {d} />{/each}</svg>
