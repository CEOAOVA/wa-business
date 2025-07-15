import { supabaseDatabaseService, SupabaseConversation, SupabaseMessage } from './supabase-database.service';

/**
 * Servicio principal de base de datos - SOLO SUPABASE
 * COMPLETAMENTE LIBRE DE PRISMA
 */
export class DatabaseService {
  constructor() {
    console.log('🗄️ DatabaseService inicializado (Supabase ONLY - SIN PRISMA)');
  }

  // ===== CONVERSACIONES =====

  /**
   * Obtener o crear conversación por teléfono
   */
  async getOrCreateConversationByPhone(contactPhone: string): Promise<SupabaseConversation | null> {
    try {
      const conversation = await supabaseDatabaseService.getOrCreateConversation(contactPhone);
      if (conversation) {
        console.log(`✅ Conversación encontrada/creada: ${conversation.id} para ${contactPhone}`);
      } else {
        console.log(`⚠️ No se pudo crear conversación para ${contactPhone}`);
      }
      return conversation;
    } catch (error) {
      console.error('❌ Error en getOrCreateConversationByPhone:', error);
      return null;
    }
  }

  /**
   * Actualizar modo AI de conversación (TAKEOVER)
   */
  async setConversationAIMode(
    conversationId: string,
    mode: 'active' | 'inactive' | 'paused',
    agentId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await supabaseDatabaseService.setConversationAIMode(conversationId, mode, agentId, reason);
      if (result.success) {
        console.log(`✅ Modo AI actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''}`);
      } else {
        console.error(`❌ Error actualizando modo AI: ${result.error}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error en setConversationAIMode:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtener modo AI de conversación
   */
  async getConversationAIMode(conversationId: string): Promise<'active' | 'inactive' | 'paused' | null> {
    try {
      const mode = await supabaseDatabaseService.getConversationAIMode(conversationId);
      console.log(`🔍 Modo AI obtenido: ${conversationId} -> ${mode}`);
      return mode;
    } catch (error) {
      console.error('❌ Error en getConversationAIMode:', error);
      return null;
    }
  }

  // ===== MENSAJES =====

  /**
   * Crear mensaje
   */
  async createChatbotMessage(data: {
    conversationId: string;
    contactPhone?: string;
    senderType: 'user' | 'agent' | 'bot';
    content: string;
    messageType?: 'text' | 'image' | 'quote' | 'document';
    whatsappMessageId?: string;
    metadata?: any;
  }): Promise<{ success: boolean; messageId?: string | number }> {
    try {
      const message = await supabaseDatabaseService.createMessage({
        conversationId: data.conversationId,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType,
        whatsappMessageId: data.whatsappMessageId,
        metadata: data.metadata
      });

      if (message) {
        console.log(`✅ Mensaje creado en Supabase: ${message.id} (${data.senderType})`);
        return { success: true, messageId: message.id };
      } else {
        console.log(`⚠️ No se pudo crear mensaje para conversación ${data.conversationId}`);
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error en createChatbotMessage:', error);
      return { success: false };
    }
  }

  /**
   * Obtener mensajes de conversación
   */
  async getChatbotConversationMessages(conversationId: string, limit: number = 50): Promise<SupabaseMessage[]> {
    try {
      const messages = await supabaseDatabaseService.getConversationMessages(conversationId, limit);
      console.log(`🔍 Mensajes obtenidos: ${messages.length} para conversación ${conversationId}`);
      return messages;
    } catch (error) {
      console.error('❌ Error en getChatbotConversationMessages:', error);
      return [];
    }
  }

  // ===== RESÚMENES =====

  /**
   * Guardar resumen de conversación
   */
  async saveChatbotConversationSummary(
    conversationId: string,
    summaryData: any,
    generatedBy: string = 'gemini-2.5-flash'
  ): Promise<{ success: boolean; summaryId?: string }> {
    try {
      const summary = await supabaseDatabaseService.upsertConversationSummary(
        conversationId,
        summaryData,
        generatedBy
      );

      if (summary) {
        console.log(`✅ Resumen guardado en Supabase: ${summary.id} para conversación ${conversationId}`);
        return { success: true, summaryId: summary.id };
      } else {
        console.log(`⚠️ No se pudo guardar resumen para conversación ${conversationId}`);
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error en saveChatbotConversationSummary:', error);
      return { success: false };
    }
  }

  /**
   * Obtener resumen de conversación
   */
  async getChatbotConversationSummary(conversationId: string): Promise<any | null> {
    try {
      const summary = await supabaseDatabaseService.getConversationSummary(conversationId);
      if (summary) {
        console.log(`🔍 Resumen obtenido para conversación ${conversationId}`);
        return summary.summary_data;
      } else {
        console.log(`📋 No hay resumen disponible para conversación ${conversationId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error en getChatbotConversationSummary:', error);
      return null;
    }
  }

  // ===== PEDIDOS =====

  /**
   * Crear pedido
   */
  async createChatbotOrder(data: {
    conversationId?: string;
    agentId?: string;
    orderDetails: any;
    status?: 'pending' | 'confirmed' | 'cancelled';
  }): Promise<{ success: boolean; orderId?: string; erpOrderId?: string }> {
    try {
      const order = await supabaseDatabaseService.createOrder(data);

      if (order) {
        console.log(`✅ Pedido creado en Supabase: ${order.id}`);
        return {
          success: true,
          orderId: order.id,
          erpOrderId: order.erp_order_id
        };
      } else {
        console.log(`⚠️ No se pudo crear pedido`);
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Error en createChatbotOrder:', error);
      return { success: false };
    }
  }

  // ===== ESTADÍSTICAS =====

  /**
   * Obtener estadísticas del sistema
   */
  async getChatbotStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalOrders: number;
    activeConversations: number;
  }> {
    try {
      const stats = await supabaseDatabaseService.getStats();
      console.log(`📊 Estadísticas obtenidas:`, stats);
      return stats;
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

  // ===== TAKEOVER MANAGEMENT =====

  /**
   * Obtener conversaciones que necesitan takeover
   */
  async getConversationsNeedingTakeover(): Promise<SupabaseConversation[]> {
    try {
      // TODO: Implementar lógica específica para detectar conversaciones que necesitan intervención
      console.log('🔍 Buscando conversaciones que necesitan takeover...');
      return [];
    } catch (error) {
      console.error('❌ Error en getConversationsNeedingTakeover:', error);
      return [];
    }
  }

  /**
   * Asignar conversación a agente humano
   */
  async assignConversationToAgent(conversationId: string, agentId: string): Promise<{ success: boolean }> {
    try {
      const result = await this.setConversationAIMode(conversationId, 'paused', agentId, 'Assigned to human agent');
      if (result.success) {
        console.log(`👤 Conversación ${conversationId} asignada a agente ${agentId}`);
      }
      return { success: result.success };
    } catch (error) {
      console.error('❌ Error en assignConversationToAgent:', error);
      return { success: false };
    }
  }

  /**
   * Liberar conversación de agente (volver a IA)
   */
  async releaseConversationFromAgent(conversationId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      const result = await this.setConversationAIMode(conversationId, 'active', undefined, reason || 'Released back to AI');
      if (result.success) {
        console.log(`🤖 Conversación ${conversationId} liberada de vuelta a IA`);
      }
      return { success: result.success };
    } catch (error) {
      console.error('❌ Error en releaseConversationFromAgent:', error);
      return { success: false };
    }
  }

  // ===== MÉTODOS DE CONSULTA DIRECTA =====

  /**
   * Obtener conversaciones activas
   */
  async getActiveConversations(): Promise<SupabaseConversation[]> {
    try {
      // Usando servicio directo para obtener conversaciones activas
      return await supabaseDatabaseService.getActiveConversations();
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
    try {
      return await supabaseDatabaseService.searchConversations(criteria);
    } catch (error) {
      console.error('❌ Error en searchConversations:', error);
      return [];
    }
  }

  // ===== MÉTODOS DE DASHBOARD REQUERIDOS =====

  /**
   * Obtener conversaciones con paginación (para dashboard)
   */
  async getConversations(limit: number = 50, offset: number = 0): Promise<SupabaseConversation[]> {
    try {
      // Implementación básica - obtener conversaciones ordenadas por fecha
      const conversations = await this.getActiveConversations();
      return conversations.slice(offset, offset + limit);
    } catch (error) {
      console.error('❌ Error en getConversations:', error);
      return [];
    }
  }

  // ===== MÉTODOS DE PRODUCTOS (TEMPORAL) =====

  /**
   * Buscar productos (temporal hasta integrar SOAP)
   */
  async searchChatbotProducts(searchTerm: string, limit: number = 10): Promise<any[]> {
    try {
      const products = await supabaseDatabaseService.searchProducts(searchTerm, limit);
      return products;
    } catch (error) {
      console.error('❌ Error en searchChatbotProducts:', error);
      return [];
    }
  }

  // ===== MÉTODOS DE CONTACTOS (STUBS TEMPORALES) =====

  async getContacts(options: any): Promise<any> {
    console.log('📋 getContacts - método temporal sin implementar');
    return { contacts: [], total: 0 };
  }

  async searchContacts(...args: any[]): Promise<any[]> {
    console.log('📋 searchContacts - método temporal sin implementar');
    return [];
  }

  async getContactById(id: string): Promise<any> {
    console.log('📋 getContactById - método temporal sin implementar');
    return null;
  }

  async updateContact(id: string, data: any): Promise<any> {
    console.log('📋 updateContact - método temporal sin implementar');
    return null;
  }

  async deleteContact(id: string): Promise<boolean> {
    console.log('📋 deleteContact - método temporal sin implementar');
    return false;
  }

  async toggleBlockContact(id: string): Promise<any> {
    console.log('📋 toggleBlockContact - método temporal sin implementar');
    return { success: false };
  }

  async toggleFavoriteContact(id: string): Promise<any> {
    console.log('📋 toggleFavoriteContact - método temporal sin implementar');
    return { success: false };
  }

  async getTags(): Promise<any[]> {
    console.log('📋 getTags - método temporal sin implementar');
    return [];
  }

  async createTag(data: any): Promise<any> {
    console.log('📋 createTag - método temporal sin implementar');
    return null;
  }

  async updateTag(id: string, data: any): Promise<any> {
    console.log('📋 updateTag - método temporal sin implementar');
    return null;
  }

  async deleteTag(id: string): Promise<boolean> {
    console.log('📋 deleteTag - método temporal sin implementar');
    return false;
  }

  async addTagToContact(contactId: string, tagId: string): Promise<boolean> {
    console.log('📋 addTagToContact - método temporal sin implementar');
    return false;
  }

  async removeTagFromContact(contactId: string, tagId: string): Promise<boolean> {
    console.log('📋 removeTagFromContact - método temporal sin implementar');
    return false;
  }

  async getContactsByTag(...args: any[]): Promise<any[]> {
    console.log('📋 getContactsByTag - método temporal sin implementar');
    return [];
  }

  // ===== MÉTODOS DE WHATSAPP SERVICE REQUERIDOS =====

  async connect(): Promise<void> {
    console.log('🔌 DatabaseService.connect - Supabase siempre conectado');
  }

  async getStats(): Promise<any> {
    return await this.getChatbotStats();
  }

  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const messages = await this.getChatbotConversationMessages(conversationId, limit);
    return messages.slice(offset, offset + limit);
  }

  async processOutgoingMessage(data: any): Promise<any> {
    console.log('📤 processOutgoingMessage - método temporal');
    return { success: true, messageId: 'temp-' + Date.now() };
  }

  async processIncomingMessage(data: any): Promise<any> {
    console.log('📥 processIncomingMessage - método temporal');
    return { success: true, messageId: 'temp-' + Date.now() };
  }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    console.log('✅ markMessageAsRead - método temporal');
    return true;
  }

  async markConversationAsRead(conversationId: string): Promise<boolean> {
    console.log('✅ markConversationAsRead - método temporal');
    return true;
  }

  async cleanupOldMessages(olderThanHours: number): Promise<number> {
    console.log('🧹 cleanupOldMessages - método temporal');
    return 0;
  }
}

// Instancia singleton
export const databaseService = new DatabaseService(); 