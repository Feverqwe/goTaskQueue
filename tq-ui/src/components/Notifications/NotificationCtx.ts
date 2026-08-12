import {createContext} from 'react';

export type ToastSeverity = 'success' | 'warning' | 'error' | 'info';

export interface ToastInput {
  severity?: ToastSeverity;
  label?: string;
  title: string;
  message?: string;
  autoHideDuration?: number | null;
}

export const NotificationCtx = createContext<(toast: ToastInput) => void>(() => {});
