import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Chat, Message, Notification, AppAction } from '../types';
import { whatsappApi } from '../services/whatsapp-api';
import { dashboardApiService } from '../services/dashboard-api';
import { useWebSocketOptimized, type WebSocketMessage, type ConversationUpdateEvent } from '../hooks/useWebSocketOptimized';

// Estado inicial optimizado
const initialState: AppState = {
  currentChat: null,
  chats: [],
  messages: {},
  clients: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  notifications: [],
  theme: 'dark',
};

// Reducer optimizado con mejor manejo de duplicados
const appReducerOptimized = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_CURRENT_CHAT':
      return {
        ...state,
        currentChat: action.payload,
      };
    case 'ADD_MESSAGE':
      const message = action.payload;
      
      // Verificar si el mensaje ya existe para evitar duplicados
      const chatId = message.chatId || message.conversation_id || '';
      const existingMessages = state.messages[chatId] || [];
      
      // MEJORADO: Verificar duplicados por client_id, id, o waMessageId con mejor lógica
      const messageExists = existingMessages.some((existing: Message) => {
        // Verificar por ID exacto
        if (existing.id === message.id && message.id) {
          console.log(`🔍 [Reducer] Mensaje duplicado por ID: ${message.id}`);
          return true;
        }
        
        // Verificar por WhatsApp Message ID
        if (existing.waMessageId && existing.waMessageId === message.waMessageId && message.waMessageId) {
          console.log(`🔍 [Reducer] Mensaje duplicado por waMessageId: ${message.waMessageId}`);
          return true;
        }
        
        // Verificar por client_id
        if (existing.clientId && existing.clientId === message.clientId && message.clientId) {
          console.log(`🔍 [Reducer] Mensaje duplicado por clientId: ${message.clientId}`);
          return true;
        }
        
        // Verificar por contenido y timestamp (fallback)
        if (existing.content === message.content && 
            existing.timestamp && message.timestamp &&
            Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000) {
          console.log(`🔍 [Reducer] Mensaje duplicado por contenido y timestamp`);
          return true;
        }
        
        return false;
      });
      
      if (messageExists) {
        console.log(`🔍 [Reducer] Mensaje ya existe, verificando actualización:`, {
          id: message.id,
          waMessageId: message.waMessageId,
          clientId: message.clientId,
          content: message.content.substring(0, 50)
        });
        
        // MEJORADO: Buscar mensaje existente para actualizar
        const existingMessageIndex = existingMessages.findIndex((existing: Message) => 
          (existing.clientId && existing.clientId === message.clientId) ||
          (existing.waMessageId && existing.waMessageId === message.waMessageId) ||
          (existing.id === message.id && message.id)
        );
        
        if (existingMessageIndex !== -1) {
          console.log(`🔄 [Reducer] Actualizando mensaje existente con datos del servidor`);
          // Actualizar mensaje existente con datos del servidor
          const updatedMessages = [...existingMessages];
          updatedMessages[existingMessageIndex] = {
            ...updatedMessages[existingMessageIndex],
            id: message.id || updatedMessages[existingMessageIndex].id,
            waMessageId: message.waMessageId || updatedMessages[existingMessageIndex].waMessageId,
            // Mantener client_id para futuras verificaciones
            clientId: message.clientId || updatedMessages[existingMessageIndex].clientId
          };
          
          return {
            ...state,
            messages: {
              ...state.messages,
              [chatId]: updatedMessages,
            }
          };
        }
        
        // Si no hay datos del servidor para actualizar, mantener el estado actual
        console.log(`🔍 [Reducer] Mensaje duplicado sin datos del servidor, omitiendo`);
        return state;
      }
      
      // Agregar el nuevo mensaje y ordenar cronológicamente
      const updatedMessages = [...existingMessages, message].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB; // Orden ascendente: más antiguo primero
      });
      
      // Actualizar chat con el nuevo mensaje
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: message,
              unreadCount: message.senderId !== state.currentChat?.assignedAgentId
                ? chat.unreadCount + 1
                : chat.unreadCount,
              updatedAt: message.timestamp || new Date(message.created_at || Date.now()),
            }
          : chat
      );
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
        chats: updatedChats,
      };
    case 'UPDATE_MESSAGE':
      const { clientId, updates } = action.payload;
      const chatIdToUpdate = Object.keys(state.messages).find(chatId => 
        state.messages[chatId]?.some(msg => msg.clientId === clientId)
      );
      
      if (chatIdToUpdate) {
        const updatedMessages = state.messages[chatIdToUpdate].map(msg =>
          msg.clientId === clientId ? { ...msg, ...updates } : msg
        );
        
        return {
          ...state,
          messages: {
            ...state.messages,
            [chatIdToUpdate]: updatedMessages,
          }
        };
      }
      return state;
    case 'ADD_CHAT':
      // Verificar si el chat ya existe para evitar duplicados
      const existingChat = state.chats.find(c => c.id === action.payload.id);
      if (existingChat) {
        console.log(`🔍 [Reducer] Chat ${action.payload.id} ya existe, omitiendo`);
        return state;
      }
      return {
        ...state,
        chats: [...state.chats, action.payload], // Agregar al final, no al principio
      };
    case 'UPDATE_CHAT':
      const existingChatIndex = state.chats.findIndex(c => c.id === action.payload.id);
      if (existingChatIndex === -1) {
        // Si no existe, agregarlo al final
        return {
          ...state,
          chats: [...state.chats, action.payload],
        };
      }
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.id ? action.payload : chat
        ),
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        ),
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    default:
      return state;
  }
};

