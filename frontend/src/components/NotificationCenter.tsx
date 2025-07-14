import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types';

// Componente individual de notificación
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  // Iconos según el tipo de notificación
  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'assignment':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5z" />
          </svg>
        );
    }
  };

  // Colores según el tipo
  const getTypeColors = () => {
    switch (notification.type) {
      case 'message':
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
      case 'assignment':
        return 'bg-embler-yellow/20 border-embler-yellow/30 text-embler-yellow';
      case 'system':
        return 'bg-gray-600/20 border-gray-600/30 text-gray-300';
      case 'warning':
        return 'bg-red-500/20 border-red-500/30 text-red-400';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  const timeAgo = () => {
    const now = new Date();
    const diff = now.getTime() - notification.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        onClick={handleClick}
        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg ${getTypeColors()} ${
          notification.isRead ? 'opacity-60' : 'opacity-100'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white truncate">
                {notification.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-75">{timeAgo()}</span>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
            
            <p className="text-sm opacity-90 leading-relaxed">
              {notification.message}
            </p>

            {/* Acciones de la notificación */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.action();
                    }}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      action.type === 'primary'
                        ? 'bg-current text-embler-dark'
                        : 'border border-current hover:bg-current hover:text-embler-dark'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast notifications flotantes
export const ToastNotifications: React.FC = () => {
  const { notifications, markAsRead, dismissNotification } = useNotifications();

  // Solo mostrar las 3 notificaciones más recientes no leídas
  const recentNotifications = notifications
    .filter(n => !n.isRead)
    .slice(0, 3);

  if (recentNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {recentNotifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={markAsRead}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};

// Panel completo del centro de notificaciones
const NotificationCenter: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    dismissNotification 
  } = useNotifications();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-embler-gray border-l border-embler-accent z-50 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-embler-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
              {unreadCount > 0 && (
                <span className="bg-embler-yellow text-embler-dark text-xs font-bold rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-embler-yellow hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-embler-accent transition-colors text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-5 5v-5z" />
              </svg>
              <p>No hay notificaciones</p>
            </div>
          ) : (
            notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDismiss={dismissNotification}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter; 