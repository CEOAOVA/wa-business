import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { Notification } from '../types';

// Hook para manejar notificaciones de forma moderna
export function useNotifications() {
  const { state, addNotification, dispatch } = useApp();

  // Crear notificación con auto-dismiss opcional
  const notify = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>,
    autoDismiss = true,
    dismissAfter = 5000
  ) => {
    const notificationId = `notif-${Date.now()}`;
    addNotification(notification);

    // Auto-dismiss si está habilitado
    if (autoDismiss) {
      setTimeout(() => {
        dismissNotification(notificationId);
      }, dismissAfter);
    }

    return notificationId;
  }, [addNotification]);

  // Notificaciones de conveniencia
  const notifySuccess = useCallback((message: string, title = 'Éxito') => {
    return notify({
      type: 'system',
      title,
      message,
      isRead: false,
    });
  }, [notify]);

  const notifyError = useCallback((message: string, title = 'Error') => {
    return notify({
      type: 'warning',
      title,
      message,
      isRead: false,
    }, true, 8000); // Los errores duran más tiempo
  }, [notify]);

  const notifyMessage = useCallback((message: string, title = 'Nuevo mensaje') => {
    return notify({
      type: 'message',
      title,
      message,
      isRead: false,
    });
  }, [notify]);

  const notifyAssignment = useCallback((message: string, title = 'Nueva asignación') => {
    return notify({
      type: 'assignment',
      title,
      message,
      isRead: false,
    });
  }, [notify]);

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
  }, [dispatch]);

  // Descartar notificación
  const dismissNotification = useCallback((notificationId: string) => {
    // Aquí implementaríamos la lógica para remover la notificación
    // Por ahora solo la marcamos como leída
    markAsRead(notificationId);
  }, [markAsRead]);

  // Obtener notificaciones no leídas
  const unreadNotifications = state.notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    state.notifications
      .filter(n => !n.isRead)
      .forEach(n => markAsRead(n.id));
  }, [state.notifications, markAsRead]);

  return {
    notifications: state.notifications,
    unreadNotifications,
    unreadCount,
    notify,
    notifySuccess,
    notifyError,
    notifyMessage,
    notifyAssignment,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
} 