// Contexto optimizado
interface AppContextOptimizedType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // WebSocket estado optimizado
  isWebSocketConnected: boolean;
  webSocketError: string | null;
  connectionQuality: 'excellent' | 'good' | 'poor';
  // Funciones de conveniencia optimizadas
  selectChat: (chat: Chat) => void;
  sendMessage: (content: string, type?: Message['type']) => Promise<void>;
  markChatAsRead: (chatId: string) => void;
  searchChats: (query: string) => Chat[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  toggleTheme: () => void;
  // Nuevas funciones para WhatsApp optimizadas
  loadWhatsAppMessages: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  addSentWhatsAppMessage: (to: string, message: string, messageId?: string) => void;
  // Funciones de testing manual optimizadas
  injectTestWhatsAppMessage: (from: string, message: string, name?: string) => void;
  injectTestOutgoingMessage: (to: string, message: string, name?: string) => void;
  // Funciones de takeover optimizadas
  updateChatTakeoverMode: (chatId: string, takeoverMode: 'spectator' | 'takeover' | 'ai_only') => void;
}

interface AppProviderOptimizedProps {
  children: ReactNode;
}

export const AppProviderOptimized: React.FC<AppProviderOptimizedProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducerOptimized, initialState);

  // WebSocket optimizado
  const {
    isConnected: isWebSocketConnected,
    connectionError: webSocketError,
    connectionQuality,
    onNewMessage,
    onConversationUpdate,
  } = useWebSocketOptimized({
    maxRetries: 10,
    baseDelay: 300,
    heartbeatInterval: 20000,
    messageQueueSize: 50
  });

  // Memoizar funciones para evitar re-renders innecesarios
  const selectChat = useCallback((chat: Chat) => {
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
  }, []);

  const markChatAsRead = useCallback((chatId: string) => {
    dispatch({
      type: 'UPDATE_CHAT',
      payload: {
        id: chatId,
        clientId: chatId,
        clientName: 'Cliente',
        clientPhone: '',
        assignedAgentId: null,
        lastMessage: null,
        unreadCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        priority: 'medium',
        status: 'open'
      } as Chat
    });
  }, []);

  const searchChats = useCallback((query: string): Chat[] => {
    if (!query.trim()) return state.chats;
    
    const searchTerm = query.toLowerCase();
    return state.chats.filter(chat =>
      chat.clientName?.toLowerCase().includes(searchTerm) ||
      chat.lastMessage?.content?.toLowerCase().includes(searchTerm)
    );
  }, [state.chats]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
  }, [state.theme]);

  // Funciones optimizadas para WhatsApp
  const loadWhatsAppMessages = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await whatsappApi.getMessages();
      if (response.success && response.data) {
        // Procesar mensajes de WhatsApp
        response.data.forEach((message: any) => {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: message.id,
              waMessageId: message.waMessageId,
              content: message.content,
              senderId: message.from,
              chatId: `whatsapp-conv-${message.conversationId}`,
              timestamp: new Date(message.timestamp),
              type: message.type || 'text',
              created_at: message.timestamp,
            }
          });
        });
      }
    } catch (error) {
      console.error('Error cargando mensajes WhatsApp:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error cargando mensajes' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await dashboardApiService.getConversationMessages(conversationId);
      if (response.success && response.data) {
        response.data.forEach((message: any) => {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: message.id,
              content: message.content,
              senderId: message.sender_id,
              chatId: conversationId,
              timestamp: new Date(message.created_at),
              type: message.type || 'text',
              created_at: message.created_at,
            }
          });
        });
      }
    } catch (error) {
      console.error('Error cargando mensajes de conversación:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error cargando mensajes' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const sendMessage = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!state.currentChat) return;
    
    try {
      // NUEVO: Generar client_id único para este mensaje
      const clientId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Crear mensaje optimista con client_id
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        content,
        senderId: 'agent',
        chatId: state.currentChat.id,
        conversation_id: state.currentChat.id, // NUEVO: Incluir conversation_id
        timestamp: new Date(),
        type,
        created_at: new Date().toISOString(),
        clientId: clientId, // NUEVO: Incluir client_id
        sender_type: 'agent', // NUEVO: Incluir sender_type
        message_type: type === 'text' ? 'text' : type === 'image' ? 'image' : type === 'document' ? 'document' : 'text', // NUEVO: Incluir message_type
      };
      
      console.log('📤 [sendMessage] Agregando mensaje optimista:', optimisticMessage);
      // Agregar mensaje optimista inmediatamente
      dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
      
      // Enviar mensaje al servidor con client_id
      const response = await whatsappApi.sendMessage({
        to: state.currentChat.clientPhone || '',
        message: content,
        clientId: clientId // NUEVO: Incluir client_id
      });
      
      if (response.success) {
        console.log('✅ [sendMessage] Mensaje enviado exitosamente:', response);
        
        // NUEVO: Actualizar mensaje optimista con datos del servidor
        const confirmedMessage: Message = {
          ...optimisticMessage,
          id: response.data?.messageId || optimisticMessage.id,
          waMessageId: response.data?.waMessageId,
          clientId: clientId // Mantener client_id para deduplicación
        };
        
        console.log('🔄 [sendMessage] Actualizando mensaje optimista con datos del servidor:', confirmedMessage);
        
        // MEJORADO: Actualizar mensaje optimista existente en lugar de agregar uno nuevo
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            clientId: clientId,
            updates: {
              id: response.data?.messageId || optimisticMessage.id,
              waMessageId: response.data?.waMessageId,
            }
          }
        });
      } else {
        console.error('❌ [sendMessage] Error enviando mensaje:', response);
        // Remover mensaje optimista si falló
        dispatch({
          type: 'SET_ERROR',
          payload: 'Error enviando mensaje'
        });
      }
    } catch (error) {
      console.error('❌ [sendMessage] Error enviando mensaje:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error enviando mensaje' });
    }
  }, [state.currentChat]);

  const addSentWhatsAppMessage = useCallback((to: string, message: string, messageId?: string) => {
    const sentMessage: Message = {
      id: messageId || `sent_${Date.now()}`,
      content: message,
      senderId: 'agent',
      chatId: `whatsapp-conv-${to}`,
      timestamp: new Date(),
      type: 'text',
      created_at: new Date().toISOString(),
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: sentMessage });
  }, []);

  // Funciones de testing optimizadas
  const injectTestWhatsAppMessage = useCallback((from: string, message: string, name?: string) => {
    const testMessage: Message = {
      id: `test_${Date.now()}`,
      content: message,
      senderId: 'user',
      chatId: `whatsapp-conv-${from}`,
      timestamp: new Date(),
      type: 'text',
      created_at: new Date().toISOString(),
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: testMessage });
    
    // Crear o actualizar chat
    const chatId = `whatsapp-conv-${from}`;
    const existingChat = state.chats.find(c => c.id === chatId);
    
    if (!existingChat) {
      dispatch({
        type: 'ADD_CHAT',
        payload: {
          id: chatId,
          clientId: from,
          clientName: name || `Cliente ${from}`,
          clientPhone: from,
          assignedAgentId: null,
          lastMessage: testMessage,
          unreadCount: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          priority: 'medium',
          status: 'open'
        } as Chat
      });
    } else {
      dispatch({
        type: 'UPDATE_CHAT',
        payload: {
          ...existingChat,
          lastMessage: testMessage,
          unreadCount: existingChat.unreadCount + 1,
          updatedAt: new Date(),
        }
      });
    }
  }, [state.chats]);

  const injectTestOutgoingMessage = useCallback((to: string, message: string) => {
    const testMessage: Message = {
      id: `test_out_${Date.now()}`,
      content: message,
      senderId: 'agent',
      chatId: `whatsapp-conv-${to}`,
      timestamp: new Date(),
      type: 'text',
      created_at: new Date().toISOString(),
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: testMessage });
  }, []);

  const updateChatTakeoverMode = useCallback((chatId: string, takeoverMode: 'spectator' | 'takeover' | 'ai_only') => {
    // Esta función se implementaría según la lógica de takeover
    console.log(`Updating takeover mode for chat ${chatId} to ${takeoverMode}`);
  }, []);

  // Configurar listeners de WebSocket optimizados
  useEffect(() => {
    const handleNewMessage = (data: WebSocketMessage) => {
      console.log('📨 [WebSocket] Nuevo mensaje recibido:', data);
      
      // VERIFICAR: Si es un mensaje que nosotros enviamos (desde el frontend)
      if (data.message.from === 'us' && data.message.clientId) {
        console.log('🔍 [WebSocket] Mensaje enviado detectado, verificando duplicado...');
        
        // Buscar mensaje optimista existente por clientId
        const chatId = data.message.conversationId;
        const existingMessages = state.messages[chatId] || [];
        const existingMessage = existingMessages.find(msg => 
          msg.clientId === data.message.clientId
        );
        
        if (existingMessage) {
          console.log('🔄 [WebSocket] Actualizando mensaje optimista con datos del servidor');
          
          // Actualizar mensaje optimista con datos del servidor
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              clientId: data.message.clientId,
              updates: {
                id: data.message.id,
                waMessageId: data.message.waMessageId,
                timestamp: new Date(data.message.timestamp),
                created_at: data.message.timestamp.toISOString(),
              }
            }
          });
          return; // NO agregar nuevo mensaje
        }
      }
      
      // Para mensajes entrantes o mensajes sin clientId, agregar normalmente
      const message: Message = {
        id: data.message.id,
        waMessageId: data.message.waMessageId,
        content: data.message.message,
        senderId: data.message.from === 'us' ? 'agent' : 'user',
        chatId: data.message.conversationId,
        conversation_id: data.message.conversationId,
        timestamp: new Date(data.message.timestamp),
        type: data.message.type as Message['type'],
        created_at: data.message.timestamp.toISOString(),
        clientId: data.message.clientId,
        sender_type: data.message.from === 'us' ? 'agent' : 'user',
        message_type: data.message.type === 'text' ? 'text' : data.message.type === 'image' ? 'image' : data.message.type === 'document' ? 'document' : 'text',
      };
      
      console.log('📨 [WebSocket] Mensaje procesado para dispatch:', message);
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    };

    const handleConversationUpdate = (data: ConversationUpdateEvent) => {
      console.log('📝 [WebSocket] Conversación actualizada:', data);
      dispatch({
        type: 'UPDATE_CHAT',
        payload: {
          id: data.conversationId,
          lastMessage: data.lastMessage,
          unreadCount: data.unreadCount,
          updatedAt: new Date(),
        } as Chat
      });
    };

    // Registrar los callbacks
    onNewMessage(handleNewMessage);
    onConversationUpdate(handleConversationUpdate);
  }, [onNewMessage, onConversationUpdate, state.messages]);

  // Memoizar el valor del contexto para evitar re-renders
  const contextValue = useMemo<AppContextOptimizedType>(() => ({
    state,
    dispatch,
    isWebSocketConnected,
    webSocketError,
    connectionQuality,
    selectChat,
    sendMessage,
    markChatAsRead,
    searchChats,
    addNotification,
    toggleTheme,
    loadWhatsAppMessages,
    loadConversationMessages,
    addSentWhatsAppMessage,
    injectTestWhatsAppMessage,
    injectTestOutgoingMessage,
    updateChatTakeoverMode,
  }), [
    state,
    isWebSocketConnected,
    webSocketError,
    connectionQuality,
    selectChat,
    sendMessage,
    markChatAsRead,
    searchChats,
    addNotification,
    toggleTheme,
    loadWhatsAppMessages,
    loadConversationMessages,
    addSentWhatsAppMessage,
    injectTestWhatsAppMessage,
    injectTestOutgoingMessage,
    updateChatTakeoverMode,
  ]);

  return (
    <AppContextOptimized.Provider value={contextValue}>
      {children}
    </AppContextOptimized.Provider>
  );
};

// Crear el contexto
const AppContextOptimized = createContext<AppContextOptimizedType | undefined>(undefined);

// Hook optimizado para usar el contexto
export const useAppOptimized = (): AppContextOptimizedType => {
  const context = useContext(AppContextOptimized);
  if (context === undefined) {
    throw new Error('useAppOptimized must be used within an AppProviderOptimized');
  }
  return context;
}; 