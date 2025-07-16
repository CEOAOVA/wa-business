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
/**
 * Servicio principal de base de datos - SOLO SUPABASE
 * COMPLETAMENTE LIBRE DE PRISMA
 */
class DatabaseService {
    constructor() {
        console.log('🗄️ DatabaseService inicializado (Supabase ONLY - SIN PRISMA)');
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
                const messages = yield supabase_database_service_1.supabaseDatabaseService.getConversationMessages(conversationId, limit);
                console.log(`🔍 Mensajes obtenidos: ${messages.length} para conversación ${conversationId}`);
                return messages;
            }
            catch (error) {
                console.error('❌ Error en getChatbotConversationMessages:', error);
                return [];
            }
        });
    }
    // ===== RESÚMENES =====
    /**
     * Guardar resumen de conversación
     */
    saveChatbotConversationSummary(conversationId_1, summaryData_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, summaryData, generatedBy = 'gemini-2.5-flash') {
            try {
                const summary = yield supabase_database_service_1.supabaseDatabaseService.upsertConversationSummary(conversationId, summaryData, generatedBy);
                if (summary) {
                    console.log(`✅ Resumen guardado en Supabase: ${summary.id} para conversación ${conversationId}`);
                    return { success: true, summaryId: summary.id };
                }
                else {
                    console.log(`⚠️ No se pudo guardar resumen para conversación ${conversationId}`);
                    return { success: false };
                }
            }
            catch (error) {
                console.error('❌ Error en saveChatbotConversationSummary:', error);
                return { success: false };
            }
        });
    }
    /**
     * Obtener resumen de conversación
     */
    getChatbotConversationSummary(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const summary = yield supabase_database_service_1.supabaseDatabaseService.getConversationSummary(conversationId);
                if (summary) {
                    console.log(`🔍 Resumen obtenido para conversación ${conversationId}`);
                    return summary.summary_data;
                }
                else {
                    console.log(`📋 No hay resumen disponible para conversación ${conversationId}`);
                    return null;
                }
            }
            catch (error) {
                console.error('❌ Error en getChatbotConversationSummary:', error);
                return null;
            }
        });
    }
    // ===== PEDIDOS =====
    /**
     * Crear pedido
     */
    createChatbotOrder(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield supabase_database_service_1.supabaseDatabaseService.createOrder(data);
                if (order) {
                    console.log(`✅ Pedido creado en Supabase: ${order.id}`);
                    return {
                        success: true,
                        orderId: order.id,
                        erpOrderId: order.erp_order_id
                    };
                }
                else {
                    console.log(`⚠️ No se pudo crear pedido`);
                    return { success: false };
                }
            }
            catch (error) {
                console.error('❌ Error en createChatbotOrder:', error);
                return { success: false };
            }
        });
    }
    // ===== ESTADÍSTICAS =====
    /**
     * Obtener estadísticas del sistema
     */
    getChatbotStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield supabase_database_service_1.supabaseDatabaseService.getStats();
                console.log(`📊 Estadísticas obtenidas:`, stats);
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
    // ===== TAKEOVER MANAGEMENT =====
    /**
     * Obtener conversaciones que necesitan takeover
     */
    getConversationsNeedingTakeover() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // TODO: Implementar lógica específica para detectar conversaciones que necesitan intervención
                console.log('🔍 Buscando conversaciones que necesitan takeover...');
                return [];
            }
            catch (error) {
                console.error('❌ Error en getConversationsNeedingTakeover:', error);
                return [];
            }
        });
    }
    /**
     * Asignar conversación a agente humano
     */
    assignConversationToAgent(conversationId, agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.setConversationAIMode(conversationId, 'paused', agentId, 'Assigned to human agent');
                if (result.success) {
                    console.log(`👤 Conversación ${conversationId} asignada a agente ${agentId}`);
                }
                return { success: result.success };
            }
            catch (error) {
                console.error('❌ Error en assignConversationToAgent:', error);
                return { success: false };
            }
        });
    }
    /**
     * Liberar conversación de agente (volver a IA)
     */
    releaseConversationFromAgent(conversationId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.setConversationAIMode(conversationId, 'active', undefined, reason || 'Released back to AI');
                if (result.success) {
                    console.log(`🤖 Conversación ${conversationId} liberada de vuelta a IA`);
                }
                return { success: result.success };
            }
            catch (error) {
                console.error('❌ Error en releaseConversationFromAgent:', error);
                return { success: false };
            }
        });
    }
    // ===== MÉTODOS DE CONSULTA DIRECTA =====
    /**
     * Obtener conversaciones activas
     */
    getActiveConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Usando servicio directo para obtener conversaciones activas
                return yield supabase_database_service_1.supabaseDatabaseService.getActiveConversations();
            }
            catch (error) {
                console.error('❌ Error en getActiveConversations:', error);
                return [];
            }
        });
    }
    /**
     * Buscar conversaciones por criterio
     */
    searchConversations(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield supabase_database_service_1.supabaseDatabaseService.searchConversations(criteria);
            }
            catch (error) {
                console.error('❌ Error en searchConversations:', error);
                return [];
            }
        });
    }
    // ===== MÉTODOS DE DASHBOARD REQUERIDOS =====
    /**
     * Obtener conversaciones con paginación (para dashboard)
     */
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            try {
                // Implementación básica - obtener conversaciones ordenadas por fecha
                const conversations = yield this.getActiveConversations();
                return conversations.slice(offset, offset + limit);
            }
            catch (error) {
                console.error('❌ Error en getConversations:', error);
                return [];
            }
        });
    }
    // ===== MÉTODOS DE PRODUCTOS (TEMPORAL) =====
    /**
     * Buscar productos (temporal hasta integrar SOAP)
     */
    searchChatbotProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, limit = 10) {
            try {
                const products = yield supabase_database_service_1.supabaseDatabaseService.searchProducts(searchTerm, limit);
                return products;
            }
            catch (error) {
                console.error('❌ Error en searchChatbotProducts:', error);
                return [];
            }
        });
    }
    // ===== MÉTODOS DE CONTACTOS (STUBS TEMPORALES) =====
    getContacts(options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 getContacts - método temporal sin implementar');
            return { contacts: [], total: 0 };
        });
    }
    searchContacts(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 searchContacts - método temporal sin implementar');
            return [];
        });
    }
    getContactById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 getContactById - método temporal sin implementar');
            return null;
        });
    }
    updateContact(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 updateContact - método temporal sin implementar');
            return null;
        });
    }
    deleteContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 deleteContact - método temporal sin implementar');
            return false;
        });
    }
    toggleBlockContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 toggleBlockContact - método temporal sin implementar');
            return { success: false };
        });
    }
    toggleFavoriteContact(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 toggleFavoriteContact - método temporal sin implementar');
            return { success: false };
        });
    }
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 getTags - método temporal sin implementar');
            return [];
        });
    }
    createTag(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 createTag - método temporal sin implementar');
            return null;
        });
    }
    updateTag(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 updateTag - método temporal sin implementar');
            return null;
        });
    }
    deleteTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 deleteTag - método temporal sin implementar');
            return false;
        });
    }
    addTagToContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 addTagToContact - método temporal sin implementar');
            return false;
        });
    }
    removeTagFromContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 removeTagFromContact - método temporal sin implementar');
            return false;
        });
    }
    getContactsByTag(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📋 getContactsByTag - método temporal sin implementar');
            return [];
        });
    }
    // ===== MÉTODOS DE WHATSAPP SERVICE REQUERIDOS =====
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔌 DatabaseService.connect - Supabase siempre conectado');
        });
    }
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getChatbotStats();
        });
    }
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            const messages = yield this.getChatbotConversationMessages(conversationId, limit);
            return messages.slice(offset, offset + limit);
        });
    }
    // ===== MÉTODOS PARA WHATSAPP WEBHOOK =====
    /**
     * Procesar mensaje entrante de WhatsApp
     */
    processIncomingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📥 Procesando mensaje entrante de ${data.fromWaId}: ${data.content.substring(0, 50)}...`);
                // 1. Obtener o crear conversación usando el método existente
                const conversation = yield this.getOrCreateConversationByPhone(data.fromWaId);
                if (!conversation) {
                    throw new Error(`No se pudo crear conversación para ${data.fromWaId}`);
                }
                // 2. Crear mensaje en Supabase usando la interfaz correcta
                const message = yield supabase_database_service_1.supabaseDatabaseService.createMessage({
                    conversationId: conversation.id,
                    senderType: 'user',
                    content: data.content,
                    messageType: data.messageType || 'text',
                    whatsappMessageId: data.waMessageId,
                    metadata: {
                        from_wa_id: data.fromWaId,
                        to_wa_id: data.toWaId,
                        contact_name: data.contactName,
                        media_url: data.mediaUrl,
                        media_caption: data.mediaCaption,
                        processed_at: new Date().toISOString()
                    }
                });
                if (!message) {
                    throw new Error('No se pudo crear el mensaje en la base de datos');
                }
                console.log(`✅ Mensaje entrante guardado: ID=${message.id}, Conv=${conversation.id}`);
                return {
                    success: true,
                    message: {
                        id: message.id,
                        timestamp: new Date(message.created_at),
                        content: message.content
                    },
                    conversation: {
                        id: conversation.id,
                        unreadCount: 1 // Incrementar contador por mensaje entrante
                    },
                    contact: {
                        id: conversation.contact_phone,
                        name: data.contactName || conversation.contact_phone,
                        waId: data.fromWaId
                    }
                };
            }
            catch (error) {
                console.error('❌ Error procesando mensaje entrante:', error);
                throw error;
            }
        });
    }
    /**
     * Procesar mensaje saliente de WhatsApp
     */
    processOutgoingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📤 Procesando mensaje saliente a ${data.toWaId}: ${data.content.substring(0, 50)}...`);
                // 1. Obtener o crear conversación usando el método existente
                const conversation = yield this.getOrCreateConversationByPhone(data.toWaId);
                if (!conversation) {
                    throw new Error(`No se pudo crear conversación para ${data.toWaId}`);
                }
                // 2. Crear mensaje en Supabase usando la interfaz correcta
                const message = yield supabase_database_service_1.supabaseDatabaseService.createMessage({
                    conversationId: conversation.id,
                    senderType: 'agent', // Los mensajes salientes se consideran del agente
                    content: data.content,
                    messageType: data.messageType || 'text',
                    whatsappMessageId: data.waMessageId,
                    metadata: {
                        to_wa_id: data.toWaId,
                        media_url: data.mediaUrl,
                        media_caption: data.mediaCaption,
                        sent_at: new Date().toISOString()
                    }
                });
                if (!message) {
                    throw new Error('No se pudo crear el mensaje en la base de datos');
                }
                console.log(`✅ Mensaje saliente guardado: ID=${message.id}, Conv=${conversation.id}`);
                return {
                    success: true,
                    message: {
                        id: message.id,
                        timestamp: new Date(message.created_at),
                        content: message.content
                    },
                    conversation: {
                        id: conversation.id,
                        unreadCount: 0 // Los mensajes salientes no incrementan el contador
                    },
                    contact: {
                        id: conversation.contact_phone,
                        name: conversation.contact_phone,
                        waId: data.toWaId
                    }
                };
            }
            catch (error) {
                console.error('❌ Error procesando mensaje saliente:', error);
                throw error;
            }
        });
    }
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Implementar cuando sea necesario marcar mensajes como leídos
                console.log(`✅ markMessageAsRead: ${messageId}`);
                return true;
            }
            catch (error) {
                console.error('❌ Error en markMessageAsRead:', error);
                return false;
            }
        });
    }
    markConversationAsRead(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Implementar cuando sea necesario marcar conversaciones como leídas
                console.log(`✅ markConversationAsRead: ${conversationId}`);
                return true;
            }
            catch (error) {
                console.error('❌ Error en markConversationAsRead:', error);
                return false;
            }
        });
    }
    cleanupOldMessages(olderThanHours) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Implementar limpieza de mensajes antiguos cuando sea necesario
                console.log(`🧹 cleanupOldMessages: ${olderThanHours} horas`);
                return 0;
            }
            catch (error) {
                console.error('❌ Error en cleanupOldMessages:', error);
                return 0;
            }
        });
    }
}
exports.DatabaseService = DatabaseService;
// Instancia singleton
exports.databaseService = new DatabaseService();
