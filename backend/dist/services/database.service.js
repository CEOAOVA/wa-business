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
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseService = exports.DatabaseService = void 0;
const supabase_database_service_1 = require("./supabase-database.service");
const product_catalog_service_1 = require("./product-catalog.service");
/**
 * Servicio principal de base de datos - NUEVO ESQUEMA
 * Usando las tablas: agents, contacts, conversations, messages
 */
class DatabaseService {
    constructor() {
        console.log('🗄️ DatabaseService inicializado (Nuevo esquema: agents, contacts, conversations, messages)');
        console.log('📦 ProductCatalogService integrado');
    }
    // ===== AGENTES =====
    /**
     * Obtener todos los agentes
     */
    getAgents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agents = yield supabase_database_service_1.supabaseDatabaseService.getAgents();
                console.log(`✅ Agentes obtenidos: ${agents.length}`);
                return agents;
            }
            catch (error) {
                console.error('❌ Error obteniendo agentes:', error);
                return [];
            }
        });
    }
    /**
     * Obtener agente por ID
     */
    getAgentById(agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agent = yield supabase_database_service_1.supabaseDatabaseService.getAgentById(agentId);
                console.log(`✅ Agente obtenido: ${agentId}`);
                return agent;
            }
            catch (error) {
                console.error('❌ Error obteniendo agente:', error);
                return null;
            }
        });
    }
    /**
     * Obtener agente por email
     */
    getAgentByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const agent = yield supabase_database_service_1.supabaseDatabaseService.getAgentByEmail(email);
                console.log(`✅ Agente obtenido por email: ${email}`);
                return agent;
            }
            catch (error) {
                console.error('❌ Error obteniendo agente por email:', error);
                return null;
            }
        });
    }
    // ===== CONTACTOS =====
    /**
     * Obtener o crear contacto por teléfono
     */
    getOrCreateContact(phone, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contact = yield supabase_database_service_1.supabaseDatabaseService.getOrCreateContact(phone, name);
                if (contact) {
                    console.log(`✅ Contacto encontrado/creado: ${contact.id} para ${phone}`);
                }
                else {
                    console.log(`⚠️ No se pudo crear contacto para ${phone}`);
                }
                return contact;
            }
            catch (error) {
                console.error('❌ Error en getOrCreateContact:', error);
                return null;
            }
        });
    }
    /**
     * Obtener contacto por teléfono
     */
    getContactByPhone(phone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contact = yield supabase_database_service_1.supabaseDatabaseService.getContactByPhone(phone);
                console.log(`✅ Contacto obtenido por teléfono: ${phone}`);
                return contact;
            }
            catch (error) {
                console.error('❌ Error obteniendo contacto por teléfono:', error);
                return null;
            }
        });
    }
    /**
     * Actualizar contacto
     */
    updateContact(contactId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield supabase_database_service_1.supabaseDatabaseService.updateContact(contactId, data);
                if (success) {
                    console.log(`✅ Contacto actualizado: ${contactId}`);
                }
                else {
                    console.log(`⚠️ No se pudo actualizar contacto: ${contactId}`);
                }
                return success;
            }
            catch (error) {
                console.error('❌ Error actualizando contacto:', error);
                return false;
            }
        });
    }
    /**
     * Obtener todos los contactos
     */
    getContacts(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const limit = options.limit || 50;
                const offset = options.offset || 0;
                const contacts = yield supabase_database_service_1.supabaseDatabaseService.getContacts(limit, offset);
                console.log(`✅ Contactos obtenidos: ${contacts.length}`);
                return { contacts, total: contacts.length };
            }
            catch (error) {
                console.error('❌ Error obteniendo contactos:', error);
                return { contacts: [], total: 0 };
            }
        });
    }
    // ===== CONVERSACIONES =====
    /**
     * Obtener o crear conversación por teléfono
     */
    getOrCreateConversationByPhone(contactPhone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversation = yield supabase_database_service_1.supabaseDatabaseService.getOrCreateConversation(contactPhone);
                if (conversation) {
                    console.log(`✅ Conversación encontrada/creada: ${conversation.id} para ${contactPhone}`);
                }
                else {
                    console.log(`⚠️ No se pudo crear conversación para ${contactPhone}`);
                }
                return conversation;
            }
            catch (error) {
                console.error('❌ Error en getOrCreateConversationByPhone:', error);
                return null;
            }
        });
    }
    /**
     * Actualizar modo AI de conversación (TAKEOVER)
     */
    setConversationAIMode(conversationId, mode, agentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_database_service_1.supabaseDatabaseService.setConversationAIMode(conversationId, mode, agentId, reason);
                if (result.success) {
                    console.log(`✅ Modo AI actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''}`);
                }
                else {
                    console.error(`❌ Error actualizando modo AI: ${result.error}`);
                }
                return result;
            }
            catch (error) {
                console.error('❌ Error en setConversationAIMode:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtener modo AI de conversación
     */
    getConversationAIMode(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mode = yield supabase_database_service_1.supabaseDatabaseService.getConversationAIMode(conversationId);
                console.log(`🔍 Modo AI obtenido: ${conversationId} -> ${mode}`);
                return mode;
            }
            catch (error) {
                console.error('❌ Error en getConversationAIMode:', error);
                return null;
            }
        });
    }
    /**
     * Obtener conversaciones que necesitan takeover
     */
    getConversationsNeedingTakeover() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.getConversationsNeedingTakeover();
                console.log(`🔍 Conversaciones que necesitan takeover: ${conversations.length}`);
                return conversations;
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones para takeover:', error);
                return [];
            }
        });
    }
    /**
     * Asignar conversación a agente
     */
    assignConversationToAgent(conversationId, agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_database_service_1.supabaseDatabaseService.assignConversationToAgent(conversationId, agentId);
                if (result.success) {
                    console.log(`✅ Conversación ${conversationId} asignada a agente ${agentId}`);
                }
                else {
                    console.error(`❌ Error asignando conversación: ${result.error}`);
                }
                return result;
            }
            catch (error) {
                console.error('❌ Error en assignConversationToAgent:', error);
                return { success: false };
            }
        });
    }
    /**
     * Liberar conversación de agente
     */
    releaseConversationFromAgent(conversationId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_database_service_1.supabaseDatabaseService.releaseConversationFromAgent(conversationId, reason);
                if (result.success) {
                    console.log(`✅ Conversación ${conversationId} liberada del agente`);
                }
                else {
                    console.error(`❌ Error liberando conversación: ${result.error}`);
                }
                return result;
            }
            catch (error) {
                console.error('❌ Error en releaseConversationFromAgent:', error);
                return { success: false };
            }
        });
    }
    /**
     * Obtener conversaciones activas
     */
    getActiveConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.getActiveConversations();
                console.log(`✅ Conversaciones activas obtenidas: ${conversations.length}`);
                return conversations;
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones activas:', error);
                return [];
            }
        });
    }
    /**
     * Buscar conversaciones
     */
    searchConversations(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.searchConversations(criteria);
                console.log(`🔍 Conversaciones encontradas: ${conversations.length}`);
                return conversations;
            }
            catch (error) {
                console.error('❌ Error buscando conversaciones:', error);
                return [];
            }
        });
    }
    /**
     * Obtener conversaciones
     */
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.getConversations(limit, offset);
                console.log(`✅ Conversaciones obtenidas: ${conversations.length}`);
                // Enriquecer conversaciones con información adicional
                const enrichedConversations = yield Promise.all(conversations.map((conv) => __awaiter(this, void 0, void 0, function* () {
                    // Obtener el último mensaje de la conversación de manera eficiente
                    const lastMessage = yield this.getLastMessage(conv.id);
                    // Obtener información del contacto
                    let contact = null;
                    if (conv.contact_phone) {
                        contact = yield this.getContactByPhone(conv.contact_phone);
                    }
                    return Object.assign(Object.assign({}, conv), { lastMessage: lastMessage ? {
                            id: lastMessage.id,
                            content: lastMessage.content,
                            timestamp: lastMessage.created_at,
                            isFromUs: lastMessage.sender_type === 'agent' || lastMessage.sender_type === 'bot'
                        } : null, contact: contact, _count: {
                            messages: 1 // Por ahora, podríamos implementar un contador real si es necesario
                        } });
                })));
                return enrichedConversations;
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones:', error);
                return [];
            }
        });
    }
    // ===== MENSAJES =====
    /**
     * Crear mensaje
     */
    createChatbotMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield supabase_database_service_1.supabaseDatabaseService.createMessage({
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
                }
                else {
                    console.log(`⚠️ No se pudo crear mensaje para conversación ${data.conversationId}`);
                    return { success: false };
                }
            }
            catch (error) {
                console.error('❌ Error en createChatbotMessage:', error);
                return { success: false };
            }
        });
    }
    /**
     * Obtener mensajes de conversación
     */
    getChatbotConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50) {
            try {
                console.log(`📨 [DatabaseService] Obteniendo mensajes para conversación: ${conversationId} (límite: ${limit})`);
                const messages = yield supabase_database_service_1.supabaseDatabaseService.getConversationMessages(conversationId, limit);
                console.log(`📨 [DatabaseService] ${messages.length} mensajes obtenidos para ${conversationId}`);
                // DEBUG: Contar mensajes por tipo de remitente
                if (messages.length > 0) {
                    const userMessages = messages.filter(m => m.sender_type === 'user').length;
                    const botMessages = messages.filter(m => m.sender_type === 'bot').length;
                    const agentMessages = messages.filter(m => m.sender_type === 'agent').length;
                    console.log(`📨 [DatabaseService] Desglose de mensajes: User=${userMessages}, Bot=${botMessages}, Agent=${agentMessages}`);
                }
                return messages;
            }
            catch (error) {
                console.error('❌ Error en getChatbotConversationMessages:', error);
                return [];
            }
        });
    }
    /**
     * Obtener el último mensaje de una conversación
     */
    getLastMessage(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield supabase_database_service_1.supabaseDatabaseService.getLastMessage(conversationId);
                console.log(`✅ Último mensaje obtenido para conversación ${conversationId}: ${message ? message.id : 'sin mensajes'}`);
                return message;
            }
            catch (error) {
                console.error('❌ Error en getLastMessage:', error);
                return null;
            }
        });
    }
    /**
     * Marcar mensaje como leído
     */
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield supabase_database_service_1.supabaseDatabaseService.markMessageAsRead(messageId);
                if (success) {
                    console.log(`✅ Mensaje marcado como leído: ${messageId}`);
                }
                else {
                    console.log(`⚠️ No se pudo marcar mensaje como leído: ${messageId}`);
                }
                return success;
            }
            catch (error) {
                console.error('❌ Error en markMessageAsRead:', error);
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
                const success = yield supabase_database_service_1.supabaseDatabaseService.markConversationAsRead(conversationId);
                if (success) {
                    console.log(`✅ Conversación marcada como leída: ${conversationId}`);
                }
                else {
                    console.log(`⚠️ No se pudo marcar conversación como leída: ${conversationId}`);
                }
                return success;
            }
            catch (error) {
                console.error('❌ Error en markConversationAsRead:', error);
                return false;
            }
        });
    }
    // ===== ESTADÍSTICAS =====
    /**
     * Obtener estadísticas del chatbot
     */
    getChatbotStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield supabase_database_service_1.supabaseDatabaseService.getChatbotStats();
                console.log('📊 Estadísticas del chatbot obtenidas');
                return stats;
            }
            catch (error) {
                console.error('❌ Error en getChatbotStats:', error);
                return {
                    totalConversations: 0,
                    totalMessages: 0,
                    totalOrders: 0,
                    activeConversations: 0
                };
            }
        });
    }
    // ===== FUNCIONES LEGACY (MANTENER COMPATIBILIDAD) =====
    saveChatbotConversationSummary(conversationId_1, summaryData_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, summaryData, generatedBy = 'gemini-2.5-flash') {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📝 Resumen guardado para conversación ${conversationId} (legacy)`);
            return { success: true, summaryId: 'legacy' };
        });
    }
    getChatbotConversationSummary(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📝 Resumen obtenido para conversación ${conversationId} (legacy)`);
            return null;
        });
    }
    createChatbotOrder(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📦 Orden creada (legacy)`);
            return { success: true, orderId: 'legacy', erpOrderId: 'legacy' };
        });
    }
    searchChatbotProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, limit = 10) {
            const result = yield product_catalog_service_1.productCatalogService.searchProducts(searchTerm, { limit });
            return result.products;
        });
    }
    // ===== FUNCIONES DE WHATSAPP (MANTENER COMPATIBILIDAD) =====
    processIncomingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener o crear contacto
                const contact = yield this.getOrCreateContact(data.fromWaId, data.contactName);
                if (!contact) {
                    throw new Error('No se pudo crear/obtener contacto');
                }
                // Obtener o crear conversación
                const conversation = yield this.getOrCreateConversationByPhone(data.fromWaId);
                if (!conversation) {
                    throw new Error('No se pudo crear/obtener conversación');
                }
                // Crear mensaje
                const messageResult = yield this.createChatbotMessage({
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
                yield supabase_database_service_1.supabaseDatabaseService.updateConversationLastMessage(conversation.id, data.timestamp);
                console.log(`✅ Mensaje entrante procesado: ${data.waMessageId}`);
                return {
                    success: true,
                    message: {
                        id: messageResult.messageId,
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
            }
            catch (error) {
                console.error('❌ Error procesando mensaje entrante:', error);
                return {
                    success: false,
                    message: { id: 0, timestamp: new Date(), content: '' },
                    conversation: { id: '', unreadCount: 0 },
                    contact: { id: '', name: '', waId: '' }
                };
            }
        });
    }
    processOutgoingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener o crear contacto
                const contact = yield this.getOrCreateContact(data.toWaId);
                if (!contact) {
                    throw new Error('No se pudo crear/obtener contacto');
                }
                // Obtener o crear conversación
                const conversation = yield this.getOrCreateConversationByPhone(data.toWaId);
                if (!conversation) {
                    throw new Error('No se pudo crear/obtener conversación');
                }
                // Crear mensaje
                const messageResult = yield this.createChatbotMessage({
                    conversationId: conversation.id,
                    senderType: 'agent',
                    content: data.content,
                    messageType: data.messageType,
                    whatsappMessageId: data.waMessageId,
                    clientId: data.clientId, // NUEVO: Pasar clientId para deduplicación
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
                yield supabase_database_service_1.supabaseDatabaseService.updateConversationLastMessage(conversation.id, data.timestamp);
                console.log(`✅ Mensaje saliente procesado: ${data.waMessageId}`);
                return {
                    success: true,
                    message: {
                        id: messageResult.messageId,
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
            }
            catch (error) {
                console.error('❌ Error procesando mensaje saliente:', error);
                return {
                    success: false,
                    message: { id: 0, timestamp: new Date(), content: '' },
                    conversation: { id: '', unreadCount: 0 },
                    contact: { id: '', name: '', waId: '' }
                };
            }
        });
    }
    // ===== FUNCIONES DE CONEXIÓN Y ESTADÍSTICAS =====
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔌 DatabaseService conectado (nuevo esquema)');
        });
    }
    /**
     * Verificar si la base de datos está saludable
     */
    isHealthy() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Intentar hacer una consulta simple para verificar la conexión
                const stats = yield this.getChatbotStats();
                return stats.totalConversations >= 0; // Si no hay error, está saludable
            }
            catch (error) {
                console.error('❌ Error en health check de base de datos:', error);
                return false;
            }
        });
    }
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getChatbotStats();
        });
    }
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            return yield this.getChatbotConversationMessages(conversationId, limit);
        });
    }
    cleanupOldMessages(olderThanHours) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedCount = yield supabase_database_service_1.supabaseDatabaseService.cleanupOldMessages(olderThanHours);
                console.log(`🧹 Mensajes antiguos eliminados: ${deletedCount}`);
                return deletedCount;
            }
            catch (error) {
                console.error('❌ Error limpiando mensajes antiguos:', error);
                return 0;
            }
        });
    }
    // ===== FUNCIONES LEGACY DE CONTACTOS (MANTENER COMPATIBILIDAD) =====
    searchContacts(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar búsqueda en el nuevo esquema
            console.log('🔍 Búsqueda de contactos (legacy)');
            return [];
        });
    }
    getContactById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contact = yield supabase_database_service_1.supabaseDatabaseService.getContactById(id);
                console.log(`✅ Contacto obtenido por ID: ${id}`);
                return contact;
            }
            catch (error) {
                console.error('❌ Error obteniendo contacto por ID:', error);
                return null;
            }
        });
    }
    deleteContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield supabase_database_service_1.supabaseDatabaseService.deleteContact(id);
                console.log(`✅ Contacto eliminado: ${id}`);
                return success;
            }
            catch (error) {
                console.error('❌ Error eliminando contacto:', error);
                return false;
            }
        });
    }
    toggleBlockContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema
            console.log(`🚫 Contacto bloqueado/desbloqueado: ${id} (legacy)`);
            return { success: true };
        });
    }
    toggleFavoriteContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema
            console.log(`⭐ Contacto marcado/desmarcado como favorito: ${id} (legacy)`);
            return { success: true };
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log('🏷️ Tags obtenidos (legacy)');
            return [];
        });
    }
    createTag(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log('🏷️ Tag creado (legacy)');
            return { id: 'legacy', name: data.name };
        });
    }
    updateTag(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`🏷️ Tag actualizado: ${id} (legacy)`);
            return { id, name: data.name };
        });
    }
    deleteTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`🏷️ Tag eliminado: ${id} (legacy)`);
            return true;
        });
    }
    addTagToContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`🏷️ Tag agregado a contacto: ${contactId} -> ${tagId} (legacy)`);
            return true;
        });
    }
    removeTagFromContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`🏷️ Tag removido de contacto: ${contactId} -> ${tagId} (legacy)`);
            return true;
        });
    }
    getContactsByTag(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log('🔍 Contactos por tag (legacy)');
            return [];
        });
    }
    /**
     * Obtener modo takeover de conversación
     */
    getConversationTakeoverMode(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mode = yield supabase_database_service_1.supabaseDatabaseService.getConversationTakeoverMode(conversationId);
                console.log(`🔍 Takeover mode obtenido: ${conversationId} -> ${mode}`);
                return mode;
            }
            catch (error) {
                console.error('❌ Error en getConversationTakeoverMode:', error);
                return null;
            }
        });
    }
    /**
     * Establecer modo takeover de conversación
     */
    setConversationTakeoverMode(conversationId, mode, agentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield supabase_database_service_1.supabaseDatabaseService.setConversationTakeoverMode(conversationId, mode, agentId, reason);
                if (result.success) {
                    console.log(`✅ Takeover mode actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''}`);
                }
                else {
                    console.error(`❌ Error actualizando takeover mode: ${result.error}`);
                }
                return result;
            }
            catch (error) {
                console.error('❌ Error en setConversationTakeoverMode:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtener conversaciones en modo espectador
     */
    getSpectatorConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.getSpectatorConversations();
                console.log(`🔍 Conversaciones en espectador: ${conversations.length}`);
                return conversations;
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones en espectador:', error);
                return [];
            }
        });
    }
    /**
     * Obtener conversaciones en takeover
     */
    getTakeoverConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conversations = yield supabase_database_service_1.supabaseDatabaseService.getTakeoverConversations();
                console.log(`🔍 Conversaciones en takeover: ${conversations.length}`);
                return conversations;
            }
            catch (error) {
                console.error('❌ Error obteniendo conversaciones en takeover:', error);
                return [];
            }
        });
    }
    /**
     * Verificar si el chatbot puede procesar un mensaje
     */
    canChatbotProcessMessage(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const canProcess = yield supabase_database_service_1.supabaseDatabaseService.canChatbotProcessMessage(conversationId);
                console.log(`🔍 Chatbot puede procesar ${conversationId}: ${canProcess}`);
                return canProcess;
            }
            catch (error) {
                console.error('❌ Error verificando si chatbot puede procesar:', error);
                return false;
            }
        });
    }
    /**
     * Verificar si ya existe un mensaje con el mismo client_id en una conversación
     */
    checkMessageByClientId(conversationId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield supabase_database_service_1.supabaseDatabaseService.checkMessageByClientId(conversationId, clientId);
                if (message) {
                    console.log(`🔍 Mensaje con client_id ${clientId} ya existe en conversación ${conversationId}`);
                }
                return message;
            }
            catch (error) {
                console.error('❌ Error en checkMessageByClientId:', error);
                return null;
            }
        });
    }
}
exports.DatabaseService = DatabaseService;
// Instancia singleton
exports.databaseService = new DatabaseService();
