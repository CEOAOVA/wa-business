// Tipos de base de datos - Reemplazo de Prisma
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  STICKER = 'STICKER',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT'
}

export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

// Interfaces para los modelos de base de datos
export interface Contact {
  id: string;
  waId: string;
  name?: string;
  displayName?: string;
  profilePic?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isBlocked: boolean;
  isArchived: boolean;
  isFavorite: boolean;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  waMessageId?: string;
  conversationId: string;
  senderId?: string;
  receiverId?: string;
  content: string;
  messageType: MessageType;
  mediaUrl?: string;
  mediaCaption?: string;
  status: MessageStatus;
  timestamp: Date;
  isFromUs: boolean;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  contactId: string;
  lastMessageId?: string;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactTag {
  id: string;
  contactId: string;
  tagId: string;
  createdAt: Date;
} 