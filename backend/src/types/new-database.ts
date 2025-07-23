/**
 * Nuevas interfaces TypeScript para la estructura de tablas actualizada
 * Implementa el sistema de registro de mensajes con agents, contacts, conversations y messages
 */

// ========================================
// INTERFACES PRINCIPALES
// ========================================

export interface Agent {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  role: 'agent' | 'supervisor' | 'admin';
  metadata?: Record<string, any>;
}

export interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  created_at: string;
  updated_at: string;
  last_interaction: string;
  total_conversations: number;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  contact_id: string;
  agent_id?: string;
  started_at: string;
  ended_at?: string;
  status: 'open' | 'closed' | 'escalated' | 'waiting';
  ai_mode: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'agent' | 'contact';
  sender_id: string;
  content: string;
  timestamp: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
  whatsapp_message_id?: string;
  media_url?: string;
  media_caption?: string;
  is_delivered: boolean;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

// ========================================
// INTERFACES PARA CREACIÓN/ACTUALIZACIÓN
// ========================================

export interface CreateAgentRequest {
  name: string;
  email: string;
  role?: 'agent' | 'supervisor' | 'admin';
  metadata?: Record<string, any>;
}

export interface UpdateAgentRequest {
  name?: string;
  email?: string;
  is_active?: boolean;
  role?: 'agent' | 'supervisor' | 'admin';
  metadata?: Record<string, any>;
}

