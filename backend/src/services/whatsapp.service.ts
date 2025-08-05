import axios from 'axios';
import { Server } from 'socket.io';
import { whatsappConfig, buildApiUrl, getHeaders } from '../config/whatsapp';
import { databaseService } from './database.service';
import { MessageType } from '../types/database';
import { chatbotService } from './chatbot.service'; // NUEVO: Import del chatbot
import { logger, logHelper } from '../config/logger';

export interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text';
  isChatbotResponse?: boolean; // NUEVO: Para evitar duplicados del chatbot
  clientId?: string; // NUEVO: Identificador único del frontend para evitar duplicados
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

  /**
   * Validación robusta de mensajes antes de enviar
   * Basado en mejores prácticas de sistemas de chat en tiempo real
   */
  private validateMessage(data: SendMessageRequest): { isValid: boolean; error?: string } {
    console.log('🔍 [VALIDATION] Iniciando validación de mensaje:', {
      to: data.to,
      messageLength: data.message?.length,
      clientId: data.clientId,
      isChatbotResponse: data.isChatbotResponse
    });

    // 1. Validar campos requeridos
    if (!data.to || !data.message) {
      console.error('❌ [VALIDATION] Campos requeridos faltantes:', { to: !!data.to, message: !!data.message });
      return { isValid: false, error: 'Los campos "to" y "message" son requeridos' };
    }

    // 2. Validar formato de teléfono
    const phoneValidation = this.validatePhoneNumber(data.to);
    if (!phoneValidation.isValid) {
      console.error('❌ [VALIDATION] Formato de teléfono inválido:', phoneValidation.error);
      return { isValid: false, error: phoneValidation.error };
    }

    // 3. Validar longitud de mensaje (límite de WhatsApp: 4096 caracteres)
    if (data.message.length > 4096) {
      console.error('❌ [VALIDATION] Mensaje demasiado largo:', data.message.length);
      return { isValid: false, error: 'El mensaje no puede exceder 4096 caracteres' };
    }

    // 4. Validar clientId único (requerido para deduplicación)
    if (!data.clientId) {
      console.error('❌ [VALIDATION] ClientId requerido para deduplicación');
      return { isValid: false, error: 'ClientId requerido para evitar duplicados' };
    }

    // 5. Validar que no sea un mensaje vacío o solo espacios
    if (data.message.trim().length === 0) {
      console.error('❌ [VALIDATION] Mensaje vacío o solo espacios');
      return { isValid: false, error: 'El mensaje no puede estar vacío' };
    }

    // 6. Validar configuración de WhatsApp
    if (!whatsappConfig.isConfigured) {
      console.error('❌ [VALIDATION] WhatsApp no está configurado');
      return { isValid: false, error: 'WhatsApp no está configurado' };
    }

    if (!whatsappConfig.accessToken || whatsappConfig.accessToken === 'not_configured') {
      console.error('❌ [VALIDATION] Token de acceso no configurado');
      return { isValid: false, error: 'Token de acceso de WhatsApp no configurado' };
    }

    console.log('✅ [VALIDATION] Mensaje validado correctamente');
    return { isValid: true };
  }

  /**
   * Validar formato de número de teléfono
   */
  private validatePhoneNumber(phone: string): { isValid: boolean; error?: string; formatted?: string } {
    // Remover espacios y caracteres especiales
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Validar que sea un número
    if (!/^\d+$/.test(cleaned)) {
      return { isValid: false, error: 'El número debe contener solo dígitos' };
    }

    // Validar longitud (WhatsApp requiere número completo con código de país)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return { isValid: false, error: 'El número debe tener entre 10 y 15 dígitos' };
    }

    // Asegurar formato internacional
    const formatted = cleaned.startsWith('52') ? cleaned : `52${cleaned}`;
    
    return { isValid: true, formatted };
  }

  // Inicializar servicio de base de datos
  async initialize(socketIo?: Server) {
    try {
      this.io = socketIo;
      await databaseService.connect();
      logger.info('WhatsApp Service inicializado con base de datos');
      if (socketIo) {
        logger.info('Socket.IO integrado con WhatsApp Service');
      }
    } catch (error) {
      logger.error('Error inicializando WhatsApp Service', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Emitir evento WebSocket optimizado (método público para uso externo)
   */
  emitSocketEvent(event: string, data: any) {
    if (this.io) {
      // Emitir con optimizaciones para tiempo real
      this.io.emit(event, data, {
        compress: true, // Comprimir datos
        volatile: false, // Asegurar entrega
        timeout: 5000 // Timeout de 5 segundos
      });
      logger.debug('Evento WebSocket emitido', { event, data });
    } else {
      logger.warn('No hay conexión WebSocket para emitir evento', { event });
    }
  }

  /**
   * Emitir evento a una conversación específica
   */
  emitToConversation(conversationId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(conversationId).emit(event, data, {
        compress: true,
        volatile: false,
        timeout: 5000
      });
      console.log(`🌐 [Socket] Evento '${event}' emitido a conversación ${conversationId}:`, data);
    }
  }

  /**
   * Emitir evento de nuevo mensaje optimizado
   */
  emitNewMessage(message: any, conversation: any) {
    const eventData = {
      message,
      conversation,
      timestamp: new Date().toISOString()
    };

    // Emitir a todos los clientes conectados
    this.emitSocketEvent('new_message', eventData);
    
    // También emitir específicamente a la conversación
    if (conversation?.id) {
      this.emitToConversation(conversation.id, 'new_message', eventData);
    }
  }

  /**
   * Emitir evento de actualización de conversación optimizado
   */
  emitConversationUpdate(conversationId: string, lastMessage: any, unreadCount: number) {
    const eventData = {
      conversationId,
      lastMessage,
      unreadCount,
      timestamp: new Date().toISOString()
    };

    this.emitSocketEvent('conversation_updated', eventData);
    this.emitToConversation(conversationId, 'conversation_updated', eventData);
  }

  /**
   * Enviar mensaje a WhatsApp API
   * Separado del flujo principal para mejor control de errores
   */
  private async sendToWhatsApp(data: SendMessageRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📤 [WHATSAPP_API] Enviando a WhatsApp API:', {
        to: data.to,
        messageLength: data.message.length,
        clientId: data.clientId
      });

      const url = buildApiUrl(`${whatsappConfig.phoneNumberId}/messages`);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: data.to,
        type: 'text',
        text: { body: data.message },
        client_id: data.clientId
      };

      console.log('📤 [WHATSAPP_API] Payload preparado:', {
        to: data.to,
        message: data.message.substring(0, 50) + '...',
        url,
        tokenConfigured: !!whatsappConfig.accessToken,
        tokenLength: whatsappConfig.accessToken?.length || 0
      });

      // FASE 3: Timeout configurable y acknowledgment mejorado
      const response = await axios.post(url, payload, {
        headers: getHeaders(),
        timeout: 15000, // 15 segundos timeout (aumentado de 10s)
        validateStatus: (status) => status < 500, // Solo reintentar errores 5xx
        maxRedirects: 3
        // Nota: axios no tiene propiedad 'retry', manejaremos retry manualmente
      });

      const messageId = response.data.messages?.[0]?.id;
      
      if (!messageId) {
        throw new Error('No se recibió messageId de WhatsApp API');
      }

      console.log('✅ [WHATSAPP_API] Mensaje enviado exitosamente:', { 
        messageId,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'N/A'
      });
      
      return { success: true, messageId };

    } catch (error: any) {
      // FASE 3: Clasificación de errores para retry inteligente
      const errorDetails = {
        message: error.response?.data?.error?.message || error.message,
        status: error.response?.status,
        code: error.code,
        isRetryable: this.isRetryableError(error),
        data: error.response?.data
      };

      console.error('❌ [WHATSAPP_API] Error enviando a WhatsApp:', errorDetails);
      
      return { 
        success: false, 
        error: errorDetails.message
      };
    }
  }

  /**
   * FASE 3: Clasificar errores para determinar si son retryables
   */
  private isRetryableError(error: any): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'NETWORK_ERROR'];
    
    // Errores de red
    if (retryableCodes.includes(error.code)) {
      return true;
    }
    
    // Errores HTTP específicos
    if (error.response?.status && retryableStatuses.includes(error.response.status)) {
      return true;
    }
    
    // Errores de timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }
    
    return false;
  }

  /**
   * Enviar mensaje de texto a WhatsApp
   * NUEVO FLUJO: Validar → Persistir → Enviar → Acknowledgment → Broadcast
   */
  async sendMessage(data: SendMessageRequest) {
    try {
      console.log('📤 [WhatsAppService] Iniciando nuevo flujo de persistencia:', {
        to: data.to,
        messageLength: data.message.length,
        clientId: data.clientId,
        isChatbotResponse: data.isChatbotResponse
      });

      // 1. VALIDACIÓN COMPLETA
      console.log('🔍 [PERSISTENCE] Paso 1: Validación');
      const validation = this.validateMessage(data);
      if (!validation.isValid) {
        console.error('❌ [PERSISTENCE] Validación fallida:', validation.error);
        return { success: false, error: validation.error };
      }

      // Obtener teléfono formateado
      const phoneValidation = this.validatePhoneNumber(data.to);
      const formattedPhone = phoneValidation.formatted!;

      // 2. PERSISTIR EN BD PRIMERO
      console.log('💾 [PERSISTENCE] Paso 2: Persistir en BD');
      const dbResult = await databaseService.processOutgoingMessage({
        waMessageId: `temp_${Date.now()}`, // Temporal hasta confirmación WhatsApp
        toWaId: formattedPhone,
        content: data.message,
        messageType: MessageType.TEXT,
        timestamp: new Date(),
        clientId: data.clientId,
        status: 'pending' // Nuevo estado
      });

      if (!dbResult.success) {
        console.error('❌ [PERSISTENCE] Fallo al persistir mensaje');
        return { success: false, error: 'Error de persistencia en BD' };
      }

      console.log('✅ [PERSISTENCE] Mensaje persistido en BD:', {
        messageId: dbResult.message.id,
        conversationId: dbResult.conversation.id
      });

      // 3. ENVIAR A WHATSAPP
      console.log('📤 [PERSISTENCE] Paso 3: Enviar a WhatsApp');
      const whatsappResult = await this.sendToWhatsApp({
        ...data,
        to: formattedPhone
      });
      
      if (!whatsappResult.success) {
        // Marcar como fallido en BD
        console.error('❌ [PERSISTENCE] Fallo al enviar a WhatsApp:', whatsappResult.error);
        await databaseService.updateMessageStatus(dbResult.message.id, 'failed');
        return { success: false, error: whatsappResult.error };
      }

      // 4. ACTUALIZAR CON WHATSAPP MESSAGE ID
      console.log('🔄 [PERSISTENCE] Paso 4: Actualizar con WhatsApp Message ID');
      const updateResult = await databaseService.updateMessageWithWhatsAppId(
        dbResult.message.id, 
        whatsappResult.messageId!
      );

      if (!updateResult) {
        console.error('❌ [PERSISTENCE] Fallo al actualizar WhatsApp Message ID');
        // No fallar aquí, solo loggear
      }

      // 5. BROADCAST CON CONFIRMACIÓN
      console.log('📢 [PERSISTENCE] Paso 5: Broadcast con confirmación');
      if (this.io && !data.isChatbotResponse) {
        const sentMessage = {
          id: dbResult.message.id,
          waMessageId: whatsappResult.messageId,
          from: 'us',
          to: formattedPhone,
          message: data.message,
          timestamp: dbResult.message.timestamp,
          type: 'text',
          read: false,
          conversationId: dbResult.conversation.id,
          contactId: dbResult.contact.id,
          clientId: data.clientId,
          status: 'sent' // Nuevo campo de estado
        };

        this.emitNewMessage(sentMessage, {
          id: dbResult.conversation.id,
          contactId: dbResult.contact.id,
          contactName: dbResult.contact.name || dbResult.contact.waId,
          unreadCount: dbResult.conversation.unreadCount || 0
        });

        // Emitir actualización de conversación
        this.emitConversationUpdate(
          dbResult.conversation.id,
          {
            id: dbResult.message.id,
            content: data.message,
            timestamp: dbResult.message.timestamp,
            type: 'text'
          },
          dbResult.conversation.unreadCount || 0
        );
      }

      console.log('✅ [PERSISTENCE] Flujo completado exitosamente:', {
        messageId: dbResult.message.id,
        whatsappMessageId: whatsappResult.messageId,
        conversationId: dbResult.conversation.id
      });

      return { 
        success: true, 
        messageId: whatsappResult.messageId,
        waMessageId: whatsappResult.messageId,
        to: formattedPhone
      };

    } catch (error: any) {
      console.error('❌ [PERSISTENCE] Error en flujo de persistencia:', error);
      return {
        success: false,
        error: 'Error en flujo de persistencia',
        details: error.message
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

      // NUEVO: Generar client_id único para mensajes entrantes
      const clientId = `incoming_${messageId}_${Date.now()}`;
      
      // NUEVO: Verificar si ya existe un mensaje con este client_id
      const existingMessage = await databaseService.checkMessageByClientId(conversation.id, clientId);
      if (existingMessage) {
        console.log(`🔍 Mensaje con client_id ${clientId} ya existe, omitiendo procesamiento`);
        return;
      }

      // NUEVO: Verificar si el chatbot puede procesar este mensaje
      const canChatbotProcess = await databaseService.canChatbotProcessMessage(conversation.id);
      
      if (canChatbotProcess) {
        console.log(`🤖 Chatbot procesará mensaje de ${from} (modo: ${conversation.takeover_mode || 'spectator'})`);
        
        // GUARDAR MENSAJE DEL USUARIO EN LA BASE DE DATOS ANTES DE PROCESAR CON CHATBOT
        const userMessageResult = await databaseService.createChatbotMessage({
          conversationId: conversation.id,
          contactPhone: from,
          senderType: 'user',
          content: content,
          messageType: 'text',
          whatsappMessageId: messageId,
          clientId: clientId, // NUEVO: Incluir client_id
          metadata: {
            contactName: contactName,
            timestamp: timestamp.toISOString()
          }
        });

        // Emitir evento para mensaje del usuario si se guardó exitosamente
        if (userMessageResult.success) {
          this.emitNewMessage({
            id: userMessageResult.messageId || `msg_${Date.now()}`,
            waMessageId: messageId,
            from: from,
            to: 'us',
            message: content,
            timestamp: timestamp,
            type: 'text',
            read: false,
            conversationId: conversation.id,
            contactId: conversation.contact_phone,
            clientId: clientId,
          }, {
            id: conversation.id,
            contactId: conversation.contact_phone,
            contactName: contactName,
            unreadCount: conversation.unread_count || 0
          });
        }
        
        // Procesar con chatbot
        const chatbotResponse = await chatbotService.processWhatsAppMessage(from, content);
        
        if (chatbotResponse.shouldSend && chatbotResponse.response) {
          // Enviar respuesta del chatbot
          const sendResult = await this.sendMessage({
            to: from,
            message: chatbotResponse.response,
            isChatbotResponse: true
          });

          // GUARDAR MENSAJE DEL CHATBOT DESPUÉS DE ENVIARLO
          if (sendResult.success && sendResult.messageId) {
            await chatbotService.saveChatbotMessageToDatabase(from, {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: chatbotResponse.response,
              timestamp: new Date(),
              functionCalled: chatbotResponse.conversationState?.status,
              clientData: chatbotResponse.conversationState?.clientInfo
            }, sendResult.messageId);
          }
        }
      } else {
        console.log(`👤 Agente debe procesar mensaje de ${from} (modo: ${conversation.takeover_mode})`);
        
        // Solo guardar el mensaje en la base de datos, sin procesar con chatbot
        const messageResult = await databaseService.createChatbotMessage({
          conversationId: conversation.id,
          contactPhone: from,
          senderType: 'user',
          content: content,
          messageType: 'text',
          whatsappMessageId: messageId,
          clientId: clientId, // NUEVO: Incluir client_id
          metadata: {
            contactName: contactName,
            timestamp: timestamp.toISOString()
          }
        });

        // Solo emitir evento si el mensaje se guardó exitosamente
        if (messageResult.success) {
          console.log(`✅ Mensaje guardado exitosamente, emitiendo evento Socket.IO`);
          
          // Notificar a agentes conectados
          this.emitNewMessage({
            id: messageResult.messageId || `msg_${Date.now()}`, // Usar ID real del mensaje
            waMessageId: messageId,
            from: from,
            to: 'us', // NUEVO: Destinatario
            message: content, // NUEVO: Contenido del mensaje
            timestamp: timestamp, // NUEVO: Timestamp
            type: 'text', // NUEVO: Tipo de mensaje
            read: false, // NUEVO: Estado de lectura
            conversationId: conversation.id, // NUEVO: ID de conversación
            contactId: conversation.contact_phone, // NUEVO: ID del contacto
            clientId: clientId, // NUEVO: Incluir client_id en el evento
          }, {
            id: conversation.id,
            contactId: conversation.contact_phone,
            contactName: contactName,
            unreadCount: conversation.unread_count || 0
          });
        } else {
          console.error(`❌ No se pudo guardar mensaje, no se emitirá evento Socket.IO`);
        }
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
      this.emitNewMessage({
        id: `media_${Date.now()}`, // NUEVO: ID temporal para el mensaje multimedia
        waMessageId: messageId,
        from: from,
        to: 'us', // NUEVO: Destinatario
        message: content, // NUEVO: Contenido del mensaje
        timestamp: timestamp, // NUEVO: Timestamp
        type: mediaType, // NUEVO: Tipo de mensaje
        read: false, // NUEVO: Estado de lectura
        conversationId: conversation.id, // NUEVO: ID de conversación
        contactId: conversation.contact_phone, // NUEVO: ID del contacto
        // NUEVO: Metadata adicional para multimedia
        mediaId: mediaData.id,
        mediaType: mediaType,
        caption: caption,
        filename: mediaData.filename,
        mimeType: mediaData.mime_type
      }, {
        id: conversation.id,
        contactId: conversation.contact_phone,
        contactName: contactName,
        unreadCount: conversation.unread_count || 0
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

        this.emitNewMessage(sentMessage, {
          id: result.conversation.id,
          contactId: result.contact.id,
          contactName: result.contact.name || result.contact.waId,
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

        this.emitNewMessage(receivedMessage, {
          id: result.conversation.id,
          contactId: result.contact.id,
          contactName: result.contact.name || result.contact.waId,
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