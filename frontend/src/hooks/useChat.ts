import { useAppOptimized } from '../context/AppContextOptimized';
import { useMemo, useCallback } from 'react';

export const useChat = () => {
  const { state, selectChat, sendMessage, markChatAsRead, searchChats } = useAppOptimized();
  
  // Calcular estadísticas de chat
  const chatStats = useMemo(() => {
    const totalChats = state.chats.length;
    const totalUnread = state.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    const activeChats = state.chats.filter(chat => {
      const lastMessageTime = chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).getTime() : new Date(chat.updatedAt).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return lastMessageTime > oneDayAgo;
    }).length;

    // Calcular tiempo promedio de respuesta (simulado por ahora)
    const avgResponseTime = '2.3 min';

    return {
      totalChats,
      totalUnread,
      activeChats,
      avgResponseTime
    };
  }, [state.chats]);

  // Función para cambiar de chat (alias de selectChat)
  const changeChat = useCallback((chat: any) => {
    selectChat(chat);
  }, [selectChat]);

  // Función para realizar búsqueda (alias de searchChats)
  const performSearch = useCallback((query: string) => {
    return searchChats(query);
  }, [searchChats]);

  // Función para obtener tiempo relativo
  const getRelativeTime = useCallback((date: Date | string): string => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Ahora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return messageDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }, []);

  // Función para obtener vista previa del último mensaje
  const getLastMessagePreview = useCallback((chat: any): string => {
    if (!chat.lastMessage) return 'Sin mensajes';
    
    const content = chat.lastMessage.content || '';
    const maxLength = 50;
    
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }, []);
  
  return {
    currentChat: state.currentChat,
    chats: state.chats,
    messages: state.messages,
    chatStats,
    selectChat,
    sendMessage,
    markChatAsRead,
    searchChats,
    changeChat,
    performSearch,
    getRelativeTime,
    getLastMessagePreview
  };
}; 