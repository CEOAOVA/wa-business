import { supabase } from '../config/supabase';

// Interfaces que coinciden con las tablas de Supabase
export interface SupabaseAgent {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'supervisor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  postal_code?: string; // NUEVO: Código postal
  is_blocked: boolean;
  is_favorite: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConversation {
  id: string;
  contact_phone: string;
  status: 'active' | 'waiting' | 'closed';
  ai_mode: 'active' | 'inactive' | 'paused';
  assigned_agent_id?: string;
  unread_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  takeover_mode?: 'spectator' | 'takeover' | 'ai_only';
}

export interface SupabaseMessage {
  id: number;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'bot';
  content: string;
  message_type: 'text' | 'image' | 'quote' | 'document';
  whatsapp_message_id?: string;
  is_read: boolean;
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
    // FORZAR Supabase como única opción - NO más fallbacks
    this.isEnabled = !!supabase;
    if (this.isEnabled) {
      console.log('🚀 Supabase Database Service activado (NUEVO ESQUEMA)');
    } else {
      console.error('❌ CRÍTICO: Supabase no configurado. Sistema NO puede funcionar.');
      throw new Error('Supabase es requerido. Verificar SUPABASE_URL y SUPABASE_ANON_KEY');
    }
  }

  /**
   * Verificar si Supabase está habilitado
   */
  isSupabaseEnabled(): boolean {
    return this.isEnabled;
  }

  // ===== GESTIÓN DE AGENTES =====

