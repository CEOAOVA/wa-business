import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateMessageId } from '../utils/id-generator';

// Tipos
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  error?: string;
  metadata?: any;
}

export interface Chat {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAvatar?: string;
  assignedAgentId?: string;
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'closed' | 'pending';
  aiMode: 'active' | 'inactive' | 'paused';
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  connectionError?: string;
  retryCount: number;
}

export interface AppState {
  // Estado principal
  chats: Chat[];
  messages: Record<string, Message[]>;
  currentChat: Chat | null;
  notifications: Notification[];
  
  // Estado de conexión
  connection: ConnectionState;
  
  // Estado de UI
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  theme: 'light' | 'dark';
  
  // Estado de caché
  cache: {
    lastSync: Date | null;
    pendingMessages: Message[];
    offlineMessages: Message[];
  };
}

export interface AppActions {
  // Gestión de chats
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  selectChat: (chat: Chat) => void;
  clearCurrentChat: () => void;
  
  // Gestión de mensajes
  addMessage: (message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  markMessageAsRead: (chatId: string, messageId: string) => void;
  markChatAsRead: (chatId: string) => void;
  
  // Gestión de conexión
  setConnectionState: (state: Partial<ConnectionState>) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  
  // Gestión de notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Gestión de UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  
  // Gestión de caché
  addPendingMessage: (message: Message) => void;
  removePendingMessage: (messageId: string) => void;
  addOfflineMessage: (message: Message) => void;
  clearOfflineMessages: () => void;
  setLastSync: (date: Date) => void;
  
  // Utilidades
  getChatById: (chatId: string) => Chat | undefined;
  getMessagesByChatId: (chatId: string) => Message[];
  searchChats: (query: string) => Chat[];
  getUnreadCount: () => number;
}

export type AppStore = AppState & AppActions;

// Estado inicial
const initialState: AppState = {
  chats: [],
  messages: {},
  currentChat: null,
  notifications: [],
  connection: {
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
  },
  isLoading: false,
  error: null,
  searchQuery: '',
  theme: 'dark',
  cache: {
    lastSync: null,
    pendingMessages: [],
    offlineMessages: [],
  },
};

// Store principal
export const useAppStore = create<AppStore>()(
  immer((set, get) => ({
    ...initialState,

    // === GESTIÓN DE CHATS ===
    addChat: (chat) =>
      set((state) => {
        const existingIndex = state.chats.findIndex((c) => c.id === chat.id);
        if (existingIndex >= 0) {
          // Actualizar chat existente
          state.chats[existingIndex] = { ...state.chats[existingIndex], ...chat };
        } else {
          // Agregar nuevo chat al inicio
          state.chats.unshift(chat);
        }
      }),

    updateChat: (chatId, updates) =>
      set((state) => {
        const chatIndex = state.chats.findIndex((c) => c.id === chatId);
        if (chatIndex >= 0) {
          state.chats[chatIndex] = { ...state.chats[chatIndex], ...updates };
          
          // Actualizar currentChat si es el seleccionado
          if (state.currentChat?.id === chatId) {
            state.currentChat = { ...state.currentChat, ...updates };
          }
        }
      }),

    removeChat: (chatId) =>
      set((state) => {
        state.chats = state.chats.filter((c) => c.id !== chatId);
        delete state.messages[chatId];
        
        // Limpiar currentChat si es el eliminado
        if (state.currentChat?.id === chatId) {
          state.currentChat = null;
        }
      }),

    selectChat: (chat) =>
      set((state) => {
        state.currentChat = chat;
        // Marcar como leído al seleccionar
        if (chat.unreadCount > 0) {
          get().markChatAsRead(chat.id);
        }
      }),

    clearCurrentChat: () =>
      set((state) => {
        state.currentChat = null;
      }),

    // === GESTIÓN DE MENSAJES ===
    addMessage: (message) =>
      set((state) => {
        // Verificar si el mensaje ya existe
        const existingMessages = state.messages[message.chatId] || [];
        const messageExists = existingMessages.some((m) => m.id === message.id);
        
        if (messageExists) {
          console.log(`🔍 Mensaje ${message.id} ya existe, omitiendo`);
          return;
        }

        // Agregar mensaje
        if (!state.messages[message.chatId]) {
          state.messages[message.chatId] = [];
        }
        state.messages[message.chatId].push(message);

        // Actualizar último mensaje del chat
        const chatIndex = state.chats.findIndex((c) => c.id === message.chatId);
        if (chatIndex >= 0) {
          state.chats[chatIndex].lastMessage = message;
          state.chats[chatIndex].updatedAt = message.timestamp;
          
          // Incrementar contador de no leídos si no es del agente actual
          if (message.senderId !== state.currentChat?.assignedAgentId) {
            state.chats[chatIndex].unreadCount += 1;
          }
        }
      }),

    updateMessage: (chatId, messageId, updates) =>
      set((state) => {
        const messages = state.messages[chatId];
        if (messages) {
          const messageIndex = messages.findIndex((m) => m.id === messageId);
          if (messageIndex >= 0) {
            messages[messageIndex] = { ...messages[messageIndex], ...updates };
          }
        }
      }),

    removeMessage: (chatId, messageId) =>
      set((state) => {
        const messages = state.messages[chatId];
        if (messages) {
          state.messages[chatId] = messages.filter((m) => m.id !== messageId);
        }
      }),

    markMessageAsRead: (chatId, messageId) =>
      set((state) => {
        const messages = state.messages[chatId];
        if (messages) {
          const message = messages.find((m) => m.id === messageId);
          if (message) {
            message.isRead = true;
            message.status = 'read';
          }
        }
      }),

    markChatAsRead: (chatId) =>
      set((state) => {
        // Marcar todos los mensajes del chat como leídos
        const messages = state.messages[chatId];
        if (messages) {
          messages.forEach((message) => {
            message.isRead = true;
            message.status = 'read';
          });
        }

        // Resetear contador de no leídos
        const chatIndex = state.chats.findIndex((c) => c.id === chatId);
        if (chatIndex >= 0) {
          state.chats[chatIndex].unreadCount = 0;
        }
      }),

    // === GESTIÓN DE CONEXIÓN ===
    setConnectionState: (connectionState) =>
      set((state) => {
        state.connection = { ...state.connection, ...connectionState };
      }),

    incrementRetryCount: () =>
      set((state) => {
        state.connection.retryCount += 1;
      }),

    resetRetryCount: () =>
      set((state) => {
        state.connection.retryCount = 0;
      }),

    // === GESTIÓN DE NOTIFICACIONES ===
    addNotification: (notification) =>
      set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: generateMessageId(),
          timestamp: new Date(),
          isRead: false,
        };
        state.notifications.unshift(newNotification);
      }),

    markNotificationAsRead: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        if (notification) {
          notification.isRead = true;
        }
      }),

    removeNotification: (id) =>
      set((state) => {
        state.notifications = state.notifications.filter((n) => n.id !== id);
      }),

    clearNotifications: () =>
      set((state) => {
        state.notifications = [];
      }),

    // === GESTIÓN DE UI ===
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    toggleTheme: () =>
      set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      }),

    // === GESTIÓN DE CACHÉ ===
    addPendingMessage: (message) =>
      set((state) => {
        state.cache.pendingMessages.push(message);
      }),

    removePendingMessage: (messageId) =>
      set((state) => {
        state.cache.pendingMessages = state.cache.pendingMessages.filter(
          (m) => m.id !== messageId
        );
      }),

    addOfflineMessage: (message) =>
      set((state) => {
        state.cache.offlineMessages.push(message);
      }),

    clearOfflineMessages: () =>
      set((state) => {
        state.cache.offlineMessages = [];
      }),

    setLastSync: (date) =>
      set((state) => {
        state.cache.lastSync = date;
      }),

    // === UTILIDADES ===
    getChatById: (chatId) => {
      const state = get();
      return state.chats.find((c) => c.id === chatId);
    },

    getMessagesByChatId: (chatId) => {
      const state = get();
      return state.messages[chatId] || [];
    },

    searchChats: (query) => {
      const state = get();
      if (!query.trim()) return state.chats;
      
      const lowerQuery = query.toLowerCase();
      return state.chats.filter(
        (chat) =>
          chat.clientName.toLowerCase().includes(lowerQuery) ||
          chat.clientPhone.includes(lowerQuery) ||
          chat.lastMessage?.content.toLowerCase().includes(lowerQuery)
      );
    },

    getUnreadCount: () => {
      const state = get();
      return state.chats.reduce((total, chat) => total + chat.unreadCount, 0);
    },
  }))
);

// Selectores optimizados
export const useChats = () => useAppStore((state) => state.chats);
export const useCurrentChat = () => useAppStore((state) => state.currentChat);
export const useMessages = (chatId: string) => useAppStore((state) => state.messages[chatId] || []);
export const useConnection = () => useAppStore((state) => state.connection);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadCount = () => useAppStore((state) => state.getUnreadCount());
export const useTheme = () => useAppStore((state) => state.theme);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error); 