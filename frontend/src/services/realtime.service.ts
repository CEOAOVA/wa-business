/**
 * Servicio de Supabase Realtime para mensajes en tiempo real
 * Maneja suscripciones a cambios de base de datos sin afectar otros módulos
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeMessage {
  id: number;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'bot';
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
  client_id?: string;
  metadata?: any;
}

export interface RealtimeCallbacks {
  onMessageInsert?: (message: RealtimeMessage) => void;
  onMessageUpdate?: (message: RealtimeMessage) => void;
  onConversationUpdate?: (conversation: any) => void;
  onError?: (error: any) => void;
}

export class RealtimeService {
  private supabase!: SupabaseClient; // Definite assignment assertion
  private channels = new Map<string, RealtimeChannel>();
  private isEnabled = false;

  constructor() {
    // Solo inicializar si las variables de entorno están disponibles
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        realtime: {
          params: {
            eventsPerSecond: 20
          }
        }
      });
      this.isEnabled = true;
      console.log('🔄 [RealtimeService] Servicio inicializado correctamente');
    } else {
      console.warn('⚠️ [RealtimeService] Variables de entorno no configuradas, Realtime deshabilitado');
    }
  }

  /**
   * Verificar si el servicio está habilitado
   */
  public isRealtimeEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Suscribirse a mensajes de una conversación específica
   */
  public subscribeToConversation(
    conversationId: string, 
    callbacks: RealtimeCallbacks
  ): RealtimeChannel | null {
    if (!this.isEnabled || !conversationId) {
      console.warn('⚠️ [RealtimeService] No se puede suscribir: servicio deshabilitado o conversationId inválido');
      return null;
    }

    // Si ya existe una suscripción para esta conversación, la removemos primero
    this.unsubscribeFromConversation(conversationId);

    const channelName = `conversation:${conversationId}`;
    
    try {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('📨 [RealtimeService] Nuevo mensaje recibido:', payload);
            if (callbacks.onMessageInsert) {
              callbacks.onMessageInsert(payload.new as RealtimeMessage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            console.log('📝 [RealtimeService] Mensaje actualizado:', payload);
            if (callbacks.onMessageUpdate) {
              callbacks.onMessageUpdate(payload.new as RealtimeMessage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${conversationId}`
          },
          (payload) => {
            console.log('🔄 [RealtimeService] Conversación actualizada:', payload);
            if (callbacks.onConversationUpdate) {
              callbacks.onConversationUpdate(payload.new);
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔌 [RealtimeService] Estado de suscripción para ${conversationId}:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ [RealtimeService] Suscrito exitosamente a conversación ${conversationId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ [RealtimeService] Error en canal para conversación ${conversationId}`);
            if (callbacks.onError) {
              callbacks.onError({ type: 'CHANNEL_ERROR', conversationId });
            }
          }
        });

      this.channels.set(conversationId, channel);
      return channel;

    } catch (error) {
      console.error('❌ [RealtimeService] Error creando suscripción:', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      return null;
    }
  }

  /**
   * Desuscribirse de una conversación específica
   */
  public unsubscribeFromConversation(conversationId: string): void {
    const channel = this.channels.get(conversationId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(conversationId);
      console.log(`🔌 [RealtimeService] Desuscrito de conversación ${conversationId}`);
    }
  }

  /**
   * Desuscribirse de todas las conversaciones
   */
  public unsubscribeAll(): void {
    for (const [conversationId, channel] of this.channels) {
      channel.unsubscribe();
      console.log(`🔌 [RealtimeService] Desuscrito de conversación ${conversationId}`);
    }
    this.channels.clear();
  }

  /**
   * Obtener estadísticas de suscripciones activas
   */
  public getStats() {
    return {
      isEnabled: this.isEnabled,
      activeSubscriptions: this.channels.size,
      subscribedConversations: Array.from(this.channels.keys())
    };
  }
}

// Instancia singleton del servicio
export const realtimeService = new RealtimeService();
