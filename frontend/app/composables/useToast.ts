interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const toasts = ref<ToastItem[]>([]);
let nextId = 0;

export const useToast = () => {
  const add = (type: ToastItem['type'], message: string, duration = 4000) => {
    const id = nextId++;
    toasts.value.push({ id, type, message });

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  };

  const dismiss = (id: number) => {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.value.splice(idx, 1);
  };

  return {
    toasts: readonly(toasts),
    dismiss,
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg, 6000),
    warning: (msg: string) => add('warning', msg),
    info: (msg: string) => add('info', msg),
  };
};
