<script lang="ts">
  import FavoritesList from './FavoritesList.svelte';
  import { settingsState } from '../../stores/settings.svelte';
</script>

{#if settingsState.showFavorites}
  <div class="p-4 space-y-4">
    <FavoritesList />
  </div>
{/if}