export interface CreateContactRequest {
  phone_number: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface UpdateContactRequest {
  name?: string;
  metadata?: Record<string, any>;
}

export interface CreateConversationRequest {
  contact_id: string;
  agent_id?: string;
  status?: 'open' | 'closed' | 'escalated' | 'waiting';
  ai_mode?: 'active' | 'inactive';
  metadata?: Record<string, any>;
}

export interface UpdateConversationRequest {
  agent_id?: string;
  ended_at?: string;
  status?: 'open' | 'closed' | 'escalated' | 'waiting';
  ai_mode?: 'active' | 'inactive';
  metadata?: Record<string, any>;
}

export interface CreateMessageRequest {
  conversation_id: string;
  sender_type: 'agent' | 'contact';
  sender_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
  whatsapp_message_id?: string;
  media_url?: string;
  media_caption?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMessageRequest {
  is_delivered?: boolean;
  is_read?: boolean;
  metadata?: Record<string, any>;
}

// ========================================
// INTERFACES PARA QUERIES Y FILTROS
// ========================================

export interface ConversationFilters {
  agent_id?: string;
  contact_id?: string;
  status?: 'open' | 'closed' | 'escalated' | 'waiting';
  ai_mode?: 'active' | 'inactive';
  started_after?: string;
  started_before?: string;
  limit?: number;
  offset?: number;
}

export interface MessageFilters {
  conversation_id?: string;
  sender_type?: 'agent' | 'contact';
  sender_id?: string;
  message_type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
  after_timestamp?: string;
  before_timestamp?: string;
  limit?: number;
  offset?: number;
}

export interface ContactFilters {
  phone_number?: string;
  name?: string;
  has_conversations?: boolean;
  last_interaction_after?: string;
  last_interaction_before?: string;
  limit?: number;
  offset?: number;
}

export interface AgentFilters {
  email?: string;
  role?: 'agent' | 'supervisor' | 'admin';
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ========================================
// INTERFACES PARA RESPUESTAS
// ========================================

export interface ConversationWithDetails extends Conversation {
  contact: Contact;
  agent?: Agent;
  message_count: number;
  last_message?: Message;
}

export interface MessageWithDetails extends Message {
  conversation: Conversation;
  sender_agent?: Agent;
  sender_contact?: Contact;
}

export interface ContactWithDetails extends Contact {
  conversations: Conversation[];
  total_messages: number;
  assigned_agent?: Agent;
}

export interface AgentWithDetails extends Agent {
  active_conversations: number;
  total_conversations: number;
  total_messages: number;
}

// ========================================
// INTERFACES PARA ESTADÍSTICAS
// ========================================

export interface ConversationStats {
  total_conversations: number;
  open_conversations: number;
  closed_conversations: number;
  escalated_conversations: number;
  conversations_with_ai: number;
  conversations_with_agents: number;
}

export interface MessageStats {
  total_messages: number;
  messages_from_contacts: number;
  messages_from_agents: number;
  messages_today: number;
  messages_this_week: number;
  messages_this_month: number;
}

export interface AgentStats {
  agent_id: string;
  agent_name: string;
  active_conversations: number;
  total_conversations: number;
  total_messages: number;
  avg_response_time: number; // en minutos
  customer_satisfaction?: number; // 1-5
}

export interface ContactStats {
  contact_id: string;
  contact_name?: string;
  phone_number: string;
  total_conversations: number;
  total_messages: number;
  last_interaction: string;
  assigned_agent?: string;
}

// ========================================
// INTERFACES PARA WHATSAPP INTEGRATION
// ========================================

export interface WhatsAppMessageData {
  whatsapp_message_id: string;
  from_wa_id: string;
  to_wa_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
  media_url?: string;
  media_caption?: string;
  timestamp: string;
  contact_name?: string;
}

export interface ProcessedWhatsAppMessage {
  conversation_id: string;
  contact_id: string;
  agent_id?: string;
  message: Message;
  conversation_updated: boolean;
  contact_created: boolean;
}

// ========================================
// INTERFACES PARA MIGRACIÓN
// ========================================

export interface MigrationData {
  original_conversation_id: string;
  original_message_id: string;
  new_conversation_id: string;
  new_message_id: string;
  migration_timestamp: string;
}

export interface MigrationReport {
  timestamp: string;
  contacts_migrated: number;
  conversations_migrated: number;
  messages_migrated: number;
  total_contacts: number;
  total_conversations: number;
  total_messages: number;
  errors: string[];
  warnings: string[];
}

// ========================================
// INTERFACES PARA WEBSOCKET EVENTS
// ========================================

export interface WebSocketMessageEvent {
  type: 'message_created' | 'message_updated' | 'conversation_updated' | 'agent_assigned';
  data: Message | Conversation | Agent;
  timestamp: string;
}

export interface WebSocketConversationEvent {
  type: 'conversation_created' | 'conversation_updated' | 'conversation_closed';
  data: ConversationWithDetails;
  timestamp: string;
}

// ========================================
// TIPOS DE UTILIDAD
// ========================================

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact';
export type SenderType = 'agent' | 'contact';
export type ConversationStatus = 'open' | 'closed' | 'escalated' | 'waiting';
export type AIMode = 'active' | 'inactive';
export type AgentRole = 'agent' | 'supervisor' | 'admin';

// ========================================
// CONSTANTES
// ========================================

export const MESSAGE_TYPES: MessageType[] = ['text', 'image', 'audio', 'video', 'document', 'location', 'contact'];
export const SENDER_TYPES: SenderType[] = ['agent', 'contact'];
export const CONVERSATION_STATUSES: ConversationStatus[] = ['open', 'closed', 'escalated', 'waiting'];
export const AI_MODES: AIMode[] = ['active', 'inactive'];
export const AGENT_ROLES: AgentRole[] = ['agent', 'supervisor', 'admin'];

// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================

export function isValidMessageType(type: string): type is MessageType {
  return MESSAGE_TYPES.includes(type as MessageType);
}

export function isValidSenderType(type: string): type is SenderType {
  return SENDER_TYPES.includes(type as SenderType);
}

export function isValidConversationStatus(status: string): status is ConversationStatus {
  return CONVERSATION_STATUSES.includes(status as ConversationStatus);
}

export function isValidAIMode(mode: string): mode is AIMode {
  return AI_MODES.includes(mode as AIMode);
}

export function isValidAgentRole(role: string): role is AgentRole {
  return AGENT_ROLES.includes(role as AgentRole);
} 