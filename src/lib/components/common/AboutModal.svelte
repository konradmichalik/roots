<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import Logo from './Logo.svelte';
  import type { Snippet } from 'svelte';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import BookOpen from '@lucide/svelte/icons/book-open';

  let { children }: { children: Snippet } = $props();

  const version = __APP_VERSION__;
  const buildDate = new Date(__BUILD_DATE__).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
</script>

<Dialog.Root>
  <Dialog.Trigger>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-sm p-0 gap-0">
    <div class="flex flex-col items-center gap-5 px-6 pt-8 pb-6">
      <!-- Logo -->
      <Logo variant="full" size="lg" />

      <!-- Tagline -->
      <p class="text-sm text-muted-foreground">Work Time Overview & Management</p>

      <!-- Info Card -->
      <div class="w-full rounded-xl border border-border bg-muted/30 divide-y divide-border">
        <div class="flex items-center justify-between px-4 py-2.5">
          <span class="text-sm text-muted-foreground">Version</span>
          <span class="text-sm font-mono font-medium text-foreground">v{version}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-2.5">
          <span class="text-sm text-muted-foreground">Build</span>
          <span class="text-sm font-medium text-foreground">{buildDate}</span>
        </div>
      </div>

      <!-- Links -->
      <div class="flex items-center gap-3">
        <a
          href="https://github.com/konradmichalik/roots"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors duration-150"
        >
          <ExternalLink class="size-3.5" />
          GitHub
        </a>
        <a
          href="https://github.com/konradmichalik/roots#readme"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors duration-150"
        >
          <BookOpen class="size-3.5" />
          Documentation
        </a>
      </div>

      <!-- Copyright -->
      <p class="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Konrad Michalik</p>
    </div>

    <!-- Close Button -->
    <Dialog.Footer class="border-t border-border px-6 py-3">
      <Dialog.Close
        class="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors duration-150"
      >
        Close
      </Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
