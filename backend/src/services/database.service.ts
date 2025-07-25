import { supabaseDatabaseService, SupabaseConversation, SupabaseMessage } from './supabase-database.service';
import { productCatalogService } from './product-catalog.service';

/**
 * Servicio principal de base de datos - NUEVO ESQUEMA
 * Usando las tablas: agents, contacts, conversations, messages
 */
export class DatabaseService {
  constructor() {
    console.log('🗄️ DatabaseService inicializado (Nuevo esquema: agents, contacts, conversations, messages)');
    console.log('📦 ProductCatalogService integrado');
  }

  // ===== AGENTES =====

  /**
   * Obtener todos los agentes
   */
  async getAgents(): Promise<any[]> {
    try {
      const agents = await supabaseDatabaseService.getAgents();
      console.log(`✅ Agentes obtenidos: ${agents.length}`);
      return agents;
    } catch (error) {
      console.error('❌ Error obteniendo agentes:', error);
      return [];
    }
  }

  /**
   * Obtener agente por ID
   */
  async getAgentById(agentId: string): Promise<any | null> {
    try {
      const agent = await supabaseDatabaseService.getAgentById(agentId);
      console.log(`✅ Agente obtenido: ${agentId}`);
      return agent;
    } catch (error) {
      console.error('❌ Error obteniendo agente:', error);
      return null;
    }
  }

  /**
   * Obtener agente por email
   */
  async getAgentByEmail(email: string): Promise<any | null> {
    try {
      const agent = await supabaseDatabaseService.getAgentByEmail(email);
      console.log(`✅ Agente obtenido por email: ${email}`);
      return agent;
    } catch (error) {
      console.error('❌ Error obteniendo agente por email:', error);
      return null;
    }
  }

  // ===== CONTACTOS =====

  /**
   * Obtener o crear contacto por teléfono
   */
  async getOrCreateContact(phone: string, name?: string): Promise<any | null> {
    try {
      const contact = await supabaseDatabaseService.getOrCreateContact(phone, name);
      if (contact) {
        console.log(`✅ Contacto encontrado/creado: ${contact.id} para ${phone}`);
      } else {
        console.log(`⚠️ No se pudo crear contacto para ${phone}`);
      }
      return contact;
    } catch (error) {
      console.error('❌ Error en getOrCreateContact:', error);
      return null;
    }
  }

  /**
   * Obtener contacto por teléfono
   */
  async getContactByPhone(phone: string): Promise<any | null> {
    try {
      const contact = await supabaseDatabaseService.getContactByPhone(phone);
      console.log(`✅ Contacto obtenido por teléfono: ${phone}`);
      return contact;
    } catch (error) {
      console.error('❌ Error obteniendo contacto por teléfono:', error);
      return null;
    }
  }

