import axios from 'axios';
import { Server } from 'socket.io';
import { whatsappConfig, buildApiUrl, getHeaders } from '../config/whatsapp';
import { databaseService } from './database.service';
import { MessageType } from '../types/database';
import { chatbotService } from './chatbot.service'; // NUEVO: Import del chatbot

export interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text';
  isChatbotResponse?: boolean; // NUEVO: Para evitar duplicados del chatbot
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
  private lastMessages: Map<string, string> = new Map(); // Almacenar últimos mensajes temporalmente

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
   * Emitir evento WebSocket (método público para uso externo)
   */
  emitSocketEvent(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`🌐 [Socket] Evento '${event}' emitido:`, data);
    } else {
      console.log(`⚠️ [Socket] No hay conexión WebSocket para emitir evento '${event}'`);
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(data: SendMessageRequest) {
    try {
      // Validar configuración de WhatsApp
      if (!whatsappConfig.isConfigured) {
        console.warn('⚠️ WhatsApp no está configurado - simulando envío');
        return {
          success: false,
          error: 'WhatsApp no está configurado',
          details: 'Configura WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID y WEBHOOK_VERIFY_TOKEN'
        };
      }

      // Validar token de acceso
      if (!whatsappConfig.accessToken || whatsappConfig.accessToken === 'not_configured') {
        console.error('❌ Token de acceso de WhatsApp no configurado');
        return {
          success: false,
          error: 'Token de acceso no configurado',
          details: 'Configura WHATSAPP_ACCESS_TOKEN en las variables de entorno'
        };
      }

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
        url,
        tokenConfigured: !!whatsappConfig.accessToken,
        tokenLength: whatsappConfig.accessToken?.length || 0
      });

      const response = await axios.post(url, payload, {
        headers: getHeaders()
      });

      console.log('✅ Mensaje enviado exitosamente:', response.data);

      // Guardar mensaje enviado en la base de datos (SOLO si NO es respuesta del chatbot)
      const messageId = response.data.messages?.[0]?.id;
      if (messageId && !data.isChatbotResponse) {
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
      } else if (data.isChatbotResponse) {
        console.log('🤖 Mensaje del chatbot enviado - NO guardando en BD (lo hará el chatbot después)');
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
    try {
      console.log('📨 Procesando webhook de WhatsApp...');

      if (!body.entry || body.entry.length === 0) {
        console.log('⚠️ Webhook sin entradas');
        return;
      }

      for (const entry of body.entry) {
        if (!entry.changes || entry.changes.length === 0) continue;

        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;

          const value = change.value;
          if (!value.messages || value.messages.length === 0) continue;

          for (const message of value.messages) {
            await this.processIncomingMessage(message, value.contacts);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando webhook:', error);
    }
  }

  /**
   * Procesar mensaje entrante individual
   */
  private async processIncomingMessage(message: any, contacts?: any[]) {
    try {
      const from = message.from;
      const messageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);
      const messageType = message.type;
      
      console.log(`📨 Mensaje entrante de ${from}: ${messageType}`);

      // Obtener información del contacto
      const contact = contacts?.find(c => c.wa_id === from);
      const contactName = contact?.profile?.name || 'Cliente';

      // Procesar según el tipo de mensaje
      if (messageType === 'text' && message.text) {
        await this.processTextMessage(from, messageId, message.text.body, timestamp, contactName);
      } else if (messageType === 'image' && message.image) {
        await this.processMediaMessage(from, messageId, 'image', message.image, timestamp, contactName);
      } else if (messageType === 'video' && message.video) {
        await this.processMediaMessage(from, messageId, 'video', message.video, timestamp, contactName);
      } else if (messageType === 'audio' && message.audio) {
        await this.processMediaMessage(from, messageId, 'audio', message.audio, timestamp, contactName);
      } else if (messageType === 'document' && message.document) {
        await this.processMediaMessage(from, messageId, 'document', message.document, timestamp, contactName);
      } else {
        console.log(`⚠️ Tipo de mensaje no soportado: ${messageType}`);
      }

    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error);
    }
  }

  /**
   * Procesar mensaje de texto
   */
  private async processTextMessage(from: string, messageId: string, content: string, timestamp: Date, contactName: string) {
    try {
      console.log(`📝 Procesando texto de ${from}: ${content.substring(0, 50)}...`);

      // Obtener o crear conversación
      const conversation = await databaseService.getOrCreateConversationByPhone(from);
      if (!conversation) {
        console.error('❌ No se pudo obtener/crear conversación para', from);
        return;
      }

      // NUEVO: Verificar si el chatbot puede procesar este mensaje
      const canChatbotProcess = await databaseService.canChatbotProcessMessage(conversation.id);
      
      if (canChatbotProcess) {
        console.log(`🤖 Chatbot procesará mensaje de ${from} (modo: ${conversation.takeover_mode || 'spectator'})`);
        
        // Procesar con chatbot
        const chatbotResponse = await chatbotService.processWhatsAppMessage(from, content);
        
        if (chatbotResponse.shouldSend && chatbotResponse.response) {
          // Enviar respuesta del chatbot
          await this.sendMessage({
            to: from,
            message: chatbotResponse.response,
            isChatbotResponse: true
          });
        }
      } else {
        console.log(`👤 Agente debe procesar mensaje de ${from} (modo: ${conversation.takeover_mode})`);
        
        // Solo guardar el mensaje en la base de datos, sin procesar con chatbot
        await databaseService.createChatbotMessage({
          conversationId: conversation.id,
          contactPhone: from,
          senderType: 'user',
          content: content,
          messageType: 'text',
          whatsappMessageId: messageId,
          metadata: {
            contactName: contactName,
            timestamp: timestamp.toISOString()
          }
        });

        // Notificar a agentes conectados
        this.emitSocketEvent('new_message', {
          conversationId: conversation.id,
          from: from,
          content: content,
          timestamp: timestamp,
          contactName: contactName,
          requiresAgentAction: true
        });
      }

      // Actualizar conversación
      await databaseService.markConversationAsRead(conversation.id);

    } catch (error) {
      console.error('❌ Error procesando mensaje de texto:', error);
    }
  }

  /**
   * Procesar mensaje multimedia
   */
  private async processMediaMessage(from: string, messageId: string, mediaType: string, mediaData: any, timestamp: Date, contactName: string) {
    try {
      console.log(`📷 Procesando ${mediaType} de ${from}`);

      // Obtener o crear conversación
      const conversation = await databaseService.getOrCreateConversationByPhone(from);
      if (!conversation) {
        console.error('❌ No se pudo obtener/crear conversación para', from);
        return;
      }

      // Crear contenido descriptivo para el tipo de medio
      let content = '';
      let caption = '';
      
      switch (mediaType) {
        case 'image':
          content = '[Imagen]';
          caption = mediaData.caption || '';
          break;
        case 'video':
          content = '[Video]';
          caption = mediaData.caption || '';
          break;
        case 'audio':
          content = '[Audio]';
          break;
        case 'document':
          content = `[Documento: ${mediaData.filename || 'archivo'}]`;
          caption = mediaData.caption || '';
          break;
        default:
          content = `[${mediaType.toUpperCase()}]`;
      }

      // Guardar mensaje multimedia en la base de datos
      await databaseService.createChatbotMessage({
        conversationId: conversation.id,
        contactPhone: from,
        senderType: 'user',
        content: content,
        messageType: mediaType as any,
        whatsappMessageId: messageId,
        metadata: {
          contactName: contactName,
          timestamp: timestamp.toISOString(),
          mediaId: mediaData.id,
          caption: caption,
          filename: mediaData.filename,
          mimeType: mediaData.mime_type
        }
      });

      // Notificar a agentes conectados
      this.emitSocketEvent('new_message', {
        conversationId: conversation.id,
        from: from,
        content: content,
        timestamp: timestamp,
        contactName: contactName,
        mediaType: mediaType,
        mediaData: mediaData,
        requiresAgentAction: true
      });

      // Actualizar conversación
      await databaseService.markConversationAsRead(conversation.id);

    } catch (error) {
      console.error('❌ Error procesando mensaje multimedia:', error);
    }
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