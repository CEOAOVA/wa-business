// ✅ HOOK PERSONALIZADO PARA LA PÁGINA DE CHATS - CORREGIDO v2
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppOptimized } from '../context/AppContextOptimized';
import { useAuth } from '../context/AuthContext';
import { useWebSocketOptimized } from './useWebSocketOptimized';
import { useNotifications } from './useNotifications';
import logger from '../services/logger';
import type { Chat, Message } from '../types';

interface ChatsPageState {
  isLoading: boolean;
  error: string | null;
  activeChat: Chat | null;
  chats: Chat[];
  messages: Message[];
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  stats: {
    totalMessages: number;
    totalChats: number;
    unreadMessages: number;
    connectionLatency: number;
    lastUpdate: Date | null;
  };
}

interface UseChatsPageReturn extends ChatsPageState {
  // Actions
  handleChatSelect: (chat: Chat) => void;
  handleSendMessage: (content: string, type?: 'text' | 'image' | 'audio') => Promise<void>;
  handleMarkAsRead: (chatId: string) => Promise<void>;
  handleArchiveChat: (chatId: string) => Promise<void>;
  handleSearchChats: (query: string) => void;
  handleRefresh: () => Promise<void>;
  // Filters
  setFilter: (filter: 'all' | 'unread' | 'closed') => void;
  currentFilter: 'all' | 'unread' | 'closed';
}

