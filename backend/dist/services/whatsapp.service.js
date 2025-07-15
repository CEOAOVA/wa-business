"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const whatsapp_1 = require("../config/whatsapp");
const database_service_1 = require("./database.service");
const prisma_1 = require("../generated/prisma");
class WhatsAppService {
    // Inicializar servicio de base de datos
    initialize(socketIo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.io = socketIo;
                yield database_service_1.databaseService.connect();
                console.log('✅ WhatsApp Service inicializado con base de datos');
                if (socketIo) {
                    console.log('🌐 Socket.IO integrado con WhatsApp Service');
                }
            }
            catch (error) {
                console.error('❌ Error inicializando WhatsApp Service:', error);
                throw error;
            }
        });
    }
    /**
     * Enviar mensaje de texto
     */
    sendMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const url = (0, whatsapp_1.buildApiUrl)(`${whatsapp_1.whatsappConfig.phoneNumberId}/messages`);
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
                const response = yield axios_1.default.post(url, payload, {
                    headers: (0, whatsapp_1.getHeaders)()
                });
                console.log('✅ Mensaje enviado exitosamente:', response.data);
                // Guardar mensaje enviado en la base de datos
                const messageId = (_b = (_a = response.data.messages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id;
                if (messageId) {
                    try {
                        const result = yield database_service_1.databaseService.processOutgoingMessage({
                            waMessageId: messageId,
                            toWaId: data.to,
                            content: data.message,
                            messageType: prisma_1.MessageType.TEXT,
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
                    }
                    catch (dbError) {
                        console.error('⚠️ Error guardando mensaje enviado en BD:', dbError);
                        // No fallar el envío por error de BD
                    }
                }
                return {
                    success: true,
                    messageId,
                    data: response.data
                };
            }
            catch (error) {
                console.error('❌ Error enviando mensaje:', ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
                return {
                    success: false,
                    error: ((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || error.message,
                    details: (_f = error.response) === null || _f === void 0 ? void 0 : _f.data
                };
            }
        });
    }
    /**
     * Enviar mensaje con template
     */
    sendTemplate(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const url = (0, whatsapp_1.buildApiUrl)(`${whatsapp_1.whatsappConfig.phoneNumberId}/messages`);
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
                const response = yield axios_1.default.post(url, payload, {
                    headers: (0, whatsapp_1.getHeaders)()
                });
                console.log('✅ Template enviado exitosamente:', response.data);
                return {
                    success: true,
                    messageId: (_b = (_a = response.data.messages) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id,
                    data: response.data
                };
            }
            catch (error) {
                console.error('❌ Error enviando template:', ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message);
                return {
                    success: false,
                    error: ((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) || error.message,
                    details: (_f = error.response) === null || _f === void 0 ? void 0 : _f.data
                };
            }
        });
    }
    /**
     * Obtener información del número de teléfono
     */
    getPhoneNumberInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const url = (0, whatsapp_1.buildApiUrl)(whatsapp_1.whatsappConfig.phoneNumberId);
                console.log('📞 Obteniendo info del número:', url);
                const response = yield axios_1.default.get(url, {
                    headers: (0, whatsapp_1.getHeaders)()
                });
                return {
                    success: true,
                    data: response.data
                };
            }
            catch (error) {
                console.error('❌ Error obteniendo info del número:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return {
                    success: false,
                    error: ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error.message
                };
            }
        });
    }
    /**
     * Verificar estado de configuración
     */
    getStatus() {
        var _a;
        const isConfigured = !!(whatsapp_1.whatsappConfig.accessToken &&
            whatsapp_1.whatsappConfig.phoneNumberId &&
            whatsapp_1.whatsappConfig.accessToken.length > 50);
        return {
            success: true,
            status: {
                configured: isConfigured,
                phoneId: whatsapp_1.whatsappConfig.phoneNumberId,
                tokenPresent: !!whatsapp_1.whatsappConfig.accessToken,
                tokenLength: ((_a = whatsapp_1.whatsappConfig.accessToken) === null || _a === void 0 ? void 0 : _a.length) || 0,
                apiVersion: whatsapp_1.whatsappConfig.apiVersion
            }
        };
    }
    /**
     * Procesar webhook de WhatsApp
     */
    processWebhook(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            console.log('📨 Procesando webhook de WhatsApp:', JSON.stringify(body, null, 2));
            const processedMessages = [];
            try {
                if (body.object === 'whatsapp_business_account') {
                    for (const entry of body.entry || []) {
                        for (const change of entry.changes || []) {
                            if (change.field === 'messages') {
                                const value = change.value;
                                // Procesar mensajes entrantes
                                for (const message of value.messages || []) {
                                    const contact = (_a = value.contacts) === null || _a === void 0 ? void 0 : _a.find(c => c.wa_id === message.from);
                                    try {
                                        // Determinar tipo de mensaje
                                        let messageType = prisma_1.MessageType.TEXT;
                                        let content = '';
                                        if (message.type === 'text' && ((_b = message.text) === null || _b === void 0 ? void 0 : _b.body)) {
                                            content = message.text.body;
                                        }
                                        else if (message.type === 'image') {
                                            content = '[Imagen]'; // Simplificado por ahora
                                            // TODO: Implementar soporte para imágenes
                                        }
                                        else {
                                            content = `[${message.type.toUpperCase()}]`;
                                        }
                                        // Guardar en la base de datos
                                        const result = yield database_service_1.databaseService.processIncomingMessage({
                                            waMessageId: message.id,
                                            fromWaId: message.from,
                                            toWaId: value.metadata.phone_number_id,
                                            content,
                                            messageType,
                                            timestamp: new Date(parseInt(message.timestamp) * 1000),
                                            contactName: (_c = contact === null || contact === void 0 ? void 0 : contact.profile) === null || _c === void 0 ? void 0 : _c.name
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
                                        if (message.type === 'text' && ((_d = message.text) === null || _d === void 0 ? void 0 : _d.body)) {
                                            this.sendAutoReply(message.from, ((_e = contact === null || contact === void 0 ? void 0 : contact.profile) === null || _e === void 0 ? void 0 : _e.name) || 'Cliente');
                                        }
                                    }
                                    catch (dbError) {
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
            }
            catch (error) {
                console.error('❌ Error procesando webhook:', error);
                return {
                    success: false,
                    error: error.message,
                    messages: []
                };
            }
        });
    }
    /**
     * Enviar respuesta automática
     */
    sendAutoReply(to, clientName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const autoReplyMessage = `¡Hola! 👋\n\nGracias por contactarnos. Hemos recibido tu mensaje y un agente se pondrá en contacto contigo pronto.\n\n*Embler - Siempre conectados* 🚀`;
                console.log('🤖 Enviando respuesta automática a:', to);
                // Esperar 2 segundos antes de responder (más natural)
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.sendMessage({
                        to: to,
                        message: autoReplyMessage
                    });
                }), 2000);
            }
            catch (error) {
                console.error('❌ Error enviando respuesta automática:', error);
            }
        });
    }
    /**
     * Obtener conversaciones con mensajes
     */
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            try {
                const conversations = yield database_service_1.databaseService.getConversations(limit, offset);
                const stats = yield database_service_1.databaseService.getStats();
                return {
                    success: true,
                    conversations: conversations.map((conv) => ({
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
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones:', error);
                return {
                    success: false,
                    error: error.message,
                    conversations: [],
                    total: 0,
                    unread: 0
                };
            }
        });
    }
    /**
     * Obtener mensajes de una conversación específica
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            try {
                const messages = yield database_service_1.databaseService.getConversationMessages(conversationId, limit, offset);
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
            }
            catch (error) {
                console.error('❌ Error obteniendo mensajes de conversación:', error);
                return {
                    success: false,
                    error: error.message,
                    messages: []
                };
            }
        });
    }
    /**
     * Marcar mensaje como leído
     */
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield database_service_1.databaseService.markMessageAsRead(messageId);
                if (success) {
                    console.log(`📖 Mensaje ${messageId} marcado como leído`);
                }
                return success;
            }
            catch (error) {
                console.error('❌ Error marcando mensaje como leído:', error);
                return false;
            }
        });
    }
    /**
     * Marcar conversación como leída
     */
    markConversationAsRead(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield database_service_1.databaseService.markConversationAsRead(conversationId);
                if (success) {
                    console.log(`📖 Conversación ${conversationId} marcada como leída`);
                }
                return success;
            }
            catch (error) {
                console.error('❌ Error marcando conversación como leída:', error);
                return false;
            }
        });
    }
    /**
     * Limpiar mensajes antiguos
     */
    clearOldMessages() {
        return __awaiter(this, arguments, void 0, function* (olderThanHours = 24) {
            try {
                const removedCount = yield database_service_1.databaseService.cleanupOldMessages(olderThanHours);
                console.log(`🗑️ ${removedCount} mensajes antiguos eliminados (${olderThanHours}h)`);
                return removedCount;
            }
            catch (error) {
                console.error('❌ Error limpiando mensajes antiguos:', error);
                return 0;
            }
        });
    }
    /**
     * Obtener estadísticas
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield database_service_1.databaseService.getStats();
                return {
                    success: true,
                    data: stats
                };
            }
            catch (error) {
                console.error('❌ Error obteniendo estadísticas:', error);
                return {
                    success: false,
                    error: error.message,
                    data: null
                };
            }
        });
    }
    /**
     * Limpiar TODOS los mensajes (deprecado - usar clearOldMessages)
     */
    clearAllMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('⚠️ clearAllMessages deprecado - redirigiendo a limpiar mensajes de 1 hora');
            return yield this.clearOldMessages(1); // Limpiar mensajes de última hora
        });
    }
    /**
     * Verificar webhook (para Facebook)
     */
    verifyWebhook(mode, token, challenge) {
        console.log('🔐 Verificando webhook:', { mode, token, challenge });
        if (mode === 'subscribe' && token === whatsapp_1.whatsappConfig.webhook.verifyToken) {
            console.log('✅ Webhook verificado exitosamente');
            return challenge;
        }
        else {
            console.error('❌ Token de verificación incorrecto');
            return null;
        }
    }
    /**
     * Configurar webhook URL (programáticamente)
     */
    setWebhookUrl(callbackUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const url = (0, whatsapp_1.buildApiUrl)(`${whatsapp_1.whatsappConfig.phoneNumberId}/subscribed_apps`);
                const payload = {
                    subscribed_fields: ['messages']
                };
                console.log('🔗 Configurando webhook:', { url, callbackUrl });
                const response = yield axios_1.default.post(url, payload, {
                    headers: (0, whatsapp_1.getHeaders)()
                });
                return {
                    success: true,
                    data: response.data
                };
            }
            catch (error) {
                console.error('❌ Error configurando webhook:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return {
                    success: false,
                    error: ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) || error.message
                };
            }
        });
    }
    /**
     * Validar formato de número de teléfono
     */
    validatePhoneNumber(phoneNumber) {
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
    processOutgoingMediaMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📤 Procesando mensaje multimedia saliente:', {
                    to: data.to,
                    mediaType: data.mediaType,
                    mediaId: data.mediaId,
                    whatsappMessageId: data.whatsappMessageId
                });
                const result = yield database_service_1.databaseService.processOutgoingMessage({
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
            }
            catch (error) {
                console.error('❌ Error procesando mensaje multimedia saliente:', error);
                throw error;
            }
        });
    }
    /**
     * Procesar mensaje multimedia entrante
     */
    processIncomingMediaMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📥 Procesando mensaje multimedia entrante:', {
                    from: data.fromWaId,
                    mediaType: data.mediaType,
                    mediaId: data.mediaId,
                    waMessageId: data.waMessageId
                });
                const result = yield database_service_1.databaseService.processIncomingMessage({
                    waMessageId: data.waMessageId,
                    fromWaId: data.fromWaId,
                    toWaId: whatsapp_1.whatsappConfig.phoneNumberId,
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
            }
            catch (error) {
                console.error('❌ Error procesando mensaje multimedia entrante:', error);
                throw error;
            }
        });
    }
}
exports.WhatsAppService = WhatsAppService;
// Instancia singleton
exports.whatsappService = new WhatsAppService();
