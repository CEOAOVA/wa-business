// Tipos de usuario y autenticación
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

// Tipos de mensajes y chats
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'system';
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  isFromBot?: boolean;
  metadata?: Record<string, any>;
  // Media fields
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER';
  mediaSize?: number;
  mediaFileName?: string;
}

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
  type: Message['type'];
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