export function useChatsPage(): UseChatsPageReturn {
  // Context hooks
  const { state: appState, dispatch } = useAppOptimized();
  const { state: authState } = useAuth();
  const { addNotification } = useNotifications();
  
  // WebSocket connection
  const { 
    isConnected, 
    connectionQuality,
    onNewMessage,
    onConversationUpdate,
    sendMessage: sendWebSocketMessage
  } = useWebSocketOptimized({
    autoReconnect: true,
    maxRetries: 5
  });
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'unread' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Derived state
  const activeChat = appState.currentChat;
  
  // Get messages for active chat
  const messages = useMemo(() => {
    if (!activeChat) return [];
    return appState.messages[activeChat.id] || [];
  }, [activeChat, appState.messages]);
  
  // Filtered and searched chats
  const filteredChats = useMemo(() => {
    let filtered = [...appState.chats];
    
    // Apply filter
    switch (currentFilter) {
      case 'unread':
        filtered = filtered.filter(chat => (chat.unreadCount || 0) > 0);
        break;
      case 'closed':
        filtered = filtered.filter(chat => chat.status === 'closed');
        break;
      default:
        filtered = filtered.filter(chat => chat.status !== 'closed');
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chat => 
        chat.clientName.toLowerCase().includes(query) ||
        chat.clientPhone.includes(query) ||
        (chat.lastMessage && typeof chat.lastMessage !== 'string' && chat.lastMessage.content
          ? chat.lastMessage.content.toLowerCase().includes(query)
          : false)
      );
    }
    
    // Sort by last activity
    filtered.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
    
    return filtered;
  }, [appState.chats, currentFilter, searchQuery]);
  
  // Statistics
  const stats = useMemo(() => ({
    totalMessages: messages.length,
    totalChats: appState.chats.length,
    unreadMessages: appState.chats.reduce((acc: number, chat: Chat) => acc + (chat.unreadCount || 0), 0),
    connectionLatency: 0, // No tenemos latencia en el hook actual
    lastUpdate
  }), [messages.length, appState.chats, lastUpdate]);
  
  // Connection status
  const connectionStatus = useMemo((): 'connected' | 'connecting' | 'disconnected' | 'error' => {
    if (isConnected) return 'connected';
    if (error) return 'error';
    if (connectionQuality === 'poor') return 'connecting';
    return 'disconnected';
  }, [isConnected, error, connectionQuality]);
  
  /**
   * Initialize page data
   */
  const initializePage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      logger.info('Inicializando página de chats...');
      
      // Los datos ya vienen del AppContext
      // No necesitamos cargar nada adicional
      
      setLastUpdate(new Date());
      logger.info('✅ Página de chats inicializada');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      logger.error('Error inicializando página', { error: errorMessage });
      
      addNotification({
        type: 'warning',
        title: 'Error',
        message: 'No se pudieron cargar las conversaciones',
        isRead: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);
  
  /**
   * Handle chat selection
   */
  const handleChatSelect = useCallback((chat: Chat) => {
    logger.debug('Chat seleccionado', { chatId: chat.id, clientName: chat.clientName });
    
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    
    // Mark as read if has unread messages
    if ((chat.unreadCount || 0) > 0) {
      handleMarkAsRead(chat.id);
    }
  }, [dispatch]);
  
  /**
   * Send message
   */
  const handleSendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'audio' = 'text') => {
    if (!activeChat || !content.trim()) return;
    
    try {
      logger.debug('Enviando mensaje', { chatId: activeChat.id, type });
      
      // Enviar a través del WebSocket (devuelve void)
      await sendWebSocketMessage(activeChat.id, content);
      
      // Add message to local state immediately
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversation_id: activeChat.id,
        content,
        sender_type: 'agent',
        timestamp: new Date()
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      
      addNotification({
        type: 'message',
        title: 'Mensaje enviado',
        message: 'El mensaje se envió correctamente',
        isRead: false
      });
      
    } catch (error) {
      logger.error('Error enviando mensaje', { error });
      
      addNotification({
        type: 'warning',
        title: 'Error',
        message: 'No se pudo enviar el mensaje',
        isRead: false
      });
      
      throw error;
    }
  }, [activeChat, dispatch, addNotification, sendWebSocketMessage]);
  
  /**
   * Mark chat as read
   */
  const handleMarkAsRead = useCallback(async (chatId: string) => {
    try {
      // Buscar el chat actual
      const chat = appState.chats.find(c => c.id === chatId);
      if (!chat) return;
      
      // Actualizar el chat con unreadCount = 0
      const updatedChat = { ...chat, unreadCount: 0 };
      dispatch({ 
        type: 'SET_CURRENT_CHAT', 
        payload: updatedChat
      });
      
      logger.debug('Chat marcado como leído', { chatId });
    } catch (error) {
      logger.error('Error marcando como leído', { chatId, error });
    }
  }, [appState.chats, dispatch]);
  
  /**
   * Archive chat (cambiar estado a closed)
   */
  const handleArchiveChat = useCallback(async (chatId: string) => {
    try {
      const chat = appState.chats.find((c: Chat) => c.id === chatId);
      if (!chat) return;
      
      const isClosed = chat.status === 'closed';
      const newStatus = isClosed ? 'open' : 'closed';
      
      // Actualizar el chat con el nuevo estado
      const updatedChat = { ...chat, status: newStatus } as Chat;
      dispatch({ 
        type: 'SET_CURRENT_CHAT', 
        payload: updatedChat
      });
      
      addNotification({
        type: 'message',
        title: isClosed ? 'Chat reabierto' : 'Chat cerrado',
        message: `El chat con ${chat.clientName} fue ${isClosed ? 'reabierto' : 'cerrado'}`,
        isRead: false
      });
      
      logger.debug('Estado del chat cambiado', { chatId, newStatus });
    } catch (error) {
      logger.error('Error cambiando estado del chat', { chatId, error });
      
      addNotification({
        type: 'warning',
        title: 'Error',
        message: 'No se pudo cambiar el estado del chat',
        isRead: false
      });
    }
  }, [appState.chats, dispatch, addNotification]);
  
  /**
   * Search chats
   */
  const handleSearchChats = useCallback((query: string) => {
    setSearchQuery(query);
    logger.debug('Búsqueda de chats', { query });
  }, []);
  
  /**
   * Refresh data
   */
  const handleRefresh = useCallback(async () => {
    logger.info('Refrescando datos...');
    await initializePage();
  }, [initializePage]);
  
  /**
   * Set filter
   */
  const setFilter = useCallback((filter: 'all' | 'unread' | 'closed') => {
    setCurrentFilter(filter);
    logger.debug('Filtro aplicado', { filter });
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    if (authState.isAuthenticated) {
      initializePage();
    }
  }, [authState.isAuthenticated, initializePage]);
  
  // Setup WebSocket listeners
  useEffect(() => {
    if (!isConnected) return;
    
    // Listen for new messages
    onNewMessage((data: any) => {
      logger.debug('Nuevo mensaje recibido via WebSocket', data);
      
      // Convertir datos del WebSocket a Message
      const message: Message = {
        id: data.id || `msg-${Date.now()}`,
        conversation_id: data.conversationId || data.conversation_id,
        content: data.content || data.message,
        sender_type: data.sender_type || 'user',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: message });
      setLastUpdate(new Date());
    });
    
    // Listen for conversation updates
    onConversationUpdate((update: any) => {
      logger.debug('Conversación actualizada via WebSocket', update);
      
      // Actualizar el chat correspondiente
      const chat = appState.chats.find(c => c.id === update.conversationId);
      if (chat) {
        const updatedChat = { ...chat, ...update.updates };
        dispatch({ 
          type: 'SET_CURRENT_CHAT', 
          payload: updatedChat
        });
      }
      
      setLastUpdate(new Date());
    });
  }, [isConnected, onNewMessage, onConversationUpdate, dispatch, appState.chats]);
  
  // Auto-refresh periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, 300000); // Refresh cada 5 minutos
    
    return () => clearInterval(interval);
  }, [handleRefresh]);
  
  return {
    // State
    isLoading,
    error,
    activeChat,
    chats: filteredChats,
    messages,
    isConnected,
    connectionStatus,
    stats,
    // Actions
    handleChatSelect,
    handleSendMessage,
    handleMarkAsRead,
    handleArchiveChat,
    handleSearchChats,
    handleRefresh,
    // Filters
    setFilter,
    currentFilter
  };
}