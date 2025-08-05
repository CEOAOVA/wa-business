import { useAppOptimized } from '../context/AppContextOptimized';
import { useMemo, useCallback } from 'react';

export const useNotifications = () => {
  const { state, addNotification, dispatch } = useAppOptimized();
  
  // Calcular conteo de notificaciones no leídas
  const unreadCount = useMemo(() => {
    return state.notifications.filter(notification => !notification.isRead).length;
  }, [state.notifications]);

  // Función para marcar una notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    dispatch({
      type: 'MARK_NOTIFICATION_READ',
      payload: notificationId
    });
  }, [dispatch]);

  // Función para marcar todas las notificaciones como leídas
  const markAllAsRead = useCallback(() => {
    state.notifications.forEach(notification => {
      if (!notification.isRead) {
        dispatch({
          type: 'MARK_NOTIFICATION_READ',
          payload: notification.id
        });
      }
    });
  }, [state.notifications, dispatch]);

  // Función para descartar una notificación
  const dismissNotification = useCallback((notificationId: string) => {
    // Por ahora, solo marcamos como leída
    // En el futuro se podría implementar una acción específica para descartar
    markAsRead(notificationId);
  }, [markAsRead]);
  
  return {
    notifications: state.notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dispatch
  };
}; 