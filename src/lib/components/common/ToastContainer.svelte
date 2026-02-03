<script lang="ts">
  import { toastState, dismissToast, type ToastType } from '../../stores/toast.svelte';

  const TYPE_STYLES: Record<ToastType, string> = {
    success: 'border-success text-success-text',
    error: 'border-danger text-danger-text',
    info: 'border-primary text-primary'
  };

  const TYPE_ICONS: Record<ToastType, string> = {
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {#each toastState.toasts as toast (toast.id)}
    <div
      class="flex items-center gap-3 rounded-lg border-1 bg-card px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200 {TYPE_STYLES[toast.type]}"
      role="alert"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d={TYPE_ICONS[toast.type]} />
      </svg>
      <span class="text-sm font-medium text-foreground">{toast.message}</span>
      <button
        onclick={() => dismissToast(toast.id)}
        class="ml-2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