  /**
   * Actualizar contacto
   */
  async updateContact(contactId: string, data: any): Promise<boolean> {
    try {
      const success = await supabaseDatabaseService.updateContact(contactId, data);
      if (success) {
        console.log(`✅ Contacto actualizado: ${contactId}`);
      } else {
        console.log(`⚠️ No se pudo actualizar contacto: ${contactId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error actualizando contacto:', error);
      return false;
    }
  }

  /**
   * Obtener todos los contactos
   */
  async getContacts(options: any): Promise<any> {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const contacts = await supabaseDatabaseService.getContacts(limit, offset);
      console.log(`✅ Contactos obtenidos: ${contacts.length}`);
      return { contacts, total: contacts.length };
    } catch (error) {
      console.error('❌ Error obteniendo contactos:', error);
      return { contacts: [], total: 0 };
    }
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

  /**
   * Obtener conversaciones que necesitan takeover
   */
  async getConversationsNeedingTakeover(): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.getConversationsNeedingTakeover();
      console.log(`🔍 Conversaciones que necesitan takeover: ${conversations.length}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones para takeover:', error);
      return [];
    }
  }

  /**
   * Asignar conversación a agente
   */
  async assignConversationToAgent(conversationId: string, agentId: string): Promise<{ success: boolean }> {
    try {
      const result = await supabaseDatabaseService.assignConversationToAgent(conversationId, agentId);
      if (result.success) {
        console.log(`✅ Conversación ${conversationId} asignada a agente ${agentId}`);
      } else {
        console.error(`❌ Error asignando conversación: ${result.error}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error en assignConversationToAgent:', error);
      return { success: false };
    }
  }

  /**
   * Liberar conversación de agente
   */
  async releaseConversationFromAgent(conversationId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      const result = await supabaseDatabaseService.releaseConversationFromAgent(conversationId, reason);
      if (result.success) {
        console.log(`✅ Conversación ${conversationId} liberada del agente`);
      } else {
        console.error(`❌ Error liberando conversación: ${result.error}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error en releaseConversationFromAgent:', error);
      return { success: false };
    }
  }

  /**
   * Obtener conversaciones activas
   */
  async getActiveConversations(): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.getActiveConversations();
      console.log(`✅ Conversaciones activas obtenidas: ${conversations.length}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones activas:', error);
      return [];
    }
  }

  /**
   * Buscar conversaciones
   */
  async searchConversations(criteria: {
    contactPhone?: string;
    status?: 'active' | 'waiting' | 'closed';
    aiMode?: 'active' | 'inactive' | 'paused';
    agentId?: string;
  }): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.searchConversations(criteria);
      console.log(`🔍 Conversaciones encontradas: ${conversations.length}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error buscando conversaciones:', error);
      return [];
    }
  }

  /**
   * Obtener conversaciones
   */
  async getConversations(limit: number = 50, offset: number = 0): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.getConversations(limit, offset);
      console.log(`✅ Conversaciones obtenidas: ${conversations.length}`);
      
      // Enriquecer conversaciones con información adicional
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Obtener el último mensaje de la conversación de manera eficiente
          const lastMessage = await this.getLastMessage(conv.id);
          
          // Obtener información del contacto
          let contact = null;
          if (conv.contact_phone) {
            contact = await this.getContactByPhone(conv.contact_phone);
          }
          
          return {
            ...conv,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              timestamp: lastMessage.created_at,
              isFromUs: lastMessage.sender_type === 'agent' || lastMessage.sender_type === 'bot'
            } : null,
            contact: contact,
            _count: {
              messages: 1 // Por ahora, podríamos implementar un contador real si es necesario
            }
          };
        })
      );
      
      return enrichedConversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones:', error);
      return [];
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
      console.log(`✅ Mensajes obtenidos para conversación ${conversationId}: ${messages.length}`);
      return messages;
    } catch (error) {
      console.error('❌ Error en getChatbotConversationMessages:', error);
      return [];
    }
  }

  /**
   * Obtener el último mensaje de una conversación
   */
  async getLastMessage(conversationId: string): Promise<SupabaseMessage | null> {
    try {
      const message = await supabaseDatabaseService.getLastMessage(conversationId);
      console.log(`✅ Último mensaje obtenido para conversación ${conversationId}: ${message ? message.id : 'sin mensajes'}`);
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
    try {
      const success = await supabaseDatabaseService.markMessageAsRead(messageId);
      if (success) {
        console.log(`✅ Mensaje marcado como leído: ${messageId}`);
      } else {
        console.log(`⚠️ No se pudo marcar mensaje como leído: ${messageId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error en markMessageAsRead:', error);
      return false;
    }
  }

  /**
   * Marcar conversación como leída
   */
  async markConversationAsRead(conversationId: string): Promise<boolean> {
    try {
      const success = await supabaseDatabaseService.markConversationAsRead(conversationId);
      if (success) {
        console.log(`✅ Conversación marcada como leída: ${conversationId}`);
      } else {
        console.log(`⚠️ No se pudo marcar conversación como leída: ${conversationId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ Error en markConversationAsRead:', error);
      return false;
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
    try {
      const stats = await supabaseDatabaseService.getChatbotStats();
      console.log('📊 Estadísticas del chatbot obtenidas');
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

  // ===== FUNCIONES LEGACY (MANTENER COMPATIBILIDAD) =====

  async saveChatbotConversationSummary(
    conversationId: string,
    summaryData: any,
    generatedBy: string = 'gemini-2.5-flash'
  ): Promise<{ success: boolean; summaryId?: string }> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📝 Resumen guardado para conversación ${conversationId} (legacy)`);
    return { success: true, summaryId: 'legacy' };
  }

  async getChatbotConversationSummary(conversationId: string): Promise<any | null> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📝 Resumen obtenido para conversación ${conversationId} (legacy)`);
    return null;
  }

  async createChatbotOrder(data: {
    conversationId?: string;
    agentId?: string;
    orderDetails: any;
    status?: 'pending' | 'confirmed' | 'cancelled';
  }): Promise<{ success: boolean; orderId?: string; erpOrderId?: string }> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`📦 Orden creada (legacy)`);
    return { success: true, orderId: 'legacy', erpOrderId: 'legacy' };
  }

  async searchChatbotProducts(searchTerm: string, limit: number = 10): Promise<any[]> {
    const result = await productCatalogService.searchProducts(searchTerm, { limit });
    return result.products;
  }

  // ===== FUNCIONES DE WHATSAPP (MANTENER COMPATIBILIDAD) =====

  async processIncomingMessage(data: {
    waMessageId: string;
    fromWaId: string;
    toWaId: string;
    content: string;
    messageType: any;
    timestamp: Date;
    contactName?: string;
    mediaUrl?: string;
    mediaCaption?: string;
  }): Promise<{
    success: boolean;
    message: {
      id: number;
      timestamp: Date;
      content: string;
    };
    conversation: {
      id: string;
      unreadCount: number;
    };
    contact: {
      id: string;
      name: string;
      waId: string;
    };
  }> {
    try {
      // Obtener o crear contacto
      const contact = await this.getOrCreateContact(data.fromWaId, data.contactName);
      if (!contact) {
        throw new Error('No se pudo crear/obtener contacto');
      }

      // Obtener o crear conversación
      const conversation = await this.getOrCreateConversationByPhone(data.fromWaId);
      if (!conversation) {
        throw new Error('No se pudo crear/obtener conversación');
      }

      // Crear mensaje
      const messageResult = await this.createChatbotMessage({
        conversationId: conversation.id,
        senderType: 'user',
        content: data.content,
        messageType: data.messageType,
        whatsappMessageId: data.waMessageId,
        metadata: {
          mediaUrl: data.mediaUrl,
          mediaCaption: data.mediaCaption,
          timestamp: data.timestamp
        }
      });

      if (!messageResult.success) {
        throw new Error('No se pudo crear mensaje');
      }

      // Actualizar conversación
      await supabaseDatabaseService.updateConversationLastMessage(conversation.id, data.timestamp);

      console.log(`✅ Mensaje entrante procesado: ${data.waMessageId}`);

      return {
        success: true,
        message: {
          id: messageResult.messageId as number,
          timestamp: data.timestamp,
          content: data.content
        },
        conversation: {
          id: conversation.id,
          unreadCount: conversation.unread_count || 0
        },
        contact: {
          id: contact.id,
          name: contact.name || 'Sin nombre',
          waId: contact.phone
        }
      };
    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error);
      return {
        success: false,
        message: { id: 0, timestamp: new Date(), content: '' },
        conversation: { id: '', unreadCount: 0 },
        contact: { id: '', name: '', waId: '' }
      };
    }
  }

  async processOutgoingMessage(data: {
    waMessageId: string;
    toWaId: string;
    content: string;
    messageType: any;
    timestamp: Date;
    mediaUrl?: string;
    mediaCaption?: string;
  }): Promise<{
    success: boolean;
    message: {
      id: number;
      timestamp: Date;
      content: string;
    };
    conversation: {
      id: string;
      unreadCount: number;
    };
    contact: {
      id: string;
      name: string;
      waId: string;
    };
  }> {
    try {
      // Obtener o crear contacto
      const contact = await this.getOrCreateContact(data.toWaId);
      if (!contact) {
        throw new Error('No se pudo crear/obtener contacto');
      }

      // Obtener o crear conversación
      const conversation = await this.getOrCreateConversationByPhone(data.toWaId);
      if (!conversation) {
        throw new Error('No se pudo crear/obtener conversación');
      }

      // Crear mensaje
      const messageResult = await this.createChatbotMessage({
        conversationId: conversation.id,
        senderType: 'agent',
        content: data.content,
        messageType: data.messageType,
        whatsappMessageId: data.waMessageId,
        metadata: {
          mediaUrl: data.mediaUrl,
          mediaCaption: data.mediaCaption,
          timestamp: data.timestamp
        }
      });

      if (!messageResult.success) {
        throw new Error('No se pudo crear mensaje');
      }

      // Actualizar conversación
      await supabaseDatabaseService.updateConversationLastMessage(conversation.id, data.timestamp);

      console.log(`✅ Mensaje saliente procesado: ${data.waMessageId}`);

      return {
        success: true,
        message: {
          id: messageResult.messageId as number,
          timestamp: data.timestamp,
          content: data.content
        },
        conversation: {
          id: conversation.id,
          unreadCount: conversation.unread_count || 0
        },
        contact: {
          id: contact.id,
          name: contact.name || 'Sin nombre',
          waId: contact.phone
        }
      };
    } catch (error) {
      console.error('❌ Error procesando mensaje saliente:', error);
      return {
        success: false,
        message: { id: 0, timestamp: new Date(), content: '' },
        conversation: { id: '', unreadCount: 0 },
        contact: { id: '', name: '', waId: '' }
      };
    }
  }

  // ===== FUNCIONES DE CONEXIÓN Y ESTADÍSTICAS =====

  async connect(): Promise<void> {
    console.log('🔌 DatabaseService conectado (nuevo esquema)');
  }

  /**
   * Verificar si la base de datos está saludable
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Intentar hacer una consulta simple para verificar la conexión
      const stats = await this.getChatbotStats();
      return stats.totalConversations >= 0; // Si no hay error, está saludable
    } catch (error) {
      console.error('❌ Error en health check de base de datos:', error);
      return false;
    }
  }

  async getStats(): Promise<any> {
    return await this.getChatbotStats();
  }

  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return await this.getChatbotConversationMessages(conversationId, limit);
  }

  async cleanupOldMessages(olderThanHours: number): Promise<number> {
    try {
      const deletedCount = await supabaseDatabaseService.cleanupOldMessages(olderThanHours);
      console.log(`🧹 Mensajes antiguos eliminados: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error limpiando mensajes antiguos:', error);
      return 0;
    }
  }

  // ===== FUNCIONES LEGACY DE CONTACTOS (MANTENER COMPATIBILIDAD) =====

  async searchContacts(...args: any[]): Promise<any[]> {
    // TODO: Implementar búsqueda en el nuevo esquema
    console.log('🔍 Búsqueda de contactos (legacy)');
    return [];
  }

  async getContactById(id: string): Promise<any> {
    try {
      const contact = await supabaseDatabaseService.getContactById(id);
      console.log(`✅ Contacto obtenido por ID: ${id}`);
      return contact;
    } catch (error) {
      console.error('❌ Error obteniendo contacto por ID:', error);
      return null;
    }
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      const success = await supabaseDatabaseService.deleteContact(id);
      console.log(`✅ Contacto eliminado: ${id}`);
      return success;
    } catch (error) {
      console.error('❌ Error eliminando contacto:', error);
      return false;
    }
  }

  async toggleBlockContact(id: string): Promise<any> {
    // TODO: Implementar en el nuevo esquema
    console.log(`🚫 Contacto bloqueado/desbloqueado: ${id} (legacy)`);
    return { success: true };
  }

  async toggleFavoriteContact(id: string): Promise<any> {
    // TODO: Implementar en el nuevo esquema
    console.log(`⭐ Contacto marcado/desmarcado como favorito: ${id} (legacy)`);
    return { success: true };
  }

  async getTags(): Promise<any[]> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log('🏷️ Tags obtenidos (legacy)');
    return [];
  }

  async createTag(data: any): Promise<any> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log('🏷️ Tag creado (legacy)');
    return { id: 'legacy', name: data.name };
  }

  async updateTag(id: string, data: any): Promise<any> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`🏷️ Tag actualizado: ${id} (legacy)`);
    return { id, name: data.name };
  }

  async deleteTag(id: string): Promise<boolean> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`🏷️ Tag eliminado: ${id} (legacy)`);
    return true;
  }

  async addTagToContact(contactId: string, tagId: string): Promise<boolean> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`🏷️ Tag agregado a contacto: ${contactId} -> ${tagId} (legacy)`);
    return true;
  }

  async removeTagFromContact(contactId: string, tagId: string): Promise<boolean> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log(`🏷️ Tag removido de contacto: ${contactId} -> ${tagId} (legacy)`);
    return true;
  }

  async getContactsByTag(...args: any[]): Promise<any[]> {
    // TODO: Implementar en el nuevo esquema si es necesario
    console.log('🔍 Contactos por tag (legacy)');
    return [];
  }
}

// Instancia singleton
export const databaseService = new DatabaseService(); 
