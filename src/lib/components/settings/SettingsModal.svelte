<script lang="ts">
  import * as Dialog from '../ui/dialog';
  import WeekdayHoursForm from './WeekdayHoursForm.svelte';
  import AbsenceManager from './AbsenceManager.svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#if children}
      {@render children()}
    {/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
      <Dialog.Description>Configure working hours and absences.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      <!-- Working Hours -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-3">Target Hours per Day</h3>
        <WeekdayHoursForm />
      </div>

      <div class="border-t border-border"></div>

      <!-- Absences -->
      <div>
        <h3 class="text-sm font-semibold text-foreground mb-3">Absences</h3>
        <p class="text-xs text-muted-foreground mb-3">
          Manual absence tracking until Personio is connected.
        </p>
        <AbsenceManager />
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
