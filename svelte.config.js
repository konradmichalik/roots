import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  onwarn: (warning, handler) => {
    // Ignore "state_referenced_locally" warnings - we intentionally use props for initial state values
    if (warning.code === 'state_referenced_locally') return;
    handler(warning);
  }
};