  /**
   * Obtener todos los agentes
   */
  async getAgents(): Promise<SupabaseAgent[]> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo agentes:', error);
        return [];
      }

      return agents || [];
    } catch (error) {
      console.error('❌ Error en getAgents:', error);
      return [];
    }
  }

  /**
   * Obtener agente por ID
   */
  async getAgentById(agentId: string): Promise<SupabaseAgent | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo agente por ID:', error);
        return null;
      }

      return agent;
    } catch (error) {
      console.error('❌ Error en getAgentById:', error);
      return null;
    }
  }

  /**
   * Obtener agente por email
   */
  async getAgentByEmail(email: string): Promise<SupabaseAgent | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('❌ Error obteniendo agente por email:', error);
        return null;
      }

      return agent;
    } catch (error) {
      console.error('❌ Error en getAgentByEmail:', error);
      return null;
    }
  }

  // ===== GESTIÓN DE CONTACTOS =====

  /**
   * Obtener o crear contacto por teléfono
   */
  async getOrCreateContact(phone: string, name?: string): Promise<SupabaseContact | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      // Intentar obtener contacto existente
      const { data: existingContact, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', phone)
        .single();

      if (existingContact && !fetchError) {
        return existingContact;
      }

      // Crear nuevo contacto si no existe
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          phone,
          name: name || phone,
          is_blocked: false,
          is_favorite: false
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creando contacto:', createError);
        return null;
      }

      return newContact;
    } catch (error) {
      console.error('❌ Error en getOrCreateContact:', error);
      return null;
    }
  }

  /**
   * Obtener contacto por teléfono
   */
  async getContactByPhone(phone: string): Promise<SupabaseContact | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        console.error('❌ Error obteniendo contacto por teléfono:', error);
        return null;
      }

      return contact;
    } catch (error) {
      console.error('❌ Error en getContactByPhone:', error);
      return null;
    }
  }

  /**
   * Obtener contacto por ID
   */
  async getContactById(contactId: string): Promise<SupabaseContact | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo contacto por ID:', error);
        return null;
      }

      return contact;
    } catch (error) {
      console.error('❌ Error en getContactById:', error);
      return null;
    }
  }

  /**
   * Actualizar contacto
   */
  async updateContact(contactId: string, data: Partial<SupabaseContact>): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (error) {
        console.error('❌ Error actualizando contacto:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en updateContact:', error);
      return false;
    }
  }

  /**
   * Eliminar contacto
   */
  async deleteContact(contactId: string): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        console.error('❌ Error eliminando contacto:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en deleteContact:', error);
      return false;
    }
  }

  /**
   * Obtener contactos con paginación
   */
  async getContacts(limit: number = 50, offset: number = 0): Promise<SupabaseContact[]> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error obteniendo contactos:', error);
        return [];
      }

      return contacts || [];
    } catch (error) {
      console.error('❌ Error en getContacts:', error);
      return [];
    }
  }

  // ===== GESTIÓN DE CONVERSACIONES =====

  /**
   * Obtener o crear conversación por teléfono del contacto
   */
  async getOrCreateConversation(contactPhone: string): Promise<SupabaseConversation | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible - configurar SUPABASE_URL y SUPABASE_ANON_KEY');
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
          unread_count: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creando conversación:', createError);
        return null;
      }

      return newConversation;
    } catch (error) {
      console.error('❌ Error en getOrCreateConversation:', error);
      return null;
    }
  }

  /**
   * Actualizar modo AI de conversación
   */
  async setConversationAIMode(
    conversationId: string, 
    mode: 'active' | 'inactive' | 'paused',
    agentId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      return { success: false, error: '❌ Supabase no disponible' };
    }

    try {
      const updateData: any = {
        ai_mode: mode,
        updated_at: new Date().toISOString()
      };

      if (agentId) {
        updateData.assigned_agent_id = agentId;
      }

      if (reason) {
        updateData.metadata = { takeover_reason: reason };
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Error actualizando modo AI:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en setConversationAIMode:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtener modo AI de conversación
   */
  async getConversationAIMode(conversationId: string): Promise<'active' | 'inactive' | 'paused' | null> {
    if (!this.isEnabled || !supabase) {
      return null;
    }

    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('ai_mode')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('❌ Error obteniendo modo AI:', error);
        return null;
      }

      return conversation?.ai_mode || null;
    } catch (error) {
      console.error('❌ Error en getConversationAIMode:', error);
      return null;
    }
  }

  /**
   * Obtener conversaciones que necesitan takeover
   */
  async getConversationsNeedingTakeover(): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('ai_mode', 'paused')
        .is('assigned_agent_id', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo conversaciones para takeover:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('❌ Error en getConversationsNeedingTakeover:', error);
      return [];
    }
  }

  /**
   * Asignar conversación a agente
   */
  async assignConversationToAgent(conversationId: string, agentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      return { success: false, error: '❌ Supabase no disponible' };
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          assigned_agent_id: agentId,
          ai_mode: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Error asignando conversación a agente:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en assignConversationToAgent:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Liberar conversación de agente
   */
  async releaseConversationFromAgent(conversationId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      return { success: false, error: '❌ Supabase no disponible' };
    }

    try {
      const updateData: any = {
        assigned_agent_id: null,
        ai_mode: 'active',
        updated_at: new Date().toISOString()
      };

      if (reason) {
        updateData.metadata = { release_reason: reason };
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Error liberando conversación de agente:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error en releaseConversationFromAgent:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Actualizar última actividad de conversación
   */
  async updateConversationLastMessage(conversationId: string, timestamp: Date): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          last_message_at: timestamp.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Error actualizando última actividad de conversación:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en updateConversationLastMessage:', error);
      return false;
    }
  }

  // ===== GESTIÓN DE MENSAJES =====

  /**
   * Crear mensaje
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
      throw new Error('❌ Supabase no disponible');
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
          is_read: data.senderType === 'user' ? false : true,
          metadata: data.metadata
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando mensaje:', error);
        return null;
      }

      // Actualizar la conversación con el último mensaje y timestamp
      const updateData: any = {
        last_message_at: message.created_at,
        updated_at: message.created_at
      };

      // Incrementar contador de mensajes no leídos si es mensaje del usuario
      if (data.senderType === 'user') {
        try {
          // Intentar usar la función RPC si existe
          const { error: incrementError } = await supabase.rpc('increment_unread_count', {
            conversation_id: data.conversationId
          });
          
          if (incrementError) {
            console.log('⚠️ Función RPC no disponible, usando método alternativo');
            // Método alternativo: obtener el valor actual y sumar 1
            const { data: currentConversation } = await supabase
              .from('conversations')
              .select('unread_count')
              .eq('id', data.conversationId)
              .single();
            
            if (currentConversation) {
              updateData.unread_count = (currentConversation.unread_count || 0) + 1;
            }
          }
        } catch (error) {
          console.log('⚠️ Error con función RPC, usando método alternativo');
          // Método alternativo: obtener el valor actual y sumar 1
          const { data: currentConversation } = await supabase
            .from('conversations')
            .select('unread_count')
            .eq('id', data.conversationId)
            .single();
          
          if (currentConversation) {
            updateData.unread_count = (currentConversation.unread_count || 0) + 1;
          }
        }
      }

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', data.conversationId);

      if (updateError) {
        console.error('❌ Error actualizando conversación después de crear mensaje:', updateError);
      } else {
        console.log(`✅ Conversación ${data.conversationId} actualizada con último mensaje: ${message.created_at}`);
      }

      return message;
    } catch (error) {
      console.error('❌ Error en createMessage:', error);
      return null;
    }
  }

  /**
   * Obtener mensajes de conversación
   */
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<SupabaseMessage[]> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }) // Ordenar por timestamp ascendente (más antiguo primero)
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      console.error('❌ Error en getConversationMessages:', error);
      return [];
    }
  }

  /**
   * Obtener el último mensaje de una conversación
   */
  async getLastMessage(conversationId: string): Promise<SupabaseMessage | null> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false }) // Ordenar por timestamp descendente (más reciente primero)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No hay mensajes
        }
        console.error('❌ Error obteniendo último mensaje:', error);
        return null;
      }

      return message;
    } catch (error) {
      console.error('❌ Error en getLastMessage:', error);
      return null;
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) {
        console.error('❌ Error marcando mensaje como leído:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markMessageAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar conversación como leída
   */
  async markConversationAsRead(conversationId: string): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      return false;
    }

    try {
      // Marcar todos los mensajes de la conversación como leídos
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      if (messagesError) {
        console.error('❌ Error marcando mensajes como leídos:', messagesError);
        return false;
      }

      // Resetear contador de mensajes no leídos
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (conversationError) {
        console.error('❌ Error reseteando contador de mensajes no leídos:', conversationError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error en markConversationAsRead:', error);
      return false;
    }
  }

  /**
   * Limpiar mensajes antiguos
   */
  async cleanupOldMessages(olderThanHours: number): Promise<number> {
    if (!this.isEnabled || !supabase) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

             const { error } = await supabase
         .from('messages')
         .delete()
         .lt('created_at', cutoffDate.toISOString());

       if (error) {
         console.error('❌ Error limpiando mensajes antiguos:', error);
         return 0;
       }

       // Supabase no retorna el número de filas eliminadas en delete()
       // Por ahora retornamos 0, pero podríamos implementar un contador
       return 0;
    } catch (error) {
      console.error('❌ Error en cleanupOldMessages:', error);
      return 0;
    }
  }

  // ===== ESTADÍSTICAS =====

  /**
   * Obtener estadísticas del chatbot
   */
  async getChatbotStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalOrders: number;
    activeConversations: number;
  }> {
    if (!this.isEnabled || !supabase) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalOrders: 0,
        activeConversations: 0
      };
    }

    try {
      // Obtener estadísticas de conversaciones
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      const { count: activeConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Obtener estadísticas de mensajes
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Obtener estadísticas de órdenes (si existe la tabla)
      let totalOrders = 0;
      try {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        totalOrders = count || 0;
      } catch (error) {
        // La tabla orders puede no existir aún
        console.log('📋 Tabla orders no disponible aún');
      }

      return {
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        totalOrders,
        activeConversations: activeConversations || 0
      };
    } catch (error) {
      console.error('❌ Error en getChatbotStats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalOrders: 0,
        activeConversations: 0
      };
    }
  }

  // ===== FUNCIONES LEGACY (MANTENER COMPATIBILIDAD) =====

  async upsertConversationSummary(
    conversationId: string,
    summaryData: any,
    generatedBy: string = 'gemini-2.5-flash'
  ): Promise<SupabaseConversationSummary | null> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📝 Resumen guardado para conversación ${conversationId} (legacy)`);
    return null;
  }

  async getConversationSummary(conversationId: string): Promise<SupabaseConversationSummary | null> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📝 Resumen obtenido para conversación ${conversationId} (legacy)`);
    return null;
  }

  async searchProducts(searchTerm: string, limit: number = 10): Promise<SupabaseProduct[]> {
    // TODO: Implementar búsqueda de productos en el nuevo esquema
    console.log(`🔍 Búsqueda de productos: ${searchTerm} (legacy)`);
    return [];
  }

  async createOrder(data: {
    conversationId?: string;
    agentId?: string;
    orderDetails: any;
    status?: 'pending' | 'confirmed' | 'cancelled';
  }): Promise<SupabaseOrder | null> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📦 Orden creada (legacy)`);
    return null;
  }

  async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalOrders: number;
    activeConversations: number;
  }> {
    return await this.getChatbotStats();
  }

  async getActiveConversations(): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo conversaciones activas:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('❌ Error en getActiveConversations:', error);
      return [];
    }
  }

  async getConversations(limit: number = 50, offset: number = 0): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      // Ordenar por last_message_at si existe, sino por updated_at
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error obteniendo conversaciones:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('❌ Error en getConversations:', error);
      return [];
    }
  }

  async searchConversations(criteria: {
    contactPhone?: string;
    status?: 'active' | 'waiting' | 'closed';
    aiMode?: 'active' | 'inactive' | 'paused';
    agentId?: string;
  }): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('conversations')
        .select('*');

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

      const { data: conversations, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error buscando conversaciones:', error);
        return [];
      }

      return conversations || [];
    } catch (error) {
      console.error('❌ Error en searchConversations:', error);
      return [];
    }
  }

  /**
   * Obtener modo takeover de conversación
   */
  async getConversationTakeoverMode(conversationId: string): Promise<'spectator' | 'takeover' | 'ai_only' | null> {
    if (!this.isEnabled || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('takeover_mode')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error obteniendo takeover_mode:', error);
        return null;
      }

      return data?.takeover_mode || 'spectator';
    } catch (error) {
      console.error('Error en getConversationTakeoverMode:', error);
      return null;
    }
  }

  /**
   * Establecer modo takeover de conversación
   */
  async setConversationTakeoverMode(
    conversationId: string,
    mode: 'spectator' | 'takeover' | 'ai_only',
    agentId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      return { success: false, error: '❌ Supabase no disponible' };
    }

    try {
      const updateData: any = {
        takeover_mode: mode,
        updated_at: new Date().toISOString()
      };

      // Si es takeover, asignar al agente
      if (mode === 'takeover' && agentId) {
        updateData.assigned_agent_id = agentId;
        updateData.ai_mode = 'inactive';
      } else if (mode === 'spectator') {
        // En modo espectador, mantener ai_mode activo pero sin agente asignado
        updateData.assigned_agent_id = null;
        updateData.ai_mode = 'active';
      } else if (mode === 'ai_only') {
        // En modo solo AI, desasignar agente y mantener AI activo
        updateData.assigned_agent_id = null;
        updateData.ai_mode = 'active';
      }

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId);

      if (error) {
        console.error('Error actualizando takeover_mode:', error);
        return { success: false, error: error.message };
      }

      // Log del cambio
      console.log(`✅ Takeover mode actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''} ${reason ? `(razón: ${reason})` : ''}`);

      return { success: true };
    } catch (error) {
      console.error('Error en setConversationTakeoverMode:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtener conversaciones en modo espectador (que pueden ser tomadas)
   */
  async getSpectatorConversations(): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('takeover_mode', 'spectator')
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo conversaciones en espectador:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getSpectatorConversations:', error);
      return [];
    }
  }

  /**
   * Obtener conversaciones en takeover (controladas por agentes)
   */
  async getTakeoverConversations(): Promise<SupabaseConversation[]> {
    if (!this.isEnabled || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('takeover_mode', 'takeover')
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo conversaciones en takeover:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getTakeoverConversations:', error);
      return [];
    }
  }

  /**
   * Verificar si una conversación puede ser procesada por el chatbot
   */
  async canChatbotProcessMessage(conversationId: string): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      // TEMPORAL: Permitir procesamiento si Supabase no está disponible
      console.log('⚠️ Supabase no disponible, permitiendo procesamiento de chatbot por defecto');
      return true;
    }

    try {
      const mode = await this.getConversationTakeoverMode(conversationId);
      // El chatbot puede procesar solo si está en modo 'spectator' o 'ai_only'
      // TEMPORAL: Si no se puede obtener el modo, permitir procesamiento
      if (mode === null) {
        console.log('⚠️ No se pudo obtener takeover_mode, permitiendo procesamiento por defecto');
        return true;
      }
      return mode === 'spectator' || mode === 'ai_only';
    } catch (error) {
      console.error('Error verificando si chatbot puede procesar:', error);
      // TEMPORAL: En caso de error, permitir procesamiento
      console.log('⚠️ Error verificando takeover_mode, permitiendo procesamiento por defecto');
      return true;
    }
  }

  /**
   * Ejecutar migración para agregar campo postal_code a contacts
   */
  async addPostalCodeToContacts(): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled || !supabase) {
      return { success: false, error: '❌ Supabase no disponible' };
    }

    try {
      console.log('🔄 Ejecutando migración: agregando postal_code a contacts...');

      // Agregar columna postal_code si no existe
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql_query: `
          ALTER TABLE contacts 
          ADD COLUMN IF NOT EXISTS postal_code TEXT;
        `
      });

      if (alterError) {
        console.error('❌ Error agregando columna postal_code:', alterError);
        return { success: false, error: alterError.message };
      }

      console.log('✅ Migración completada: postal_code agregado a contacts');
      return { success: true };
    } catch (error) {
      console.error('❌ Error en migración postal_code:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  /**
   * Actualizar contacto con código postal
   */
  async updateContactWithPostalCode(contactId: string, data: Partial<SupabaseContact>): Promise<boolean> {
    if (!this.isEnabled || !supabase) {
      throw new Error('❌ Supabase no disponible');
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (error) {
        console.error('❌ Error actualizando contacto:', error);
        return false;
      }

      console.log(`✅ Contacto ${contactId} actualizado con código postal`);
      return true;
    } catch (error) {
      console.error('❌ Error en updateContactWithPostalCode:', error);
      return false;
    }
  }
}

// Instancia singleton
export const supabaseDatabaseService = new SupabaseDatabaseService(); 