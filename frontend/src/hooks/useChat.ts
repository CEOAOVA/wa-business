import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNotifications } from './useNotifications';
import { MESSAGES } from '../constants/messages';
import type { Chat, Message } from '../types';

// Hook especializado para operaciones de chat
export function useChat() {
  const { state, selectChat, sendMessage, markChatAsRead, searchChats } = useApp();
  const { notifyMessage } = useNotifications();

  // Obtener mensajes del chat actual
  const currentMessages = useMemo(() => {
    if (!state.currentChat) {
      console.log('📨 [useChat] No hay chat actual');
      return [];
    }
    
    const messages = state.messages[state.currentChat.id] || [];
    console.log(`📨 [useChat] Chat actual: ${state.currentChat.id}`);
    console.log(`📨 [useChat] Mensajes en estado: ${messages.length}`);
    
    // OPTIMIZACIÓN: Filtrar mensajes válidos antes de ordenar
    const validMessages = messages.filter(msg => msg && msg.content && msg.id);
    console.log(`📨 [useChat] Mensajes válidos: ${validMessages.length}`);
    
    // DEBUG: Contar mensajes por tipo de remitente
    if (validMessages.length > 0) {
      const userMessages = validMessages.filter(m => m.senderId === 'user').length;
      const botMessages = validMessages.filter(m => m.senderId === 'bot').length;
      const agentMessages = validMessages.filter(m => m.senderId === 'agent').length;
      
      console.log(`📨 [useChat] Desglose de mensajes: User=${userMessages}, Bot=${botMessages}, Agent=${agentMessages}`);
    }
    
    // Asegurar orden cronológico (más antiguo primero)
    const sortedMessages = validMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeA - timeB;
    });
    
    console.log(`📨 [useChat] Mensajes ordenados: ${sortedMessages.length}`);
    return sortedMessages;
  }, [state.currentChat, state.messages]);

  // Enviar mensaje con notificación
  const sendMessageWithNotification = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!state.currentChat) return;
    
    try {
      await sendMessage(content, type);
      
      // Solo simular respuesta automática para chats no-WhatsApp
      if (!state.currentChat.id.startsWith('whatsapp-')) {
        // Simular respuesta automática del cliente después de enviar
        setTimeout(() => {
          // Solo si seguimos en el mismo chat
          if (state.currentChat) {
            notifyMessage(`Nuevo mensaje de ${state.currentChat.clientName}`, 'Cliente respondió');
          }
        }, 2000 + Math.random() * 3000); // Entre 2-5 segundos
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  }, [state.currentChat, sendMessage, notifyMessage]);

  // Cambiar chat activo con efectos
  const changeChat = useCallback((chat: Chat) => {
    selectChat(chat);
    markChatAsRead(chat.id);
  }, [selectChat, markChatAsRead]);

  // Filtrar chats por estado
  const activeChats = useMemo(() => 
    state.chats.filter(chat => chat.isActive),
    [state.chats]
  );

  const unassignedChats = useMemo(() => 
    state.chats.filter(chat => !chat.assignedAgentId),
    [state.chats]
  );

  const highPriorityChats = useMemo(() => 
    state.chats.filter(chat => chat.priority === 'high'),
    [state.chats]
  );

  // Estadísticas de chat
  const chatStats = useMemo(() => {
    const totalChats = state.chats.length;
    const totalUnread = state.chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    const avgResponseTime = MESSAGES.STATS.AVG_RESPONSE_TIME; // Esto vendría de una API real
    
    return {
      totalChats,
      totalUnread,
      activeChats: activeChats.length,
      unassignedChats: unassignedChats.length,
      highPriorityChats: highPriorityChats.length,
      avgResponseTime,
    };
  }, [state.chats, activeChats, unassignedChats, highPriorityChats]);

  // Buscar en chats con debounce aplicado en el componente
  const performSearch = useCallback((query: string) => {
    return searchChats(query);
  }, [searchChats]);

  // Obtener último mensaje formateado
  const getLastMessagePreview = useCallback((chat: Chat): string => {
    if (!chat.lastMessage) return MESSAGES.TIME.NO_MESSAGES;
    
    const content = chat.lastMessage.content;
    const maxLength = 50;
    
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  }, []);

  // Formatear tiempo relativo
  const getRelativeTime = useCallback((date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return MESSAGES.TIME.NOW;
    if (diffInMinutes < 60) return `${diffInMinutes}${MESSAGES.TIME.MINUTES_SHORT}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}${MESSAGES.TIME.HOURS_SHORT}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}${MESSAGES.TIME.DAYS_SHORT}`;
    
    return date.toLocaleDateString();
  }, []);

  // Verificar si el usuario actual es el remitente
  const isOwnMessage = useCallback((message: Message): boolean => {
    // Los mensajes del agente o bot son los que envía la aplicación
    return message.senderId === 'agent' || message.senderId === 'bot';
  }, []);

  return {
    // Estado
    currentChat: state.currentChat,
    currentMessages,
    chats: state.chats,
    isLoading: state.isLoading,
    error: state.error,
    
    // Chats filtrados
    activeChats,
    unassignedChats,
    highPriorityChats,
    
    // Acciones
    changeChat,
    sendMessage: sendMessageWithNotification,
    markChatAsRead,
    performSearch,
    
    // Utilidades
    getLastMessagePreview,
    getRelativeTime,
    isOwnMessage,
    chatStats,
  };
} 