/**
 * Servicio mejorado de Supabase Realtime usando Broadcasts
 * Implementa el patrón de broadcasts para mejor rendimiento y menor latencia
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Tipos para los eventos de broadcast
export interface BroadcastMessage {
  id: number;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'bot';
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
  client_id?: string;
  status?: string;
  metadata?: any;
}

export interface BroadcastEvent {
  event: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  new: BroadcastMessage | any;
  old: BroadcastMessage | any;
  timestamp: number;
}

export interface ConversationPresence {
  user_id: string;
  online_at: string;
  user_email?: string;
  user_name?: string;
}

export interface RealtimeCallbacks {
  onNewMessage?: (message: BroadcastMessage) => void;
  onMessageStatusUpdate?: (message: BroadcastMessage) => void;
  onMessageRead?: (message: BroadcastMessage) => void;
  onConversationUpdate?: (conversation: any) => void;
  onPresenceSync?: (presences: ConversationPresence[]) => void;
  onPresenceJoin?: (presence: ConversationPresence) => void;
  onPresenceLeave?: (presence: ConversationPresence) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class RealtimeBroadcastService {
  private supabase: SupabaseClient;
  private channels = new Map<string, RealtimeChannel>();
  private isEnabled = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private currentUserId: string | null = null;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('⚠️ [RealtimeBroadcast] Variables de entorno no configuradas');
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 30, // Aumentado para mejor rendimiento
        },
      },
    });

    this.isEnabled = true;
    this.currentUserId = localStorage.getItem('userId');
    console.log('🚀 [RealtimeBroadcast] Servicio inicializado con broadcasts');
  }

  /**
   * Verificar si el servicio está habilitado
   */
  public isRealtimeEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Establecer el ID del usuario actual
   */
  public setCurrentUser(userId: string) {
    this.currentUserId = userId;
    localStorage.setItem('userId', userId);
  }

  /**
   * Suscribirse a una conversación con broadcasts y presence
   */
  public subscribeToConversation(
    conversationId: string,
    callbacks: RealtimeCallbacks
  ): RealtimeChannel | null {
    if (!this.isEnabled || !conversationId) {
      console.warn('⚠️ [RealtimeBroadcast] No se puede suscribir: servicio deshabilitado o conversationId inválido');
      return null;
    }

    // Desuscribir canal anterior si existe
    this.unsubscribeFromConversation(conversationId);

    const channelName = `conversation:${conversationId}`;
    console.log(`🔌 [RealtimeBroadcast] Creando canal: ${channelName}`);

    try {
      const channel = this.supabase
        .channel(channelName, {
          config: {
            broadcast: {
              self: false, // No recibir nuestros propios broadcasts
              ack: true,   // Confirmar recepción de mensajes
            },
            presence: {
              key: this.currentUserId || 'anonymous',
            },
          },
        })
        // Escuchar broadcasts de mensajes nuevos
        .on('broadcast', { event: 'new_message' }, (payload: any) => {
          console.log('📨 [RealtimeBroadcast] Nuevo mensaje recibido:', payload);
          const event = this.parseBroadcastEvent(payload.payload);
          if (event && callbacks.onNewMessage) {
            callbacks.onNewMessage(event.new as BroadcastMessage);
          }
        })
        // Escuchar actualizaciones de estado de mensajes
        .on('broadcast', { event: 'message_status_update' }, (payload: any) => {
          console.log('📝 [RealtimeBroadcast] Estado de mensaje actualizado:', payload);
          const event = this.parseBroadcastEvent(payload.payload);
          if (event && callbacks.onMessageStatusUpdate) {
            callbacks.onMessageStatusUpdate(event.new as BroadcastMessage);
          }
        })
        // Escuchar marcado de mensajes como leídos
        .on('broadcast', { event: 'message_read_update' }, (payload: any) => {
          console.log('👁️ [RealtimeBroadcast] Mensaje marcado como leído:', payload);
          const event = this.parseBroadcastEvent(payload.payload);
          if (event && callbacks.onMessageRead) {
            callbacks.onMessageRead(event.new as BroadcastMessage);
          }
        })
        // Escuchar actualizaciones de conversación
        .on('broadcast', { event: 'conversation_*' }, (payload: any) => {
          console.log('🔄 [RealtimeBroadcast] Conversación actualizada:', payload);
          const event = this.parseBroadcastEvent(payload.payload);
          if (event && callbacks.onConversationUpdate) {
            callbacks.onConversationUpdate(event.new);
          }
        })
        // Escuchar cambios de tabla (fallback para compatibilidad)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            console.log('📨 [RealtimeBroadcast] Mensaje insertado (postgres_changes):', payload);
            if (callbacks.onNewMessage && payload.new) {
              callbacks.onNewMessage(payload.new as BroadcastMessage);
            }
          }
        )
        // Manejar presencia
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presences = this.parsePresenceState(state);
          console.log('👥 [RealtimeBroadcast] Sincronización de presencia:', presences);
          if (callbacks.onPresenceSync) {
            callbacks.onPresenceSync(presences);
          }
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          console.log('👋 [RealtimeBroadcast] Usuario se unió:', newPresences);
          if (callbacks.onPresenceJoin && newPresences?.length > 0) {
            callbacks.onPresenceJoin(newPresences[0]);
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          console.log('👋 [RealtimeBroadcast] Usuario salió:', leftPresences);
          if (callbacks.onPresenceLeave && leftPresences?.length > 0) {
            callbacks.onPresenceLeave(leftPresences[0]);
          }
        })
        .subscribe((status: string, err?: any) => {
          console.log(`🔌 [RealtimeBroadcast] Estado de suscripción para ${conversationId}: ${status}`);

          if (status === 'SUBSCRIBED') {
            console.log(`✅ [RealtimeBroadcast] Suscrito exitosamente a ${conversationId}`);
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;

            // Trackear presencia del usuario
            if (this.currentUserId) {
              const presenceData = {
                user_id: this.currentUserId,
                online_at: new Date().toISOString(),
                user_email: localStorage.getItem('userEmail'),
                user_name: localStorage.getItem('userName'),
              };
              
              channel.track(presenceData).then(() => {
                console.log('✅ [RealtimeBroadcast] Presencia registrada:', presenceData);
              }).catch((error) => {
                console.error('❌ [RealtimeBroadcast] Error registrando presencia:', error);
              });
            }

            if (callbacks.onConnect) {
              callbacks.onConnect();
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`❌ [RealtimeBroadcast] Error en canal para ${conversationId}: ${status}`, err);
            
            if (callbacks.onError) {
              callbacks.onError({ type: 'CHANNEL_ERROR', conversationId, status, error: err });
            }

            // Intentar reconectar con backoff exponencial
            this.handleReconnect(conversationId, callbacks);
          } else if (status === 'CLOSED') {
            console.log(`🔌 [RealtimeBroadcast] Canal cerrado para ${conversationId}`);
            if (callbacks.onDisconnect) {
              callbacks.onDisconnect();
            }
          }
        });

      this.channels.set(conversationId, channel);
      return channel;
    } catch (error) {
      console.error('❌ [RealtimeBroadcast] Error creando suscripción:', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      return null;
    }
  }

  /**
   * Parsear evento de broadcast
   */
  private parseBroadcastEvent(payload: any): BroadcastEvent | null {
    try {
      if (typeof payload === 'string') {
        return JSON.parse(payload);
      }
      return payload;
    } catch (error) {
      console.error('❌ [RealtimeBroadcast] Error parseando evento:', error);
      return null;
    }
  }

  /**
   * Parsear estado de presencia
   */
  private parsePresenceState(state: any): ConversationPresence[] {
    const presences: ConversationPresence[] = [];
    
    for (const key in state) {
      if (state[key] && Array.isArray(state[key])) {
        presences.push(...state[key]);
      }
    }
    
    return presences;
  }

  /**
   * Manejar reconexión con backoff exponencial
   */
  private handleReconnect(conversationId: string, callbacks: RealtimeCallbacks) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [RealtimeBroadcast] Máximo de intentos de reconexión alcanzado');
      if (callbacks.onError) {
        callbacks.onError({
          type: 'MAX_RECONNECT_ATTEMPTS',
          conversationId,
          attempts: this.reconnectAttempts,
        });
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`🔄 [RealtimeBroadcast] Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.subscribeToConversation(conversationId, callbacks);
    }, delay);
  }

  /**
   * Desuscribirse de una conversación
   */
  public unsubscribeFromConversation(conversationId: string): void {
    const channel = this.channels.get(conversationId);
    if (channel) {
      // Dejar de trackear presencia
      if (this.currentUserId) {
        channel.untrack();
      }
      
      // Desuscribir del canal
      channel.unsubscribe();
      this.channels.delete(conversationId);
      console.log(`🔌 [RealtimeBroadcast] Desuscrito de conversación ${conversationId}`);
    }
  }

  /**
   * Desuscribirse de todas las conversaciones
   */
  public unsubscribeAll(): void {
    for (const [conversationId, channel] of this.channels) {
      if (this.currentUserId) {
        channel.untrack();
      }
      channel.unsubscribe();
      console.log(`🔌 [RealtimeBroadcast] Desuscrito de conversación ${conversationId}`);
    }
    this.channels.clear();
  }

  /**
   * Enviar un broadcast manual (útil para eventos personalizados)
   */
  public async sendBroadcast(
    conversationId: string,
    event: string,
    payload: any
  ): Promise<boolean> {
    const channel = this.channels.get(conversationId);
    if (!channel) {
      console.error('❌ [RealtimeBroadcast] No hay canal activo para esta conversación');
      return false;
    }

    try {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
      console.log('📤 [RealtimeBroadcast] Broadcast enviado:', { event, payload });
      return true;
    } catch (error) {
      console.error('❌ [RealtimeBroadcast] Error enviando broadcast:', error);
      return false;
    }
  }

  /**
   * Obtener estadísticas del servicio
   */
  public getStats() {
    const activeChannels = Array.from(this.channels.entries()).map(([id, channel]) => ({
      conversationId: id,
      // @ts-ignore - Accediendo a propiedades internas para debugging
      state: channel.state,
      // @ts-ignore
      presenceState: channel.presenceState ? Object.keys(channel.presenceState()).length : 0,
    }));

    return {
      isEnabled: this.isEnabled,
      activeSubscriptions: this.channels.size,
      channels: activeChannels,
      reconnectAttempts: this.reconnectAttempts,
      currentUserId: this.currentUserId,
    };
  }

  /**
   * Verificar conexión y salud del servicio
   */
  public async checkHealth(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Intentar una operación simple para verificar conexión
      const { error } = await this.supabase
        .from('messages')
        .select('id')
        .limit(1);

      if (error) {
        return {
          connected: false,
          latency: Date.now() - startTime,
          error: error.message,
        };
      }

      return {
        connected: true,
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}

// Instancia singleton del servicio
export const realtimeBroadcastService = new RealtimeBroadcastService();