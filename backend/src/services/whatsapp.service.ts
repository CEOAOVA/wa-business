import axios from 'axios';
import { Server } from 'socket.io';
import { whatsappConfig, buildApiUrl, getHeaders } from '../config/whatsapp';
import { databaseService } from './database.service';
import { MessageType } from '../generated/prisma';

export interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text';
}

export interface SendTemplateRequest {
  to: string;
  template: string;
  language?: string;
}

export interface WhatsAppWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppService {
  private io?: Server;

  // Inicializar servicio de base de datos
  async initialize(socketIo?: Server) {
    try {
      this.io = socketIo;
      await databaseService.connect();
      console.log('✅ WhatsApp Service inicializado con base de datos');
      if (socketIo) {
        console.log('🌐 Socket.IO integrado con WhatsApp Service');
      }
    } catch (error) {
      console.error('❌ Error inicializando WhatsApp Service:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(data: SendMessageRequest) {
    try {
      const url = buildApiUrl(`${whatsappConfig.phoneNumberId}/messages`);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: data.to,
        type: 'text',
        text: {
          body: data.message
        }
      };

      console.log('📤 Enviando mensaje WhatsApp:', {
        to: data.to,
        message: data.message.substring(0, 50) + '...',
        url
      });

      const response = await axios.post(url, payload, {
        headers: getHeaders()
      });

      console.log('✅ Mensaje enviado exitosamente:', response.data);

      // Guardar mensaje enviado en la base de datos
      const messageId = response.data.messages?.[0]?.id;
      if (messageId) {
        try {
          const result = await databaseService.processOutgoingMessage({
            waMessageId: messageId,
            toWaId: data.to,
            content: data.message,
            messageType: MessageType.TEXT,
            timestamp: new Date()
          });

          // Emitir evento de Socket.IO para mensaje enviado
          if (this.io && result) {
            const sentMessage = {
              id: result.message.id,
              waMessageId: messageId,
              from: 'us',
              to: data.to,
              message: data.message,
              timestamp: result.message.timestamp,
              type: 'text',
              read: false,
              conversationId: result.conversation.id,
              contactId: result.contact.id
            };

            this.io.to(`conversation_${result.conversation.id}`).emit('new_message', {
              message: sentMessage,
              conversation: {
                id: result.conversation.id,
                contactId: result.contact.id,
                contactName: result.contact.name || result.contact.waId,
                unreadCount: result.conversation.unreadCount
              }
            });

            // También emitir para actualizar lista de conversaciones
            this.io.emit('conversation_updated', {
              conversationId: result.conversation.id,
              lastMessage: sentMessage,
              unreadCount: result.conversation.unreadCount
            });

            console.log('🌐 Evento Socket.IO emitido para mensaje enviado');
          }
        } catch (dbError) {
          console.error('⚠️ Error guardando mensaje enviado en BD:', dbError);
          // No fallar el envío por error de BD
        }
      }

      return {
        success: true,
        messageId,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Enviar mensaje con template
   */
  async sendTemplate(data: SendTemplateRequest) {
    try {
      const url = buildApiUrl(`${whatsappConfig.phoneNumberId}/messages`);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: data.to,
        type: 'template',
        template: {
          name: data.template,
          language: {
            code: data.language || 'es'
          }
        }
      };

      console.log('📤 Enviando template WhatsApp:', {
        to: data.to,
        template: data.template,
        url
      });

      const response = await axios.post(url, payload, {
        headers: getHeaders()
      });

      console.log('✅ Template enviado exitosamente:', response.data);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Error enviando template:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Obtener información del número de teléfono
   */
  async getPhoneNumberInfo() {
    try {
      const url = buildApiUrl(whatsappConfig.phoneNumberId);
      
      console.log('📞 Obteniendo info del número:', url);

      const response = await axios.get(url, {
        headers: getHeaders()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo info del número:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Verificar estado de configuración
   */
  getStatus() {
    const isConfigured = !!(
      whatsappConfig.accessToken && 
      whatsappConfig.phoneNumberId && 
      whatsappConfig.accessToken.length > 50
    );

    return {
      success: true,
      status: {
        configured: isConfigured,
        phoneId: whatsappConfig.phoneNumberId,
        tokenPresent: !!whatsappConfig.accessToken,
        tokenLength: whatsappConfig.accessToken?.length || 0,
        apiVersion: whatsappConfig.apiVersion
      }
    };
  }

  /**
   * Procesar webhook de WhatsApp
   */
  async processWebhook(body: WhatsAppWebhookMessage) {
    console.log('📨 Procesando webhook de WhatsApp:', JSON.stringify(body, null, 2));

    const processedMessages: any[] = [];

    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;
              
              // Procesar mensajes entrantes
              for (const message of value.messages || []) {
                const contact = value.contacts?.find(c => c.wa_id === message.from);
                
                try {
                  // Determinar tipo de mensaje
                  let messageType = MessageType.TEXT;
                  let content = '';
                  
                  if (message.type === 'text' && message.text?.body) {
                    content = message.text.body;
                  } else if (message.type === 'image') {
                    content = '[Imagen]'; // Simplificado por ahora
                    // TODO: Implementar soporte para imágenes
                  } else {
                    content = `[${message.type.toUpperCase()}]`;
                  }

                  // Guardar en la base de datos
                  const result = await databaseService.processIncomingMessage({
                    waMessageId: message.id,
                    fromWaId: message.from,
                    toWaId: value.metadata.phone_number_id,
                    content,
                    messageType,
                    timestamp: new Date(parseInt(message.timestamp) * 1000),
                    contactName: contact?.profile?.name
                  });
                
                const processedMessage = {
                    id: result.message.id,
                    waMessageId: message.id,
                  from: message.from,
                  to: value.metadata.phone_number_id,
                    message: content,
                    timestamp: result.message.timestamp,
                  type: message.type,
                  contact: contact ? {
                    name: contact.profile.name,
                    wa_id: contact.wa_id
                  } : undefined,
                    read: false,
                    conversationId: result.conversation.id,
                    contactId: result.contact.id
                  };

                  processedMessages.push(processedMessage);
                  console.log('📩 Mensaje guardado en BD:', processedMessage);

                  // Emitir evento de Socket.IO para nuevo mensaje
                  if (this.io) {
                    this.io.to(`conversation_${result.conversation.id}`).emit('new_message', {
                      message: processedMessage,
                      conversation: {
                        id: result.conversation.id,
                        contactId: result.contact.id,
                        contactName: result.contact.name || result.contact.waId,
                        unreadCount: result.conversation.unreadCount
                      }
                    });
                    
                    // También emitir a todos los clientes para actualizar lista de conversaciones
                    this.io.emit('conversation_updated', {
                      conversationId: result.conversation.id,
                      lastMessage: processedMessage,
                      unreadCount: result.conversation.unreadCount
                    });
                    
                    console.log('🌐 Evento Socket.IO emitido para nuevo mensaje');
                  }

                  // Respuesta automática (solo para mensajes de texto)
                if (message.type === 'text' && message.text?.body) {
                  this.sendAutoReply(message.from, contact?.profile?.name || 'Cliente');
                  }
                } catch (dbError) {
                  console.error('❌ Error guardando mensaje en BD:', dbError);
                  // Continuar procesando otros mensajes
                }
              }
            }
          }
        }
      }

      return {
        success: true,
        messages: processedMessages,
        processed: processedMessages.length
      };
    } catch (error: any) {
      console.error('❌ Error procesando webhook:', error);
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  }

  /**
   * Enviar respuesta automática
   */
  private async sendAutoReply(to: string, clientName: string) {
    try {
      const autoReplyMessage = `¡Hola! 👋\n\nGracias por contactarnos. Hemos recibido tu mensaje y un agente se pondrá en contacto contigo pronto.\n\n*Embler - Siempre conectados* 🚀`;
      
      console.log('🤖 Enviando respuesta automática a:', to);
      
      // Esperar 2 segundos antes de responder (más natural)
      setTimeout(async () => {
        await this.sendMessage({
          to: to,
          message: autoReplyMessage
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error enviando respuesta automática:', error);
    }
  }

  /**
   * Obtener conversaciones con mensajes
   */
  async getConversations(limit: number = 50, offset: number = 0) {
    try {
      const conversations = await databaseService.getConversations(limit, offset);
      const stats = await databaseService.getStats();

      return {
        success: true,
        conversations: conversations.map((conv: any) => ({
          id: conv.id,
          contactId: conv.contactId,
          contactName: conv.contact.name || conv.contact.waId,
          contactWaId: conv.contact.waId,
          lastMessage: conv.lastMessage ? {
            id: conv.lastMessage.id,
            content: conv.lastMessage.content,
            timestamp: conv.lastMessage.timestamp,
            isFromUs: conv.lastMessage.isFromUs
          } : null,
          unreadCount: conv.unreadCount,
          totalMessages: conv._count.messages,
          updatedAt: conv.updatedAt
        })),
        total: stats.totalConversations,
        unread: stats.unreadMessages
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo conversaciones:', error);
      return {
        success: false,
        error: error.message,
        conversations: [],
        total: 0,
        unread: 0
      };
    }
  }

  /**
   * Obtener mensajes de una conversación específica
   */
  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0) {
    try {
      const messages = await databaseService.getConversationMessages(conversationId, limit, offset);

    return {
        success: true,
        messages: messages.map(msg => ({
          id: msg.id,
          waMessageId: msg.waMessageId,
          content: msg.content,
          messageType: msg.messageType,
          timestamp: msg.timestamp,
          isFromUs: msg.isFromUs,
          isRead: msg.isRead,
          isDelivered: msg.isDelivered,
          senderId: msg.senderId,
          receiverId: msg.receiverId
        })).reverse() // Mostrar más antiguos primero
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo mensajes de conversación:', error);
      return {
        success: false,
        error: error.message,
        messages: []
      };
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markMessageAsRead(messageId: string) {
    try {
      const success = await databaseService.markMessageAsRead(messageId);
      if (success) {
        console.log(`📖 Mensaje ${messageId} marcado como leído`);
      }
      return success;
    } catch (error: any) {
      console.error('❌ Error marcando mensaje como leído:', error);
      return false;
    }
  }

  /**
   * Marcar conversación como leída
   */
  async markConversationAsRead(conversationId: string) {
    try {
      const success = await databaseService.markConversationAsRead(conversationId);
      if (success) {
        console.log(`📖 Conversación ${conversationId} marcada como leída`);
      }
      return success;
    } catch (error: any) {
      console.error('❌ Error marcando conversación como leída:', error);
    return false;
    }
  }

  /**
   * Limpiar mensajes antiguos
   */
  async clearOldMessages(olderThanHours: number = 24): Promise<number> {
    try {
      const removedCount = await databaseService.cleanupOldMessages(olderThanHours);
      console.log(`🗑️ ${removedCount} mensajes antiguos eliminados (${olderThanHours}h)`);
      return removedCount;
    } catch (error: any) {
      console.error('❌ Error limpiando mensajes antiguos:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    try {
      const stats = await databaseService.getStats();
      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
         }
  }

  /**
   * Limpiar TODOS los mensajes (deprecado - usar clearOldMessages)
   */
  async clearAllMessages() {
    console.log('⚠️ clearAllMessages deprecado - redirigiendo a limpiar mensajes de 1 hora');
    return await this.clearOldMessages(1); // Limpiar mensajes de última hora
  }

  /**
   * Verificar webhook (para Facebook)
   */
  verifyWebhook(mode: string, token: string, challenge: string) {
    console.log('🔐 Verificando webhook:', { mode, token, challenge });

    if (mode === 'subscribe' && token === whatsappConfig.webhook.verifyToken) {
      console.log('✅ Webhook verificado exitosamente');
      return challenge;
    } else {
      console.error('❌ Token de verificación incorrecto');
      return null;
    }
  }

  /**
   * Configurar webhook URL (programáticamente)
   */
  async setWebhookUrl(callbackUrl: string) {
    try {
      const url = buildApiUrl(`${whatsappConfig.phoneNumberId}/subscribed_apps`);
      
      const payload = {
        subscribed_fields: ['messages']
      };

      console.log('🔗 Configurando webhook:', { url, callbackUrl });

      const response = await axios.post(url, payload, {
        headers: getHeaders()
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('❌ Error configurando webhook:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Validar formato de número de teléfono
   */
  validatePhoneNumber(phoneNumber: string): { isValid: boolean; formatted: string; error?: string } {
    // Limpiar el número (solo dígitos)
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // Verificar longitud mínima
    if (cleaned.length < 10) {
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Número muy corto (mínimo 10 dígitos)'
      };
    }

    // Verificar longitud máxima
    if (cleaned.length > 15) {
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Número muy largo (máximo 15 dígitos)'
      };
    }

    // Para números mexicanos, asegurar que empiece con 52
    let formatted = cleaned;
    if (cleaned.length === 10 && !cleaned.startsWith('52')) {
      formatted = '52' + cleaned;
    }

    return {
      isValid: true,
      formatted
    };
  }

  /**
   * Procesar mensaje multimedia saliente
   */
  async processOutgoingMediaMessage(data: {
    to: string;
    mediaId: string;
    mediaType: MessageType;
    caption?: string;
    filename?: string;
    whatsappMessageId: string;
  }) {
    try {
      console.log('📤 Procesando mensaje multimedia saliente:', {
        to: data.to,
        mediaType: data.mediaType,
        mediaId: data.mediaId,
        whatsappMessageId: data.whatsappMessageId
      });

      const result = await databaseService.processOutgoingMessage({
        waMessageId: data.whatsappMessageId,
        toWaId: data.to,
        content: data.caption || `[${data.mediaType}] ${data.filename || 'archivo multimedia'}`,
        messageType: data.mediaType,
        mediaUrl: data.mediaId, // Almacenar media ID como URL temporalmente
        mediaCaption: data.caption,
        timestamp: new Date()
      });

      // Emitir evento de Socket.IO para mensaje multimedia enviado
      if (this.io && result) {
        const sentMessage = {
          id: result.message.id,
          waMessageId: data.whatsappMessageId,
          from: 'us',
          to: data.to,
          message: data.caption || `[${data.mediaType}] ${data.filename || 'archivo multimedia'}`,
          timestamp: result.message.timestamp,
          type: data.mediaType.toLowerCase(),
          read: false,
          conversationId: result.conversation.id,
          contactId: result.contact.id,
          mediaId: data.mediaId,
          mediaType: data.mediaType,
          filename: data.filename
        };

        this.io.to(`conversation_${result.conversation.id}`).emit('new_message', {
          message: sentMessage,
          conversation: {
            id: result.conversation.id,
            contactId: result.contact.id,
            contactName: result.contact.name || result.contact.waId,
            unreadCount: result.conversation.unreadCount
          }
        });

        // También emitir para actualizar lista de conversaciones
        this.io.emit('conversation_updated', {
          conversationId: result.conversation.id,
          lastMessage: sentMessage,
          unreadCount: result.conversation.unreadCount
        });

        console.log('🌐 Evento Socket.IO emitido para mensaje multimedia enviado');
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error procesando mensaje multimedia saliente:', error);
      throw error;
    }
  }

  /**
   * Procesar mensaje multimedia entrante
   */
  async processIncomingMediaMessage(data: {
    waMessageId: string;
    fromWaId: string;
    mediaId: string;
    mediaType: MessageType;
    caption?: string;
    filename?: string;
    timestamp?: Date;
    contactName?: string;
  }) {
    try {
      console.log('📥 Procesando mensaje multimedia entrante:', {
        from: data.fromWaId,
        mediaType: data.mediaType,
        mediaId: data.mediaId,
        waMessageId: data.waMessageId
      });

      const result = await databaseService.processIncomingMessage({
        waMessageId: data.waMessageId,
        fromWaId: data.fromWaId,
        toWaId: whatsappConfig.phoneNumberId,
        content: data.caption || `[${data.mediaType}] ${data.filename || 'archivo multimedia'}`,
        messageType: data.mediaType,
        mediaUrl: data.mediaId, // Almacenar media ID
        mediaCaption: data.caption,
        timestamp: data.timestamp || new Date(),
        contactName: data.contactName
      });

      // Emitir evento de Socket.IO para mensaje multimedia recibido
      if (this.io && result) {
        const receivedMessage = {
          id: result.message.id,
          waMessageId: data.waMessageId,
          from: data.fromWaId,
          to: 'us',
          message: data.caption || `[${data.mediaType}] ${data.filename || 'archivo multimedia'}`,
          timestamp: result.message.timestamp,
          type: data.mediaType.toLowerCase(),
          read: false,
          conversationId: result.conversation.id,
          contactId: result.contact.id,
          mediaId: data.mediaId,
          mediaType: data.mediaType,
          filename: data.filename
        };

        this.io.to(`conversation_${result.conversation.id}`).emit('new_message', {
          message: receivedMessage,
          conversation: {
            id: result.conversation.id,
            contactId: result.contact.id,
            contactName: result.contact.name || result.contact.waId,
            unreadCount: result.conversation.unreadCount
          }
        });

        // También emitir para actualizar lista de conversaciones
        this.io.emit('conversation_updated', {
          conversationId: result.conversation.id,
          lastMessage: receivedMessage,
          unreadCount: result.conversation.unreadCount
        });

        console.log('🌐 Evento Socket.IO emitido para mensaje multimedia recibido');
      }

      return result;
    } catch (error: any) {
      console.error('❌ Error procesando mensaje multimedia entrante:', error);
      throw error;
    }
  }
}

// Instancia singleton
export const whatsappService = new WhatsAppService(); 