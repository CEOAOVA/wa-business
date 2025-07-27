// Tipos de agente (nuevo esquema)
export interface Agent {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'supervisor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos de contacto (nuevo esquema)
export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  is_blocked: boolean;
  is_favorite: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

// Tipos de conversación (nuevo esquema)
export interface Conversation {
  id: string;
  contact_phone: string;
  status: 'active' | 'waiting' | 'closed';
  ai_mode: 'active' | 'inactive' | 'paused';
  takeover_mode: 'spectator' | 'takeover' | 'ai_only'; // NUEVO
  assigned_agent_id?: string;
  unread_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

// Tipos de mensaje (nuevo esquema)
export interface Message {
  id: number | string;
  conversation_id?: string;
  sender_type?: 'user' | 'agent' | 'bot';
  content: string;
  message_type?: 'text' | 'image' | 'quote' | 'document';
  whatsapp_message_id?: string;
  is_read?: boolean;
  metadata?: any;
  created_at?: string;
  // Propiedades adicionales para compatibilidad con el frontend
  chatId?: string;
  senderId?: 'user' | 'agent' | 'bot'; // Estandarizado con el backend
  timestamp?: Date;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker';
  isFromBot?: boolean;
}

// Tipos de usuario y autenticación (compatibilidad)
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  whatsappNumber: string;
  role: 'agent' | 'admin';
  isOnline: boolean;
  lastSeen: Date;
  status: 'active' | 'inactive' | 'busy';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Tipos de chat (compatibilidad con frontend existente)
export interface Chat {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAvatar?: string;
  assignedAgentId: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'assigned' | 'waiting' | 'closed';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  company?: string;
  notes?: string;
  tags: string[];
  createdAt: Date;
  lastInteraction: Date;
}

// Estados globales de la aplicación
export interface AppState {
  currentChat: Chat | null;
  chats: Chat[];
  messages: Record<string, Message[]>;
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  notifications: Notification[];
  theme: 'dark' | 'light';
}

export interface Notification {
  id: string;
  type: 'message' | 'assignment' | 'system' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  type: 'primary' | 'secondary';
}

// Tipos de API
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SendMessageRequest {
  chatId: string;
  content: string;
  type: Message['message_type'];
}

// Tipos de componentes
export interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: (chat: Chat) => void;
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User | Client;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Tipos de hooks
export interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseWebSocketOptions {
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Tipos de configuración
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  apiTimeout: number;
  retryAttempts: number;
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
    };
  };
}

// Utilidades de tipo
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Tipos de eventos
export type ChatEvent = 
  | { type: 'message_received'; payload: Message }
  | { type: 'message_sent'; payload: Message }
  | { type: 'chat_assigned'; payload: { chatId: string; agentId: string } }
  | { type: 'agent_status_changed'; payload: { agentId: string; status: User['status'] } }
  | { type: 'typing_start'; payload: { chatId: string; userId: string } }
  | { type: 'typing_stop'; payload: { chatId: string; userId: string } };

export type AppAction =
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_THEME'; payload: 'dark' | 'light' }; 

// Tipos de takeover
export interface TakeoverMode {
  mode: 'spectator' | 'takeover' | 'ai_only';
  assignedAgentId?: string;
  reason?: string;
}

export interface TakeoverRequest {
  conversationId: string;
  mode: 'spectator' | 'takeover' | 'ai_only';
  agentId?: string;
  reason?: string;
} 