import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Chat, Message, Notification, AppAction } from '../types';
import { whatsappApi } from '../services/whatsapp-api';
import { dashboardApiService } from '../services/dashboard-api';
import { useWebSocketSimple, type WebSocketMessage, type ConversationUpdateEvent } from '../hooks/useWebSocketSimple';

// Estado inicial
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

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
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
      const messageExists = existingMessages.some((existing: Message) => existing.id === message.id);
      
      if (messageExists) {
        console.log(`🔍 [Reducer] Mensaje ${message.id} ya existe, omitiendo`);
        return state;
      }
      
      // Agregar el nuevo mensaje y ordenar cronológicamente
      const updatedMessages = [...existingMessages, message].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeA - timeB; // Orden ascendente: más antiguo primero
      });
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
        chats: state.chats.map(chat =>
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
        ),
      };
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

// Datos mock modernos y realistas (eliminados por no uso)

// Contexto
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // WebSocket estado
  isWebSocketConnected: boolean;
  webSocketError: string | null;
  // Funciones de conveniencia
  selectChat: (chat: Chat) => void;
  sendMessage: (content: string, type?: Message['type']) => Promise<void>;
  markChatAsRead: (chatId: string) => void;
  searchChats: (query: string) => Chat[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  toggleTheme: () => void;
  // Nuevas funciones para WhatsApp
  loadWhatsAppMessages: () => Promise<void>;
  loadNewSchemaConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  addSentWhatsAppMessage: (to: string, message: string, messageId?: string) => void;
  // Funciones de testing manual
  injectTestWhatsAppMessage: (from: string, message: string, name?: string) => void;
  injectTestOutgoingMessage: (to: string, message: string, name?: string) => void;
  // Funciones de takeover
  updateChatTakeoverMode: (chatId: string, takeoverMode: 'spectator' | 'takeover' | 'ai_only') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Integración WebSocket para mensajería en tiempo real
  const webSocket = useWebSocketSimple();

  // Configurar manejadores de eventos WebSocket
  useEffect(() => {
    // Manejar nuevos mensajes en tiempo real
    webSocket.onNewMessage((data: WebSocketMessage) => {
      console.log('📨 [WebSocket] Nuevo mensaje recibido:', data);
      
      // Determinar el tipo de conversación basado en el conversationId
      let chatId: string;
      let isNewSchema = false;
      
      if (data.conversation.id && !data.conversation.id.startsWith('temp-')) {
        // Conversación del nuevo esquema
        chatId = `conv-${data.conversation.id}`;
        isNewSchema = true;
        console.log(`📨 [WebSocket] Conversación del nuevo esquema: ${chatId}`);
      } else {
        // Conversación legacy (fallback)
        chatId = `whatsapp-${data.message.from === 'us' ? data.message.to : data.message.from}`;
        console.log(`📨 [WebSocket] Conversación legacy: ${chatId}`);
      }
      
      // Crear o actualizar chat
      const existingChat = state.chats.find(c => c.id === chatId);
      if (!existingChat) {
        const newChat: Chat = {
          id: chatId,
          clientId: data.conversation.contactId || data.message.from,
          clientName: data.conversation.contactName || formatPhoneForDisplay(data.message.from === 'us' ? data.message.to : data.message.from),
          clientPhone: data.message.from === 'us' ? data.message.to : data.message.from,
          clientAvatar: undefined,
          assignedAgentId: data.message.from === 'us' ? 'agent-1' : null,
          lastMessage: {
            id: typeof data.message.id === 'string' ? parseInt(data.message.id) || Date.now() : data.message.id,
            chatId: chatId,
            senderId: (data.message.from === 'us' ? 'agent' : 'user') as 'user' | 'agent' | 'bot',
            content: data.message.message,
            type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker',
            timestamp: new Date(data.message.timestamp),
            is_read: data.message.read,
            metadata: { 
              source: isNewSchema ? 'new_schema' : 'whatsapp', 
              waMessageId: data.message.waMessageId,
              conversationId: data.conversation.id
            }
          },
          unreadCount: data.conversation.unreadCount || 0,
          isActive: true,
          createdAt: new Date(data.message.timestamp),
          updatedAt: new Date(data.message.timestamp),
          tags: isNewSchema ? ['conversation'] : ['whatsapp'],
          priority: 'medium',
          status: 'open'
        };
        dispatch({ type: 'ADD_CHAT', payload: newChat });
        console.log(`📨 [WebSocket] Nuevo chat creado: ${chatId}`);
      } else {
                 // Actualizar chat existente
         const updatedChat = {
           ...existingChat,
           lastMessage: {
             id: typeof data.message.id === 'string' ? parseInt(data.message.id) || Date.now() : data.message.id,
             chatId: chatId,
             senderId: (data.message.from === 'us' ? 'agent' : 'user') as 'user' | 'agent' | 'bot',
             content: data.message.message,
             type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker',
             timestamp: new Date(data.message.timestamp),
             is_read: data.message.read,
             metadata: { 
               source: isNewSchema ? 'new_schema' : 'whatsapp', 
               waMessageId: data.message.waMessageId,
               conversationId: data.conversation.id
             }
           },
           unreadCount: data.conversation.unreadCount || existingChat.unreadCount,
           updatedAt: new Date(data.message.timestamp)
         };
        dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
        console.log(`📨 [WebSocket] Chat actualizado: ${chatId}`);
      }

      // Agregar mensaje
      const newMessage: Message = {
        id: data.message.id,
        chatId: chatId,
        senderId: (data.message.from === 'us' ? 'agent' : 'user') as 'user' | 'agent' | 'bot',
        content: data.message.message,
        type: 'text' as 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker',
        timestamp: new Date(data.message.timestamp),
        is_read: data.message.read,
        metadata: { 
          source: isNewSchema ? 'new_schema' : 'whatsapp', 
          waMessageId: data.message.waMessageId,
          conversationId: data.conversation.id
        }
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      console.log(`📨 [WebSocket] Mensaje agregado al estado: ${chatId}`, newMessage);
    });

    // Manejar actualizaciones de conversación
    webSocket.onConversationUpdate((data: ConversationUpdateEvent) => {
      console.log('📝 Actualización de conversación WebSocket:', data);
      // Aquí podrías actualizar contadores de mensajes no leídos, etc.
    });

    // Manejar cambios de conexión
    webSocket.onConnectionChange((connected: boolean) => {
      console.log(`🌐 Estado de conexión WebSocket: ${connected ? 'Conectado' : 'Desconectado'}`);
      if (!connected) {
        dispatch({ type: 'SET_ERROR', payload: 'Conexión WebSocket perdida. Intentando reconectar...' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: null });
      }
    });
  }, [webSocket, state.chats]);

  // Convertir mensaje de WhatsApp a Chat (comentado por no uso actual)
  // const convertWhatsAppToChat = (whatsappMsg: IncomingMessage): Chat => {
  //   const chatId = `whatsapp-${whatsappMsg.from}`;
  //   
  //   return {
  //     id: chatId,
  //     clientId: whatsappMsg.from,
  //     clientName: whatsappMsg.contact?.name || formatPhoneForDisplay(whatsappMsg.from),
  //     clientPhone: whatsappMsg.from,
  //     clientAvatar: undefined,
  //     assignedAgentId: null,
  //     lastMessage: {
  //       id: whatsappMsg.id,
  //       chatId: chatId,
  //       senderId: 'user',
  //       content: whatsappMsg.message,
  //       type: 'text',
  //       timestamp: whatsappMsg.timestamp,
  //       is_read: whatsappMsg.read,
  //       metadata: { source: 'whatsapp' }
  //     },
  //     unreadCount: whatsappMsg.read ? 0 : 1,
  //     isActive: true,
  //     createdAt: whatsappMsg.timestamp,
  //     updatedAt: whatsappMsg.timestamp,
  //     tags: ['whatsapp'],
  //     priority: 'medium',
  //     status: 'open'
  //   };
  // };

  // Formatear número de teléfono para mostrar
  const formatPhoneForDisplay = (phone: string) => {
    if (phone.startsWith('52') && phone.length === 12) {
      return `+52 ${phone.slice(2, 4)} ${phone.slice(4, 8)} ${phone.slice(8)}`;
    }
    return `+${phone}`;
  };

  // Cargar conversaciones del nuevo esquema (FUNCIÓN PRINCIPAL)
  const loadNewSchemaConversations = useCallback(async () => {
    console.log('🔍 [AppContext] Iniciando carga de conversaciones del nuevo esquema...');
    
    try {
      console.log('🔍 [AppContext] Llamando a dashboardApiService.getPublicConversations...');
      const conversations = await dashboardApiService.getPublicConversations();
      
      console.log('🔍 [AppContext] Conversaciones recibidas:', conversations);
      
      if (conversations.length > 0) {
        console.log(`🔍 [AppContext] ${conversations.length} conversaciones encontradas`);
        
                  // Convertir conversaciones a chats del frontend
          conversations.forEach(conv => {
            const chatId = `conv-${conv.id}`;
            
            console.log(`🔍 [AppContext] Procesando conversación ${chatId} (takeover_mode: ${conv.takeover_mode})`);
            
            // Verificar si el chat ya existe en el estado actual
            const existingChat = state.chats.find(c => c.id === chatId);
          
          if (!existingChat) {
            console.log(`🔍 [AppContext] Creando nuevo chat para conversación ${conv.id}`);
            
            // Crear nuevo chat
            const newChat: Chat = {
              id: chatId,
              clientId: conv.contact_phone,
              clientName: conv.contact_phone, // Usar el número como nombre
              clientPhone: conv.contact_phone,
              clientAvatar: undefined,
              assignedAgentId: conv.assigned_agent_id || null,
              lastMessage: null, // Se cargará cuando se carguen los mensajes
              unreadCount: conv.unread_count || 0,
              isActive: conv.status === 'active',
              createdAt: new Date(conv.created_at),
              updatedAt: new Date(conv.updated_at),
              tags: ['conversation'],
              priority: 'medium',
              status: conv.status === 'active' ? 'open' : conv.status,
              takeoverMode: conv.takeover_mode || 'spectator' // Agregar takeover_mode
            };
            
            console.log('🔍 [AppContext] Nuevo chat creado:', newChat);
            dispatch({ type: 'ADD_CHAT', payload: newChat });
          } else {
            console.log(`🔍 [AppContext] Chat ${chatId} ya existe`);
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
        console.log('🔍 [AppContext] No hay conversaciones en el nuevo esquema');
      }
    } catch (error) {
      console.error('❌ [AppContext] Error cargando conversaciones del nuevo esquema:', error);
    }
  }, [state.chats]);

  // Cargar mensajes de WhatsApp (FUNCIÓN LEGACY - DEPRECATED)
  const loadWhatsAppMessages = useCallback(async () => {
    console.log('🔍 [AppContext] Función loadWhatsAppMessages DEPRECATED - usando loadNewSchemaConversations');
    // Esta función ya no se usa, redirigir a la función principal
    await loadNewSchemaConversations();
  }, [loadNewSchemaConversations]);

  // Cargar mensajes de una conversación específica
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    console.log(`📨 [AppContext] Cargando mensajes para conversación: ${conversationId}`);
    
    try {
      // Determinar el tipo de conversación basado en el ID
      if (conversationId.startsWith('conv-')) {
        // Conversación del nuevo esquema
        const actualConversationId = conversationId.replace('conv-', '');
        console.log(`📨 [AppContext] Cargando mensajes del nuevo esquema para: ${actualConversationId}`);
        
        const response = await whatsappApi.getConversationMessages(actualConversationId);
        
        if (response.success && response.data?.messages) {
          console.log(`📨 [AppContext] ${response.data.messages.length} mensajes cargados`);
          
          // Convertir mensajes al formato del frontend
          const frontendMessages: Message[] = response.data.messages.map((msg: any) => ({
            id: msg.id.toString(),
            chatId: conversationId,
            senderId: msg.sender_type, // Mantener el tipo original del backend
            content: msg.content,
            type: msg.message_type || 'text',
            timestamp: new Date(msg.created_at),
            is_read: msg.is_read,
            metadata: {
              whatsapp_message_id: msg.whatsapp_message_id,
              source: 'new_schema'
            }
          }));
          
          // Agregar mensajes al estado
          frontendMessages.forEach(msg => {
            dispatch({ type: 'ADD_MESSAGE', payload: msg });
          });
          
          console.log(`📨 [AppContext] Mensajes agregados al estado para ${conversationId}`);
        } else {
          console.log('📨 [AppContext] No hay mensajes o respuesta fallida:', response);
        }
      } else if (conversationId.startsWith('whatsapp-')) {
        // Conversación de WhatsApp legacy - los mensajes ya se cargan en loadNewSchemaConversations
        console.log(`📨 [AppContext] Conversación WhatsApp ${conversationId} - mensajes ya cargados`);
      } else {
        console.log(`📨 [AppContext] Tipo de conversación no reconocido: ${conversationId}`);
      }
    } catch (error) {
      console.error(`❌ [AppContext] Error cargando mensajes para ${conversationId}:`, error);
    }
  }, []);

  // Polling para nuevos mensajes cada 30 segundos
  useEffect(() => {
    loadNewSchemaConversations();
    const interval = setInterval(() => {
      loadNewSchemaConversations();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNewSchemaConversations]);

  // Funciones de conveniencia
  const selectChat = (chat: Chat) => {
    // Salir de la conversación anterior si existe
    if (state.currentChat) {
      const currentConversationId = extractConversationId(state.currentChat.id);
      if (currentConversationId) {
        webSocket.leaveConversation(currentConversationId);
      }
    }

    dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
    markChatAsRead(chat.id);

    // Unirse a la nueva conversación
    const conversationId = extractConversationId(chat.id);
    if (conversationId) {
      webSocket.joinConversation(conversationId);
    }

    // Cargar mensajes de la conversación seleccionada
    loadConversationMessages(chat.id);
  };

  // Función auxiliar para extraer ID de conversación
  const extractConversationId = (chatId: string): string | null => {
    if (chatId.startsWith('conv-')) {
      return chatId.replace('conv-', '');
    } else if (chatId.startsWith('whatsapp-')) {
      return chatId.replace('whatsapp-', '');
    }
    return null;
  };

  const sendMessage = async (content: string, type: Message['type'] = 'text') => {
    if (!state.currentChat) return;

    // Determinar el tipo de chat basado en el ID
    const isWhatsAppChat = state.currentChat.id.startsWith('whatsapp-');
    const isNewSchemaChat = state.currentChat.id.startsWith('conv-');
    
    if (isNewSchemaChat) {
      // Conversación del nuevo esquema - usar la API correcta
      const conversationId = state.currentChat.id.replace('conv-', '');
      const phoneNumber = state.currentChat.clientPhone;
      
      try {
        console.log(`📤 [AppContext] Enviando mensaje a conversación ${conversationId} (${phoneNumber}): ${content}`);
        
        // Formatear número para envío
        const formattedPhone = whatsappApi.formatPhoneForSending(phoneNumber);
        console.log(`📱 [AppContext] Número original: ${phoneNumber}, formateado: ${formattedPhone}`);
        
        // Usar el endpoint correcto para el nuevo esquema
        const result = await whatsappApi.sendMessage({
          to: formattedPhone,
          message: content
        });

        if (result.success) {
          // Agregar mensaje al historial local
          const sentMessage: Message = {
            id: result.data?.messageId || `sent-${Date.now()}`,
            chatId: state.currentChat.id,
            senderId: 'agent', // Usar el tipo correcto del backend
            content: content,
            type: type,
            timestamp: new Date(),
            is_read: true,
            metadata: { 
              source: 'new_schema', 
              direction: 'outgoing',
              conversationId: conversationId
            }
          };
          
          dispatch({ type: 'ADD_MESSAGE', payload: sentMessage });
          console.log(`✅ [AppContext] Mensaje enviado exitosamente a conversación ${conversationId}`);
        } else {
          console.error(`❌ [AppContext] Error enviando mensaje:`, result.error);
          addNotification({
            type: 'warning',
            title: 'Error al enviar mensaje',
            message: result.error || 'No se pudo enviar el mensaje',
            isRead: false
          });
        }
      } catch (error: any) {
        console.error(`❌ [AppContext] Error enviando mensaje:`, error);
        addNotification({
          type: 'warning',
          title: 'Error de conexión',
          message: 'No se pudo conectar con el servicio',
          isRead: false
        });
      }
    } else if (isWhatsAppChat) {
      // WhatsApp chat legacy - mantener compatibilidad temporal
      const phoneNumber = state.currentChat.clientPhone;
      
      try {
        console.log(`📤 [AppContext] Enviando mensaje WhatsApp legacy a ${phoneNumber}: ${content}`);
        
        // Formatear número para envío
        const formattedPhone = whatsappApi.formatPhoneForSending(phoneNumber);
        console.log(`📱 [AppContext] Número original: ${phoneNumber}, formateado: ${formattedPhone}`);
        
        const result = await whatsappApi.sendMessage({
          to: formattedPhone,
          message: content
        });

        if (result.success) {
          addSentWhatsAppMessage(phoneNumber, content, result.data?.messageId);
          console.log(`✅ [AppContext] Mensaje WhatsApp legacy enviado exitosamente`);
        } else {
          console.error(`❌ [AppContext] Error enviando mensaje WhatsApp legacy:`, result.error);
          addNotification({
            type: 'warning',
            title: 'Error al enviar mensaje',
            message: result.error || 'No se pudo enviar el mensaje a WhatsApp',
            isRead: false
          });
        }
      } catch (error: any) {
        console.error(`❌ [AppContext] Error enviando mensaje WhatsApp legacy:`, error);
        addNotification({
          type: 'warning',
          title: 'Error de conexión',
          message: 'No se pudo conectar con el servicio de WhatsApp',
          isRead: false
        });
      }
    } else {
      // Chat normal (no WhatsApp) - mantener comportamiento existente
      const message: Message = {
        id: `msg-${Date.now()}`,
        chatId: state.currentChat.id,
        senderId: 'agent', // ID del agente actual
        content,
        type,
        timestamp: new Date(),
        is_read: true,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: message });
    }
  };

  const markChatAsRead = (chatId: string) => {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat && chat.unreadCount > 0) {
      dispatch({
        type: 'UPDATE_CHAT',
        payload: { ...chat, unreadCount: 0 },
      });
    }
  };

  const searchChats = (query: string): Chat[] => {
    if (!query.trim()) return state.chats;
    
    const lowercaseQuery = query.toLowerCase();
    return state.chats.filter(chat =>
      chat.clientName.toLowerCase().includes(lowercaseQuery) ||
      chat.clientPhone.includes(query) ||
      chat.lastMessage?.content.toLowerCase().includes(lowercaseQuery) ||
      chat.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  };

  const toggleTheme = () => {
    dispatch({
      type: 'SET_THEME',
      payload: state.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const injectTestWhatsAppMessage = (from: string, message: string, name?: string) => {
    console.log(`🧪 [AppContext] Inyectando mensaje de prueba de ${from}: ${message}`);
    
    const chatId = `whatsapp-${from}`;
    const timestamp = new Date();
    
    // Verificar si el chat existe
    const existingChat = state.chats.find(c => c.id === chatId);
    
    if (!existingChat) {
      // Crear nuevo chat
      const newChat: Chat = {
        id: chatId,
        clientId: from,
        clientName: name || formatPhoneForDisplay(from),
        clientPhone: from,
        clientAvatar: undefined,
        assignedAgentId: null,
        lastMessage: null, // Se actualizará cuando se agregue el mensaje
        unreadCount: 0, // Se actualizará cuando se agregue el mensaje
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: ['whatsapp'],
        priority: 'medium',
        status: 'open'
      };
      
      console.log(`🧪 [AppContext] Creando chat de prueba:`, newChat);
      dispatch({ type: 'ADD_CHAT', payload: newChat });
    }
    
    // Crear mensaje
    const newMessage: Message = {
      id: `test-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chatId: chatId,
      senderId: 'user',
      content: message,
      type: 'text',
      timestamp: timestamp,
      is_read: false,
      metadata: { source: 'whatsapp', isTest: true }
    };
    
    console.log(`🧪 [AppContext] Creando mensaje de prueba:`, newMessage);
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
  };

  // Nueva función: Simular mensaje enviado por nosotros
  const injectTestOutgoingMessage = (to: string, message: string, name?: string) => {
    console.log(`🧪 [AppContext] Inyectando mensaje ENVIADO a ${to}: ${message}`);
    
    const chatId = `whatsapp-${to}`;
    const timestamp = new Date();
    
    // Verificar si el chat existe
    const existingChat = state.chats.find(c => c.id === chatId);
    
    if (!existingChat) {
      // Crear nuevo chat
      const newChat: Chat = {
        id: chatId,
        clientId: to,
        clientName: name || formatPhoneForDisplay(to),
        clientPhone: to,
        clientAvatar: undefined,
        assignedAgentId: null,
        lastMessage: null, // Se actualizará cuando se agregue el mensaje
        unreadCount: 0, // Mensajes enviados por nosotros no aumentan unread
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: ['whatsapp'],
        priority: 'medium',
        status: 'open'
      };
      
      console.log(`🧪 [AppContext] Creando chat de prueba para mensaje enviado:`, newChat);
      dispatch({ type: 'ADD_CHAT', payload: newChat });
    }
    
    // Crear mensaje enviado por nosotros (agente)
    const newMessage: Message = {
      id: `test-sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chatId: chatId,
      senderId: 'agent', // ID del agente (nosotros)
      content: message,
      type: 'text',
      timestamp: timestamp,
      is_read: true, // Los mensajes que enviamos nosotros están leídos por defecto
      metadata: { source: 'whatsapp', isTest: true, direction: 'outgoing' }
    };
    
    console.log(`🧪 [AppContext] Creando mensaje ENVIADO de prueba:`, newMessage);
    dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
  };

  // Nueva función: Agregar mensaje enviado real al historial
  const addSentWhatsAppMessage = (to: string, message: string, messageId?: string) => {
    console.log(`📤 [AppContext] Agregando mensaje enviado a ${to}: ${message}`);
    
    const chatId = `whatsapp-${to}`;
    const timestamp = new Date();
    
    // Verificar si el chat existe
    const existingChat = state.chats.find(c => c.id === chatId);
    
    if (!existingChat) {
      // Crear nuevo chat
      const newChat: Chat = {
        id: chatId,
        clientId: to,
        clientName: formatPhoneForDisplay(to),
        clientPhone: to,
        clientAvatar: undefined,
        assignedAgentId: null,
        lastMessage: null, // Se actualizará cuando se agregue el mensaje
        unreadCount: 0,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: ['whatsapp'],
        priority: 'medium',
        status: 'open'
      };
      
      console.log(`📤 [AppContext] Creando chat para mensaje enviado:`, newChat);
      dispatch({ type: 'ADD_CHAT', payload: newChat });
    }
    
    // Crear mensaje enviado por nosotros
    const sentMessage: Message = {
      id: messageId || `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chatId: chatId,
      senderId: 'agent', // Usar el tipo correcto del backend
      content: message,
      type: 'text',
      timestamp: timestamp,
      is_read: true,
      metadata: { source: 'whatsapp', direction: 'outgoing' }
    };
    
    console.log(`📤 [AppContext] Agregando mensaje enviado al historial:`, sentMessage);
    dispatch({ type: 'ADD_MESSAGE', payload: sentMessage });
  };

  // Función para actualizar el takeover mode de un chat
  const updateChatTakeoverMode = (chatId: string, takeoverMode: 'spectator' | 'takeover' | 'ai_only') => {
    console.log(`🔄 [AppContext] Actualizando takeover mode: ${chatId} -> ${takeoverMode}`);
    
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
      const updatedChat = {
        ...chat,
        takeoverMode
      };
      dispatch({ type: 'UPDATE_CHAT', payload: updatedChat });
      console.log(`✅ [AppContext] Takeover mode actualizado para ${chatId}`);
    } else {
      console.warn(`⚠️ [AppContext] No se encontró chat ${chatId} para actualizar takeover mode`);
    }
  };

  const value: AppContextType = {
    state,
    dispatch,
    // WebSocket estado
    isWebSocketConnected: webSocket.isConnected,
    webSocketError: webSocket.connectionError,
    // Funciones
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
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook para usar el contexto
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}; 