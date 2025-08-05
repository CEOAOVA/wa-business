import { useAppOptimized } from '../context/AppContextOptimized';
import { useMemo } from 'react';

export const useNotifications = () => {
  const { state, addNotification, dispatch } = useAppOptimized();
  
  // Calcular conteo de notificaciones no leídas
  const unreadCount = useMemo(() => {
    return state.notifications.filter(notification => !notification.read).length;
  }, [state.notifications]);
  
  return {
    notifications: state.notifications,
    unreadCount,
    addNotification,
    dispatch
  };
}; 