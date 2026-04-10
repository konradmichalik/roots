export type ToastType = 'success' | 'error' | 'info' | 'action';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  persistent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const TOAST_DURATION = 3000;

export const toastState = $state<{ toasts: Toast[] }>({
  toasts: []
});

export function showToast(type: ToastType, message: string, options?: Partial<Pick<Toast, 'persistent' | 'actionLabel' | 'onAction'>>): string {
  const id = crypto.randomUUID();
  const newToast: Toast = { id, type, message, ...options };

  toastState.toasts = [...toastState.toasts, newToast];

  if (!newToast.persistent) {
    setTimeout(() => {
      dismissToast(id);
    }, TOAST_DURATION);
  }

  return id;
}

export function updateToast(id: string, message: string): void {
  toastState.toasts = toastState.toasts.map((t) =>
    t.id === id ? { ...t, message } : t
  );
}

export function dismissToast(id: string): void {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
}

// Convenience functions
export const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
  action: (message: string, actionLabel: string, onAction: () => void) =>
    showToast('action', message, { persistent: true, actionLabel, onAction })
};
