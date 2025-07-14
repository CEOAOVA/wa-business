import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Chat, Message, Client, Notification, AppAction } from '../types';
import { whatsappApi, type IncomingMessage } from '../services/whatsapp-api';
import { useWebSocket, type WebSocketMessage, type ConversationUpdateEvent } from '../hooks/useWebSocket';

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
      const existingMessages = state.messages[message.chatId] || [];
      const messageExists = existingMessages.some(existing => existing.id === message.id);
      
      if (messageExists) {
        console.log(`🔍 [Reducer] Mensaje ${message.id} ya existe, omitiendo`);
        return state;
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [message.chatId]: [
            ...existingMessages,
            message,
          ],
        },
        chats: state.chats.map(chat =>
          chat.id === message.chatId
            ? {
                ...chat,
                lastMessage: message,
                unreadCount: message.senderId !== state.currentChat?.assignedAgentId
                  ? chat.unreadCount + 1
                  : chat.unreadCount,
                updatedAt: message.timestamp,
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
        chats: [action.payload, ...state.chats],
      };
    case 'UPDATE_CHAT':
      const existingChatIndex = state.chats.findIndex(c => c.id === action.payload.id);
      if (existingChatIndex === -1) {
        // Si no existe, agregarlo
        return {
          ...state,
          chats: [action.payload, ...state.chats],
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

// Datos mock modernos y realistas
const mockChats: Chat[] = [];

const mockMessages: Record<string, Message[]> = {};

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
  addSentWhatsAppMessage: (to: string, message: string, messageId?: string) => void;
  // Funciones de testing manual
  injectTestWhatsAppMessage: (from: string, message: string, name?: string) => void;
  injectTestOutgoingMessage: (to: string, message: string, name?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    chats: mockChats,
    messages: mockMessages,
  });

  // Integración WebSocket para mensajería en tiempo real
  const webSocket = useWebSocket();

  // Configurar manejadores de eventos WebSocket
  useEffect(() => {
    // Manejar nuevos mensajes en tiempo real
    webSocket.onNewMessage((data: WebSocketMessage) => {
      const chatId = `whatsapp-${data.message.from === 'us' ? data.message.to : data.message.from}`;
      
      // Crear o actualizar chat
      const existingChat = state.chats.find(c => c.id === chatId);
      if (!existingChat) {
        const newChat: Chat = {
          id: chatId,
          clientId: data.conversation.contactId,
          clientName: data.conversation.contactName,
          clientPhone: data.message.from === 'us' ? data.message.to : data.message.from,
          clientAvatar: undefined,
          assignedAgentId: data.message.from === 'us' ? 'agent-1' : null,
          lastMessage: {
            id: data.message.id,
            chatId: chatId,
            senderId: data.message.from === 'us' ? 'agent-1' : data.message.from,
            content: data.message.message,
            type: 'text',
            timestamp: new Date(data.message.timestamp),
            isRead: data.message.read,
            isDelivered: true,
            metadata: { source: 'whatsapp', waMessageId: data.message.waMessageId }
          },
          unreadCount: data.conversation.unreadCount,
          isActive: true,
          createdAt: new Date(data.message.timestamp),
          updatedAt: new Date(data.message.timestamp),
          tags: ['whatsapp'],
          priority: 'medium',
          status: 'open'
        };
        dispatch({ type: 'ADD_CHAT', payload: newChat });
      }

      // Agregar mensaje
      const newMessage: Message = {
        id: data.message.id,
        chatId: chatId,
        senderId: data.message.from === 'us' ? 'agent-1' : data.message.from,
        content: data.message.message,
        type: 'text',
        timestamp: new Date(data.message.timestamp),
        isRead: data.message.read,
        isDelivered: true,
        metadata: { source: 'whatsapp', waMessageId: data.message.waMessageId }
      };
      
      dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      console.log('📨 Mensaje WebSocket agregado al estado:', newMessage);
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

  // Convertir mensaje de WhatsApp a Chat
  const convertWhatsAppToChat = (whatsappMsg: IncomingMessage): Chat => {
    const chatId = `whatsapp-${whatsappMsg.from}`;
    
    return {
      id: chatId,
      clientId: whatsappMsg.from,
      clientName: whatsappMsg.contact?.name || formatPhoneForDisplay(whatsappMsg.from),
      clientPhone: whatsappMsg.from,
      clientAvatar: undefined,
      assignedAgentId: null,
      lastMessage: {
        id: whatsappMsg.id,
        chatId: chatId,
        senderId: whatsappMsg.from,
        content: whatsappMsg.message,
        type: 'text',
        timestamp: whatsappMsg.timestamp,
        isRead: whatsappMsg.read,
        isDelivered: true,
        metadata: { source: 'whatsapp' }
      },
      unreadCount: whatsappMsg.read ? 0 : 1,
      isActive: true,
      createdAt: whatsappMsg.timestamp,
      updatedAt: whatsappMsg.timestamp,
      tags: ['whatsapp'],
      priority: 'medium',
      status: 'open'
    };
  };

  // Formatear número de teléfono para mostrar
  const formatPhoneForDisplay = (phone: string) => {
    if (phone.startsWith('52') && phone.length === 12) {
      return `+52 ${phone.slice(2, 4)} ${phone.slice(4, 8)} ${phone.slice(8)}`;
    }
    return `+${phone}`;
  };

  // Cargar mensajes de WhatsApp
  const loadWhatsAppMessages = async () => {
    console.log('🔍 [AppContext] Iniciando carga de mensajes de WhatsApp...');
    
    try {
      console.log('🔍 [AppContext] Llamando a whatsappApi.getIncomingMessages...');
      const response = await whatsappApi.getIncomingMessages(50, 0);
      
      console.log('🔍 [AppContext] Respuesta recibida:', response);
      
      if (response.success && response.messages.length > 0) {
        console.log(`🔍 [AppContext] ${response.messages.length} mensajes encontrados`);
        
        // Agrupar mensajes por número de teléfono
        const messagesByPhone = response.messages.reduce((acc, msg) => {
          if (!acc[msg.from]) {
            acc[msg.from] = [];
          }
          acc[msg.from].push(msg);
          return acc;
        }, {} as Record<string, IncomingMessage[]>);

        console.log('🔍 [AppContext] Mensajes agrupados por teléfono:', Object.keys(messagesByPhone));

        // Crear chats y mensajes
        Object.entries(messagesByPhone).forEach(([phone, msgs]) => {
          const chatId = `whatsapp-${phone}`;
          
          console.log(`🔍 [AppContext] Procesando chat ${chatId} con ${msgs.length} mensajes`);
          
          // Verificar si el chat ya existe en el estado actual
          let currentChats = state.chats;
          const existingChat = currentChats.find(c => c.id === chatId);
          
          if (!existingChat) {
            console.log(`🔍 [AppContext] Creando nuevo chat para ${phone}`);
            // Crear nuevo chat con el mensaje más reciente
            const latestMsg = msgs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
            const newChat = convertWhatsAppToChat(latestMsg);
            
            console.log('🔍 [AppContext] Nuevo chat creado:', newChat);
            dispatch({ type: 'ADD_CHAT', payload: newChat });
            
            // Actualizar la referencia local para evitar duplicados en el mismo ciclo
            currentChats = [newChat, ...currentChats];
          } else {
            console.log(`🔍 [AppContext] Chat ${chatId} ya existe`);
          }

          // Agregar mensajes nuevos - verificar en el estado actual
          const existingMessages = state.messages[chatId] || [];
          console.log(`🔍 [AppContext] Mensajes existentes en ${chatId}: ${existingMessages.length}`);
          
          // Filtrar solo mensajes que realmente son nuevos
          const newMessages = msgs.filter(msg => {
            const messageExists = existingMessages.some(existing => existing.id === msg.id);
            if (messageExists) {
              console.log(`🔍 [AppContext] Mensaje ${msg.id} ya existe en ${chatId}, omitiendo`);
            }
            return !messageExists;
          });
          
          console.log(`🔍 [AppContext] ${newMessages.length} mensajes nuevos para agregar a ${chatId}`);
          
          // Agregar solo los mensajes nuevos
          newMessages.forEach(msg => {
            console.log(`🔍 [AppContext] Agregando mensaje ${msg.id} al chat ${chatId}`);
            const chatMessage: Message = {
              id: msg.id,
              chatId: chatId,
              senderId: msg.from,
              content: msg.message,
              type: 'text',
              timestamp: msg.timestamp,
              isRead: msg.read,
              isDelivered: true,
              metadata: { source: 'whatsapp' }
            };
            
            dispatch({ type: 'ADD_MESSAGE', payload: chatMessage });
          });
        });
      } else {
        console.log('🔍 [AppContext] No hay mensajes o respuesta fallida:', response);
      }
    } catch (error) {
      console.error('❌ [AppContext] Error cargando mensajes de WhatsApp:', error);
    }
  };

  // Polling para nuevos mensajes cada 30 segundos
  useEffect(() => {
    loadWhatsAppMessages();
    const interval = setInterval(loadWhatsAppMessages, 30000);
    return () => clearInterval(interval);
  }, []);

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
  };

  // Función auxiliar para extraer ID de conversación (asumiendo que viene del backend)
  const extractConversationId = (chatId: string): string | null => {
    // Por ahora usamos el chatId directamente, pero en producción esto vendría de la API
    // cuando carguemos las conversaciones desde el backend
    return chatId.replace('whatsapp-', ''); // Simplificado por ahora
  };

  const sendMessage = async (content: string, type: Message['type'] = 'text') => {
    if (!state.currentChat) return;

    // Extract phone number from chat ID for WhatsApp messages
    const isWhatsAppChat = state.currentChat.id.startsWith('whatsapp-');
    
    if (isWhatsAppChat) {
      // WhatsApp chat - enviar via API real
      const phoneNumber = state.currentChat.clientPhone;
      
      try {
        console.log(`📤 [AppContext] Enviando mensaje WhatsApp a ${phoneNumber}: ${content}`);
        
        const result = await whatsappApi.sendMessage({
          to: phoneNumber,
          message: content
        });

        if (result.success) {
          // Solo agregar al historial si el envío fue exitoso
          addSentWhatsAppMessage(phoneNumber, content, result.data?.messageId);
          console.log(`✅ [AppContext] Mensaje WhatsApp enviado exitosamente`);
        } else {
          console.error(`❌ [AppContext] Error enviando mensaje WhatsApp:`, result.error);
          // Agregar notificación de error
          addNotification({
            type: 'warning',
            title: 'Error al enviar mensaje',
            message: result.error || 'No se pudo enviar el mensaje a WhatsApp',
            isRead: false
          });
        }
      } catch (error: any) {
        console.error(`❌ [AppContext] Error enviando mensaje WhatsApp:`, error);
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
        senderId: 'agent-1', // ID del agente actual
        content,
        type,
        timestamp: new Date(),
        isRead: true,
        isDelivered: true,
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
      senderId: from,
      content: message,
      type: 'text',
      timestamp: timestamp,
      isRead: false,
      isDelivered: true,
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
      senderId: 'agent-1', // ID del agente (nosotros)
      content: message,
      type: 'text',
      timestamp: timestamp,
      isRead: true, // Los mensajes que enviamos nosotros están leídos por defecto
      isDelivered: true,
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
      senderId: 'agent-1', // ID del agente (nosotros)
      content: message,
      type: 'text',
      timestamp: timestamp,
      isRead: true,
      isDelivered: true,
      metadata: { source: 'whatsapp', direction: 'outgoing' }
    };
    
    console.log(`📤 [AppContext] Agregando mensaje enviado al historial:`, sentMessage);
    dispatch({ type: 'ADD_MESSAGE', payload: sentMessage });
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
    addSentWhatsAppMessage,
    injectTestWhatsAppMessage,
    injectTestOutgoingMessage,
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