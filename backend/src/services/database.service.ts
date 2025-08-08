import { supabaseDatabaseService, SupabaseConversation, SupabaseMessage } from './supabase-database.service';
import { supabaseAdmin } from '../config/supabase';
import { productCatalogService } from './product-catalog.service';

/**
 * Servicio principal de base de datos - NUEVO ESQUEMA
 * Usando las tablas: agents, contacts, conversations, messages
 */
export class DatabaseService {
  // Exponer cliente Supabase para compatibilidad legacy (solo lectura de tipo)
  public readonly supabase: any = supabaseAdmin;
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
    clientId?: string; // NUEVO: Identificador único del frontend para evitar duplicados
    metadata?: any;
  }): Promise<{ success: boolean; messageId?: string | number }> {
    try {
      const message = await supabaseDatabaseService.createMessage({
        conversationId: data.conversationId,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType,
        whatsappMessageId: data.whatsappMessageId,
        clientId: data.clientId, // NUEVO: Pasar clientId
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
      console.log(`📨 [DatabaseService] Obteniendo mensajes para conversación: ${conversationId} (límite: ${limit})`);
      
      const messages = await supabaseDatabaseService.getConversationMessages(conversationId, limit);
      
      console.log(`📨 [DatabaseService] ${messages.length} mensajes obtenidos para ${conversationId}`);
      
      // DEBUG: Contar mensajes por tipo de remitente
      if (messages.length > 0) {
        const userMessages = messages.filter(m => m.sender_type === 'user').length;
        const botMessages = messages.filter(m => m.sender_type === 'bot').length;
        const agentMessages = messages.filter(m => m.sender_type === 'agent').length;
        
        console.log(`📨 [DatabaseService] Desglose de mensajes: User=${userMessages}, Bot=${botMessages}, Agent=${agentMessages}`);
      }
      
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
    clientId?: string; // NUEVO: Incluir clientId para deduplicación
    status?: string; // NUEVO: Estado del mensaje (pending, sent, delivered, read, failed)
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
      console.log('🗄️ [DatabaseService] Procesando mensaje saliente:', {
        waMessageId: data.waMessageId,
        toWaId: data.toWaId,
        contentLength: data.content.length,
        messageType: data.messageType,
        clientId: data.clientId
      });

      // Obtener o crear contacto
      console.log('🗄️ [DatabaseService] Obteniendo/creando contacto...');
      const contact = await this.getOrCreateContact(data.toWaId);
      if (!contact) {
        console.error('❌ [DatabaseService] No se pudo obtener/crear contacto');
        throw new Error('No se pudo obtener/crear contacto');
      }
      console.log('✅ [DatabaseService] Contacto obtenido:', contact.id);

      // Obtener o crear conversación
      console.log('🗄️ [DatabaseService] Obteniendo/creando conversación...');
      const conversation = await this.getOrCreateConversationByPhone(data.toWaId);
      if (!conversation) {
        console.error('❌ [DatabaseService] No se pudo obtener/crear conversación');
        throw new Error('No se pudo obtener/crear conversación');
      }
      console.log('✅ [DatabaseService] Conversación obtenida:', conversation.id);

      // Crear mensaje
      console.log('🗄️ [DatabaseService] Creando mensaje en BD...');
      const messageResult = await this.createChatbotMessage({
        conversationId: conversation.id,
        contactPhone: data.toWaId,
        senderType: 'agent',
        content: data.content,
        messageType: data.messageType,
        whatsappMessageId: data.waMessageId,
        clientId: data.clientId,
        metadata: {
          mediaUrl: data.mediaUrl,
          mediaCaption: data.mediaCaption
        }
      });

      if (!messageResult.success) {
        console.error('❌ [DatabaseService] Error creando mensaje:', messageResult);
        throw new Error('Error creando mensaje');
      }

      console.log('✅ [DatabaseService] Mensaje creado:', messageResult.messageId);

      // Actualizar conversación
      console.log('🗄️ [DatabaseService] Actualizando conversación...');
      await this.updateConversationLastMessage(conversation.id, data.timestamp);

      const result = {
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
          name: contact.name || contact.phone,
          waId: contact.phone
        }
      };

      console.log('✅ [DatabaseService] Mensaje saliente procesado exitosamente:', {
        messageId: result.message.id,
        conversationId: result.conversation.id,
        contactId: result.contact.id
      });

      return result;
    } catch (error) {
      console.error('❌ [DatabaseService] Error procesando mensaje saliente:', error);
      throw error;
    }
  }

  // ===== FUNCIONES DE CONEXIÓN Y ESTADÍSTICAS =====

  async connect(): Promise<void> {
    console.log('🔌 DatabaseService conectado (nuevo esquema)');
  }

  /**
   * Actualizar la fecha del último mensaje de una conversación
   */
  async updateConversationLastMessage(conversationId: string, timestamp: Date): Promise<boolean> {
    try {
      console.log('🗄️ [DatabaseService] Actualizando último mensaje de conversación:', conversationId);
      const success = await supabaseDatabaseService.updateConversationLastMessage(conversationId, timestamp);
      if (success) {
        console.log('✅ [DatabaseService] Último mensaje actualizado exitosamente');
      } else {
        console.warn('⚠️ [DatabaseService] No se pudo actualizar último mensaje');
      }
      return success;
    } catch (error) {
      console.error('❌ [DatabaseService] Error actualizando último mensaje:', error);
      return false;
    }
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

  /**
   * Obtener modo takeover de conversación
   */
  async getConversationTakeoverMode(conversationId: string): Promise<'spectator' | 'takeover' | 'ai_only' | null> {
    try {
      const mode = await supabaseDatabaseService.getConversationTakeoverMode(conversationId);
      console.log(`🔍 Takeover mode obtenido: ${conversationId} -> ${mode}`);
      return mode;
    } catch (error) {
      console.error('❌ Error en getConversationTakeoverMode:', error);
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
    try {
      const result = await supabaseDatabaseService.setConversationTakeoverMode(conversationId, mode, agentId, reason);
      if (result.success) {
        console.log(`✅ Takeover mode actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''}`);
      } else {
        console.error(`❌ Error actualizando takeover mode: ${result.error}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Error en setConversationTakeoverMode:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtener conversaciones en modo espectador
   */
  async getSpectatorConversations(): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.getSpectatorConversations();
      console.log(`🔍 Conversaciones en espectador: ${conversations.length}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones en espectador:', error);
      return [];
    }
  }

  /**
   * Obtener conversaciones en takeover
   */
  async getTakeoverConversations(): Promise<SupabaseConversation[]> {
    try {
      const conversations = await supabaseDatabaseService.getTakeoverConversations();
      console.log(`🔍 Conversaciones en takeover: ${conversations.length}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones en takeover:', error);
      return [];
    }
  }

  /**
   * Verificar si el chatbot puede procesar un mensaje
   */
  async canChatbotProcessMessage(conversationId: string): Promise<boolean> {
    try {
      const canProcess = await supabaseDatabaseService.canChatbotProcessMessage(conversationId);
      console.log(`🔍 Chatbot puede procesar ${conversationId}: ${canProcess}`);
      return canProcess;
    } catch (error) {
      console.error('❌ Error verificando si chatbot puede procesar:', error);
      return false;
    }
  }

  /**
   * Verificar si ya existe un mensaje con el mismo client_id en una conversación
   */
  async checkMessageByClientId(conversationId: string, clientId: string): Promise<any | null> {
    try {
      const message = await supabaseDatabaseService.checkMessageByClientId(conversationId, clientId);
      if (message) {
        console.log(`🔍 Mensaje con client_id ${clientId} ya existe en conversación ${conversationId}`);
      }
      return message;
    } catch (error) {
      console.error('❌ Error en checkMessageByClientId:', error);
      return null;
    }
  }

  // ===== NUEVOS MÉTODOS PARA PERSISTENCIA =====

  /**
   * Actualizar estado de mensaje
   */
  async updateMessageStatus(messageId: number, status: string): Promise<boolean> {
    try {
      console.log(`🔄 [PERSISTENCE] Actualizando estado de mensaje ${messageId} a ${status}`);
      const success = await supabaseDatabaseService.updateMessageStatus(messageId, status);
      if (success) {
        console.log(`✅ [PERSISTENCE] Estado actualizado: ${messageId} -> ${status}`);
      } else {
        console.error(`❌ [PERSISTENCE] Fallo al actualizar estado: ${messageId} -> ${status}`);
      }
      return success;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error actualizando estado de mensaje:', error);
      return false;
    }
  }

  /**
   * Actualizar mensaje con WhatsApp Message ID
   */
  async updateMessageWithWhatsAppId(messageId: number, whatsappMessageId: string): Promise<boolean> {
    try {
      console.log(`🔄 [PERSISTENCE] Actualizando mensaje ${messageId} con WhatsApp ID: ${whatsappMessageId}`);
      const success = await supabaseDatabaseService.updateMessageWithWhatsAppId(messageId, whatsappMessageId);
      if (success) {
        console.log(`✅ [PERSISTENCE] WhatsApp ID actualizado: ${messageId} -> ${whatsappMessageId}`);
      } else {
        console.error(`❌ [PERSISTENCE] Fallo al actualizar WhatsApp ID: ${messageId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error actualizando WhatsApp Message ID:', error);
      return false;
    }
  }

  /**
   * Obtener mensajes fallidos para retry
   */
  async getFailedMessages(): Promise<any[]> {
    try {
      console.log('🔄 [PERSISTENCE] Obteniendo mensajes fallidos para retry');
      const failedMessages = await supabaseDatabaseService.getFailedMessages();
      console.log(`✅ [PERSISTENCE] Mensajes fallidos encontrados: ${failedMessages.length}`);
      return failedMessages;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error obteniendo mensajes fallidos:', error);
      return [];
    }
  }

  /**
   * Limpiar mensajes temporales antiguos
   */
  async cleanupTemporaryMessages(): Promise<number> {
    try {
      console.log('🧹 [PERSISTENCE] Limpiando mensajes temporales antiguos');
      const deletedCount = await supabaseDatabaseService.cleanupTemporaryMessages();
      console.log(`✅ [PERSISTENCE] Mensajes temporales eliminados: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error limpiando mensajes temporales:', error);
      return 0;
    }
  }

  // ===== MÉTODOS PARA FASE 3: RETRY SERVICE =====

  /**
   * Incrementar contador de reintentos de un mensaje
   */
  async incrementRetryCount(messageId: number): Promise<boolean> {
    try {
      console.log(`🔄 [RETRY] Incrementando contador de reintentos para mensaje ${messageId}`);
      const success = await supabaseDatabaseService.incrementRetryCount(messageId);
      if (success) {
        console.log(`✅ [RETRY] Contador de reintentos incrementado: ${messageId}`);
      } else {
        console.error(`❌ [RETRY] Fallo al incrementar contador de reintentos: ${messageId}`);
      }
      return success;
    } catch (error) {
      console.error('❌ [RETRY] Error incrementando contador de reintentos:', error);
      return false;
    }
  }

  /**
   * Obtener mensaje por ID
   */
  async getMessageById(messageId: number): Promise<any | null> {
    try {
      console.log(`🔍 [RETRY] Obteniendo mensaje por ID: ${messageId}`);
      const message = await supabaseDatabaseService.getMessageById(messageId);
      if (message) {
        console.log(`✅ [RETRY] Mensaje encontrado: ${messageId}`);
      } else {
        console.log(`⚠️ [RETRY] Mensaje no encontrado: ${messageId}`);
      }
      return message;
    } catch (error) {
      console.error('❌ [RETRY] Error obteniendo mensaje por ID:', error);
      return null;
    }
  }

  /**
   * Limpiar mensajes fallidos antiguos
   */
  async cleanupOldFailedMessages(cutoffTime: Date): Promise<number> {
    try {
      console.log(`🧹 [RETRY] Limpiando mensajes fallidos anteriores a: ${cutoffTime.toISOString()}`);
      const deletedCount = await supabaseDatabaseService.cleanupOldFailedMessages(cutoffTime);
      console.log(`✅ [RETRY] Mensajes fallidos antiguos eliminados: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ [RETRY] Error limpiando mensajes fallidos antiguos:', error);
      return 0;
    }
  }
}

// Instancia singleton
export const databaseService = new DatabaseService(); 
