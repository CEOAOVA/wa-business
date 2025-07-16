import { supabase } from '../config/supabase';

// Interfaces que coinciden con las tablas de Supabase
export interface SupabaseConversation {
  id: string;
  contact_phone: string;
  status: 'active' | 'waiting' | 'closed';
  ai_mode: 'active' | 'inactive' | 'paused';
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface SupabaseMessage {
  id: number;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'bot';
  content: string;
  message_type: 'text' | 'image' | 'quote' | 'document';
  whatsapp_message_id?: string;
  metadata?: any;
  created_at: string;
}

export interface SupabaseConversationSummary {
  id: string;
  conversation_id: string;
  summary_data: any;
  generated_by: string;
  created_at: string;
}

export interface SupabaseProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  metadata?: any;
}

export interface SupabaseOrder {
  id: string;
  conversation_id?: string;
  agent_id?: string;
  erp_order_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  order_details: any;
  created_at: string;
  updated_at: string;
}

export class SupabaseDatabaseService {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!supabase && process.env.USE_SUPABASE === 'true';
    if (this.isEnabled) {
      console.log('🚀 Supabase Database Service activado');
    } else {
      console.log('⚠️ Supabase Database Service deshabilitado - usando simulación');
    }
  }

  /**
   * Verificar si Supabase está habilitado
   */
  isSupabaseEnabled(): boolean {
    return this.isEnabled;
  }

  // ===== GESTIÓN DE CONVERSACIONES =====

  /**
   * Obtener o crear conversación por teléfono del contacto
   */
  async getOrCreateConversation(contactPhone: string): Promise<SupabaseConversation | null> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: getOrCreateConversation para', contactPhone);
      // Retornar conversación simulada para desarrollo
      return {
        id: `sim-conv-${contactPhone.replace(/\D/g, '').slice(-10)}`,
        contact_phone: contactPhone,
        status: 'active',
        ai_mode: 'active',
        assigned_agent_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    try {
      // Intentar obtener conversación existente
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_phone', contactPhone)
        .single();

      if (existingConversation && !fetchError) {
        return existingConversation;
      }

      // Crear nueva conversación si no existe
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          contact_phone: contactPhone,
          status: 'active',
          ai_mode: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creando conversación en Supabase:', createError);
        return null;
      }

      console.log(`✅ Nueva conversación creada en Supabase: ${newConversation.id} para ${contactPhone}`);
      return newConversation;
    } catch (error) {
      console.error('❌ Error en getOrCreateConversation:', error);
      return null;
    }
  }

  /**
   * Actualizar el modo AI de una conversación
   */
  async setConversationAIMode(
    conversationId: string, 
    mode: 'active' | 'inactive' | 'paused',
    agentId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: setConversationAIMode ${conversationId} -> ${mode}`);
      return { success: true };
    }

    try {
      // Obtener el modo actual antes del cambio
      const { data: currentConversation } = await supabase
        .from('conversations')
        .select('ai_mode')
        .eq('id', conversationId)
        .single();

      // Actualizar la conversación
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          ai_mode: mode,
          assigned_agent_id: agentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('❌ Error actualizando modo AI:', updateError);
        return { success: false, error: updateError.message };
      }

      // Registrar el cambio en el historial
      if (currentConversation) {
        await supabase
          .from('conversation_mode_history')
          .insert({
            conversation_id: conversationId,
            changed_by_agent_id: agentId,
            previous_mode: currentConversation.ai_mode,
            new_mode: mode,
            reason: reason,
            changed_at: new Date().toISOString()
          });
      }

      console.log(`✅ Modo AI actualizado: ${conversationId} -> ${mode}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error en setConversationAIMode:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtener el modo AI de una conversación
   */
  async getConversationAIMode(conversationId: string): Promise<'active' | 'inactive' | 'paused' | null> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: getConversationAIMode ${conversationId} -> active`);
      return 'active';
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('ai_mode')
        .eq('id', conversationId)
        .single();

      if (error || !data) {
        console.error('❌ Error obteniendo modo AI:', error);
        return null;
      }

      return data.ai_mode;
    } catch (error) {
      console.error('❌ Error en getConversationAIMode:', error);
      return null;
    }
  }

  // ===== GESTIÓN DE MENSAJES =====

  /**
   * Crear un nuevo mensaje
   */
  async createMessage(data: {
    conversationId: string;
    senderType: 'user' | 'agent' | 'bot';
    content: string;
    messageType?: 'text' | 'image' | 'quote' | 'document';
    whatsappMessageId?: string;
    metadata?: any;
  }): Promise<SupabaseMessage | null> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: createMessage para conversación', data.conversationId);
      // Retornar mensaje simulado para desarrollo
      return {
        id: parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        conversation_id: data.conversationId,
        sender_type: data.senderType,
        content: data.content,
        message_type: data.messageType || 'text',
        whatsapp_message_id: data.whatsappMessageId,
        metadata: data.metadata,
        created_at: new Date().toISOString()
      };
    }

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: data.conversationId,
          sender_type: data.senderType,
          content: data.content,
          message_type: data.messageType || 'text',
          whatsapp_message_id: data.whatsappMessageId,
          metadata: data.metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje en Supabase:', error);
        return null;
      }

      // Actualizar timestamp de la conversación
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.conversationId);

      console.log(`✅ Mensaje creado en Supabase: ${message.id}`);
      return message;
    } catch (error) {
      console.error('❌ Error en createMessage:', error);
      return null;
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<SupabaseMessage[]> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: getConversationMessages para ${conversationId}`);
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getConversationMessages:', error);
      return [];
    }
  }

  // ===== GESTIÓN DE RESÚMENES =====

  /**
   * Guardar o actualizar resumen de conversación
   */
  async upsertConversationSummary(
    conversationId: string,
    summaryData: any,
    generatedBy: string = 'gemini-2.5-flash'
  ): Promise<SupabaseConversationSummary | null> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: upsertConversationSummary para ${conversationId}`);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_summaries')
        .upsert({
          conversation_id: conversationId,
          summary_data: summaryData,
          generated_by: generatedBy,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error guardando resumen:', error);
        return null;
      }

      console.log(`✅ Resumen guardado para conversación: ${conversationId}`);
      return data;
    } catch (error) {
      console.error('❌ Error en upsertConversationSummary:', error);
      return null;
    }
  }

  /**
   * Obtener resumen de conversación
   */
  async getConversationSummary(conversationId: string): Promise<SupabaseConversationSummary | null> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: getConversationSummary para ${conversationId}`);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        console.error('❌ Error obteniendo resumen:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error en getConversationSummary:', error);
      return null;
    }
  }

  // ===== GESTIÓN DE PRODUCTOS (SIMULACIÓN ERP) =====

  /**
   * Buscar productos por término
   */
  async searchProducts(searchTerm: string, limit: number = 10): Promise<SupabaseProduct[]> {
    if (!this.isEnabled || !supabase) {
      console.log(`📋 Simulación: searchProducts "${searchTerm}"`);
      // Retornar productos simulados
      return [
        {
          id: '1',
          sku: 'BRAKE-001',
          name: 'Pastillas de freno Toyota',
          description: 'Pastillas de freno compatibles con Toyota Corolla',
          price: 850.00,
          stock: 15,
          metadata: { brand: 'Toyota', compatibility: ['Corolla', 'Camry'] }
        }
      ];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .gt('stock', 0)
        .limit(limit);

      if (error) {
        console.error('❌ Error buscando productos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en searchProducts:', error);
      return [];
    }
  }

  // ===== GESTIÓN DE PEDIDOS =====

  /**
   * Crear un nuevo pedido
   */
  async createOrder(data: {
    conversationId?: string;
    agentId?: string;
    orderDetails: any;
    status?: 'pending' | 'confirmed' | 'cancelled';
  }): Promise<SupabaseOrder | null> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: createOrder');
      return null;
    }

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          conversation_id: data.conversationId,
          agent_id: data.agentId,
          status: data.status || 'pending',
          order_details: data.orderDetails,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando pedido:', error);
        return null;
      }

      console.log(`✅ Pedido creado: ${order.id}`);
      return order;
    } catch (error) {
      console.error('❌ Error en createOrder:', error);
      return null;
    }
  }

  // ===== ESTADÍSTICAS =====

  /**
   * Obtener estadísticas básicas
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalOrders: number;
    activeConversations: number;
  }> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: getStats');
      return {
        totalConversations: 5,
        totalMessages: 47,
        totalOrders: 3,
        activeConversations: 2
      };
    }

    try {
      const [conversationsResult, messagesResult, ordersResult, activeConversationsResult] = await Promise.all([
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);

      return {
        totalConversations: conversationsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalOrders: ordersResult.count || 0,
        activeConversations: activeConversationsResult.count || 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { totalConversations: 0, totalMessages: 0, totalOrders: 0, activeConversations: 0 };
    }
  }

  // ===== MÉTODOS DE CONSULTA ADICIONALES =====

  /**
   * Obtener conversaciones activas
   */
  async getActiveConversations(): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: getActiveConversations');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo conversaciones activas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en getActiveConversations:', error);
      return [];
    }
  }

  /**
   * Buscar conversaciones por criterio
   */
  async searchConversations(criteria: {
    contactPhone?: string;
    status?: 'active' | 'waiting' | 'closed';
    aiMode?: 'active' | 'inactive' | 'paused';
    agentId?: string;
  }): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      console.log('📋 Simulación: searchConversations');
      return [];
    }

    try {
      let query = supabase.from('conversations').select('*');

      if (criteria.contactPhone) {
        query = query.eq('contact_phone', criteria.contactPhone);
      }
      if (criteria.status) {
        query = query.eq('status', criteria.status);
      }
      if (criteria.aiMode) {
        query = query.eq('ai_mode', criteria.aiMode);
      }
      if (criteria.agentId) {
        query = query.eq('assigned_agent_id', criteria.agentId);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error buscando conversaciones:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error en searchConversations:', error);
      return [];
    }
  }
}

// Instancia singleton
export const supabaseDatabaseService = new SupabaseDatabaseService(); 