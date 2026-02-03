export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const TOAST_DURATION = 3000;

export const toastState = $state<{ toasts: Toast[] }>({
  toasts: []
});

export function showToast(type: ToastType, message: string): void {
  const id = crypto.randomUUID();
  const toast: Toast = { id, type, message };

  toastState.toasts = [...toastState.toasts, toast];

  setTimeout(() => {
    dismissToast(id);
  }, TOAST_DURATION);
}

export function dismissToast(id: string): void {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
}

// Convenience functions
export const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message)
};
