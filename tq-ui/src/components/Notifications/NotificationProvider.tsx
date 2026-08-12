import React, {FC, ReactNode, useCallback, useRef, useState} from 'react';
import {NotificationCtx, ToastInput, ToastSeverity} from './NotificationCtx';
import NotificationStack, {ToastItem} from './NotificationStack';

interface NotificationProviderProps {
  children: ReactNode;
}

const maxVisibleNotifications = 4;

const defaultDurations: Record<ToastSeverity, number> = {
  success: 6000,
  warning: 7000,
  error: 10 * 1000,
  info: 6000,
};

const NotificationProvider: FC<NotificationProviderProps> = ({children}) => {
  const [notifications, setNotifications] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const showToast = useCallback((toast: ToastInput) => {
    const severity = toast.severity ?? 'info';
    const notification: ToastItem = {
      ...toast,
      id: `toast-${nextIdRef.current++}`,
      severity,
      autoHideDuration:
        toast.autoHideDuration === undefined ? defaultDurations[severity] : toast.autoHideDuration,
    };

    setNotifications((current) => [...current, notification].slice(-maxVisibleNotifications));
  }, []);

  const handleClose = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  return (
    <>
      <NotificationCtx.Provider value={showToast}>{children}</NotificationCtx.Provider>
      <NotificationStack notifications={notifications} onClose={handleClose} />
    </>
  );
};

export default NotificationProvider;
