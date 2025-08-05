import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Chat, Message, Notification, AppAction } from '../types';
import { whatsappApi } from '../services/whatsapp-api';
import { dashboardApiService } from '../services/dashboard-api';
import { useWebSocketOptimized, type WebSocketMessage, type ConversationUpdateEvent } from '../hooks/useWebSocketOptimized';
import '../utils/auth-debug'; // Cargar herramientas de debug al inicio

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
  loadNewSchemaConversations: () => Promise<void>;
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

  // Formatear número de teléfono para mostrar
  const formatPhoneForDisplay = (phone: string) => {
    if (phone.startsWith('52') && phone.length === 12) {
      return `+52 ${phone.slice(2, 4)} ${phone.slice(4, 8)} ${phone.slice(8)}`;
    }
    return `+${phone}`;
  };

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

  // Función para cargar mensajes de una conversación (debe estar antes de selectChat)
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

  // Memoizar funciones para evitar re-renders innecesarios
  const selectChat = useCallback((chat: Chat) => {
    console.log('📋 [AppContextOptimized] Seleccionando chat:', chat.id);
    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    
    // Cargar mensajes históricos de la conversación automáticamente
    const chatId = chat.id.replace('conv-', ''); // Remover prefijo si existe
    console.log('📨 [AppContextOptimized] Cargando mensajes para conversación:', chatId);
    loadConversationMessages(chatId).catch(error => {
      console.error('❌ [AppContextOptimized] Error cargando mensajes:', error);
    });
  }, [loadConversationMessages]);

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

  // Cargar conversaciones del nuevo esquema (FUNCIÓN PRINCIPAL)
  const loadNewSchemaConversations = useCallback(async () => {
    console.log('🔍 [AppContextOptimized] Iniciando carga de conversaciones del nuevo esquema...');
    
    try {
      console.log('🔍 [AppContextOptimized] Llamando a dashboardApiService.getPublicConversations...');
      const conversations = await dashboardApiService.getPublicConversations();
      
      console.log('🔍 [AppContextOptimized] Conversaciones recibidas:', conversations);
      console.log('🔍 [AppContextOptimized] Tipo de datos:', typeof conversations);
      console.log('🔍 [AppContextOptimized] Es array:', Array.isArray(conversations));
      
      if (conversations && conversations.length > 0) {
        console.log(`🔍 [AppContextOptimized] ${conversations.length} conversaciones encontradas`);
        
        // Convertir conversaciones a chats del frontend
        conversations.forEach((conv, index) => {
          const chatId = `conv-${conv.id}`;
          
          console.log(`🔍 [AppContextOptimized] Procesando conversación ${index + 1}/${conversations.length}:`, {
            id: conv.id,
            contact_phone: conv.contact_phone,
            status: conv.status,
            last_message_at: conv.last_message_at,
            unread_count: conv.unread_count
          });
          
          // Verificar si el chat ya existe en el estado actual
          const existingChat = state.chats.find(c => c.id === chatId);
        
          if (!existingChat) {
            console.log(`🔍 [AppContextOptimized] Creando nuevo chat para conversación ${conv.id}`);
            
            // Crear nuevo chat
            const newChat: Chat = {
              id: chatId,
              clientId: conv.contact_phone,
              clientName: formatPhoneForDisplay(conv.contact_phone), // Formatear el número para mostrar
              clientPhone: conv.contact_phone,
              clientAvatar: undefined,
              assignedAgentId: conv.assigned_agent_id || null,
              lastMessage: conv.last_message_at ? {
                id: `last_${conv.id}`,
                content: 'Último mensaje', // Placeholder - se actualizará cuando se carguen los mensajes
                senderId: 'user',
                chatId: chatId,
                timestamp: new Date(conv.last_message_at),
                type: 'text',
                created_at: conv.last_message_at,
              } : null,
              unreadCount: conv.unread_count || 0,
              isActive: conv.status === 'active',
              createdAt: new Date(conv.created_at),
              updatedAt: new Date(conv.updated_at),
              tags: ['conversation'],
              priority: 'medium',
              status: conv.status === 'active' ? 'open' : conv.status,
              takeoverMode: conv.takeover_mode || 'spectator' // Agregar takeover_mode
            };
            
            console.log('🔍 [AppContextOptimized] Nuevo chat creado:', {
              id: newChat.id,
              clientName: newChat.clientName,
              clientPhone: newChat.clientPhone,
              lastMessage: newChat.lastMessage ? 'Sí' : 'No',
              unreadCount: newChat.unreadCount
            });
            dispatch({ type: 'ADD_CHAT', payload: newChat });
          } else {
            console.log(`🔍 [AppContextOptimized] Chat ${chatId} ya existe`);
            // Actualizar datos del chat existente si es necesario
            if (existingChat.unreadCount !== conv.unread_count || 
                existingChat.updatedAt.getTime() !== new Date(conv.updated_at).getTime()) {
              const updatedChat = {
                ...existingChat,
                unreadCount: conv.unread_count || 0,
                updatedAt: new Date(conv.updated_at),
                status: conv.status === 'active' ? 'open' : (conv.status === 'closed' ? 'closed' : 'waiting') as 'open' | 'assigned' | 'waiting' | 'closed'
              };
              dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
            }
          }
        });
      } else {
        console.log('🔍 [AppContextOptimized] No hay conversaciones en el nuevo esquema');
      }
    } catch (error) {
      console.error('❌ [AppContextOptimized] Error cargando conversaciones del nuevo esquema:', error);
    }
  }, [state.chats]);

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
      const response = await whatsappApi.sendMessage(
        state.currentChat.clientPhone || '',
        content,
        clientId
      );
      
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
      console.log('🔍 [WebSocket] Verificando si es mensaje enviado por nosotros...');
      console.log('🔍 [WebSocket] data.message.from:', data.message.from);
      console.log('🔍 [WebSocket] data.message.clientId:', data.message.clientId);
      
      // VERIFICAR: Si es un mensaje que nosotros enviamos (desde el frontend)
      if (data.message.from === 'us' && data.message.clientId) {
        console.log('🔍 [WebSocket] Mensaje enviado detectado, verificando duplicado...');
        
        // Buscar mensaje optimista existente por clientId
        const chatId = data.message.conversationId;
        const existingMessages = state.messages[chatId] || [];
        console.log('🔍 [WebSocket] Mensajes existentes en chat:', existingMessages.length);
        console.log('🔍 [WebSocket] Buscando clientId:', data.message.clientId);
        
        const existingMessage = existingMessages.find(msg => 
          msg.clientId === data.message.clientId
        );
        
        if (existingMessage) {
          console.log('🔄 [WebSocket] Mensaje optimista encontrado, actualizando...');
          console.log('🔄 [WebSocket] Mensaje existente:', existingMessage);
          
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
          console.log('✅ [WebSocket] Mensaje actualizado, evitando duplicado');
          return; // NO agregar nuevo mensaje
        } else {
          console.log('⚠️ [WebSocket] Mensaje enviado sin optimista encontrado, agregando normalmente');
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

  // Carga inicial de conversaciones al montar el componente
  useEffect(() => {
    console.log('🚀 [AppContextOptimized] Iniciando...');
    
    // Verificar token de autenticación
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
      console.warn('⚠️ No hay token de autenticación, algunas funciones estarán limitadas');
      // No bloquear completamente, pero advertir al usuario
    } else {
      console.log('✅ Token encontrado:', authToken.substring(0, 20) + '...');
    }
    
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Solo cargar conversaciones si hay token
        if (authToken) {
          await loadNewSchemaConversations();
          console.log('✅ [AppContextOptimized] Conversaciones cargadas exitosamente');
        } else {
          console.log('🔒 [AppContextOptimized] Sin token, saltando carga de conversaciones');
        }
        
      } catch (error: any) {
        console.error('❌ [AppContextOptimized] Error:', error);
        
        // Si es error 401, token inválido
        if (error?.status === 401 || error?.response?.status === 401) {
          console.error('❌ Token inválido o expirado');
          localStorage.removeItem('authToken');
          dispatch({ 
            type: 'SET_ERROR', 
            payload: 'Sesión expirada, por favor inicia sesión nuevamente' 
          });
        } else {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: 'Error cargando conversaciones: ' + (error?.message || 'Error desconocido')
          });
        }
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadInitialData();
  }, []); // Solo ejecutar una vez al montar

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
    loadNewSchemaConversations,
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
    loadNewSchemaConversations,
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