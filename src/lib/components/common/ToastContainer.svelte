<script lang="ts">
  import { toastState, dismissToast, type ToastType } from '../../stores/toast.svelte';
  import CheckCircle from '@lucide/svelte/icons/check-circle';
  import XCircle from '@lucide/svelte/icons/x-circle';
  import Info from '@lucide/svelte/icons/info';
  import Calendar from '@lucide/svelte/icons/calendar';
  import X from '@lucide/svelte/icons/x';

  const TYPE_STYLES: Record<ToastType, string> = {
    success: 'border-success text-success-text',
    error: 'border-danger text-danger-text',
    info: 'border-primary text-primary',
    action: 'border-source-outlook text-source-outlook-text'
  };

  const TYPE_ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    action: Calendar
  };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
  {#each toastState.toasts as toast (toast.id)}
    {@const IconComponent = TYPE_ICONS[toast.type]}
    <div
      class="flex items-center gap-3 rounded-lg border-1 bg-card px-4 py-3 shadow-lg animate-in slide-in-from-right-5 fade-in duration-200 {TYPE_STYLES[
        toast.type
      ]}"
      role="alert"
    >
      <IconComponent class="size-5 flex-shrink-0" />
      <span class="text-sm font-medium text-foreground">{toast.message}</span>
      {#if toast.actionLabel && toast.onAction}
        <button
          type="button"
          onclick={() => toast.onAction?.()}
          class="ml-1 rounded-md bg-source-outlook-subtle px-2.5 py-1 text-xs font-semibold text-source-outlook-text hover:bg-source-outlook/20 transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none whitespace-nowrap"
        >
          {toast.actionLabel}
        </button>
      {/if}
      <button
        type="button"
        onclick={() => dismissToast(toast.id)}
        class="ml-2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>
  {/each}
</div>
