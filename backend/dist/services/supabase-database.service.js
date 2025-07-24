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
exports.supabaseDatabaseService = exports.SupabaseDatabaseService = void 0;
const supabase_1 = require("../config/supabase");
class SupabaseDatabaseService {
    constructor() {
        // FORZAR Supabase como única opción - NO más fallbacks
        this.isEnabled = !!supabase_1.supabase;
        if (this.isEnabled) {
            console.log('🚀 Supabase Database Service activado (NUEVO ESQUEMA)');
        }
        else {
            console.error('❌ CRÍTICO: Supabase no configurado. Sistema NO puede funcionar.');
            throw new Error('Supabase es requerido. Verificar SUPABASE_URL y SUPABASE_ANON_KEY');
        }
    }
    /**
     * Verificar si Supabase está habilitado
     */
    isSupabaseEnabled() {
        return this.isEnabled;
    }
    // ===== GESTIÓN DE AGENTES =====
    /**
     * Obtener todos los agentes
     */
    getAgents() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agents, error } = yield supabase_1.supabase
                    .from('agents')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) {
                    console.error('❌ Error obteniendo agentes:', error);
                    return [];
                }
                return agents || [];
            }
            catch (error) {
                console.error('❌ Error en getAgents:', error);
                return [];
            }
        });
    }
    /**
     * Obtener agente por ID
     */
    getAgentById(agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agent, error } = yield supabase_1.supabase
                    .from('agents')
                    .select('*')
                    .eq('id', agentId)
                    .single();
                if (error) {
                    console.error('❌ Error obteniendo agente por ID:', error);
                    return null;
                }
                return agent;
            }
            catch (error) {
                console.error('❌ Error en getAgentById:', error);
                return null;
            }
        });
    }
    /**
     * Obtener agente por email
     */
    getAgentByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agent, error } = yield supabase_1.supabase
                    .from('agents')
                    .select('*')
                    .eq('email', email)
                    .single();
                if (error) {
                    console.error('❌ Error obteniendo agente por email:', error);
                    return null;
                }
                return agent;
            }
            catch (error) {
                console.error('❌ Error en getAgentByEmail:', error);
                return null;
            }
        });
    }
    // ===== GESTIÓN DE CONTACTOS =====
    /**
     * Obtener o crear contacto por teléfono
     */
    getOrCreateContact(phone, name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                // Intentar obtener contacto existente
                const { data: existingContact, error: fetchError } = yield supabase_1.supabase
                    .from('contacts')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                if (existingContact && !fetchError) {
                    return existingContact;
                }
                // Crear nuevo contacto si no existe
                const { data: newContact, error: createError } = yield supabase_1.supabase
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
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contact, error } = yield supabase_1.supabase
                    .from('contacts')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                if (error) {
                    console.error('❌ Error obteniendo contacto por teléfono:', error);
                    return null;
                }
                return contact;
            }
            catch (error) {
                console.error('❌ Error en getContactByPhone:', error);
                return null;
            }
        });
    }
    /**
     * Obtener contacto por ID
     */
    getContactById(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contact, error } = yield supabase_1.supabase
                    .from('contacts')
                    .select('*')
                    .eq('id', contactId)
                    .single();
                if (error) {
                    console.error('❌ Error obteniendo contacto por ID:', error);
                    return null;
                }
                return contact;
            }
            catch (error) {
                console.error('❌ Error en getContactById:', error);
                return null;
            }
        });
    }
    /**
     * Actualizar contacto
     */
    updateContact(contactId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { error } = yield supabase_1.supabase
                    .from('contacts')
                    .update(Object.assign(Object.assign({}, data), { updated_at: new Date().toISOString() }))
                    .eq('id', contactId);
                if (error) {
                    console.error('❌ Error actualizando contacto:', error);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ Error en updateContact:', error);
                return false;
            }
        });
    }
    /**
     * Eliminar contacto
     */
    deleteContact(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { error } = yield supabase_1.supabase
                    .from('contacts')
                    .delete()
                    .eq('id', contactId);
                if (error) {
                    console.error('❌ Error eliminando contacto:', error);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ Error en deleteContact:', error);
                return false;
            }
        });
    }
    /**
     * Obtener contactos con paginación
     */
    getContacts() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contacts, error } = yield supabase_1.supabase
                    .from('contacts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);
                if (error) {
                    console.error('❌ Error obteniendo contactos:', error);
                    return [];
                }
                return contacts || [];
            }
            catch (error) {
                console.error('❌ Error en getContacts:', error);
                return [];
            }
        });
    }
    // ===== GESTIÓN DE CONVERSACIONES =====
    /**
     * Obtener o crear conversación por teléfono del contacto
     */
    getOrCreateConversation(contactPhone) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible - configurar SUPABASE_URL y SUPABASE_ANON_KEY');
            }
            try {
                // Intentar obtener conversación existente
                const { data: existingConversation, error: fetchError } = yield supabase_1.supabase
                    .from('conversations')
                    .select('*')
                    .eq('contact_phone', contactPhone)
                    .single();
                if (existingConversation && !fetchError) {
                    return existingConversation;
                }
                // Crear nueva conversación si no existe
                const { data: newConversation, error: createError } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en getOrCreateConversation:', error);
                return null;
            }
        });
    }
    /**
     * Actualizar modo AI de conversación
     */
    setConversationAIMode(conversationId, mode, agentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                const updateData = {
                    ai_mode: mode,
                    updated_at: new Date().toISOString()
                };
                if (agentId) {
                    updateData.assigned_agent_id = agentId;
                }
                if (reason) {
                    updateData.metadata = { takeover_reason: reason };
                }
                const { error } = yield supabase_1.supabase
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversationId);
                if (error) {
                    console.error('❌ Error actualizando modo AI:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
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
            if (!this.isEnabled || !supabase_1.supabase) {
                return null;
            }
            try {
                const { data: conversation, error } = yield supabase_1.supabase
                    .from('conversations')
                    .select('ai_mode')
                    .eq('id', conversationId)
                    .single();
                if (error) {
                    console.error('❌ Error obteniendo modo AI:', error);
                    return null;
                }
                return (conversation === null || conversation === void 0 ? void 0 : conversation.ai_mode) || null;
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
            if (!this.isEnabled || !supabase_1.supabase) {
                return [];
            }
            try {
                const { data: conversations, error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en getConversationsNeedingTakeover:', error);
                return [];
            }
        });
    }
    /**
     * Asignar conversación a agente
     */
    assignConversationToAgent(conversationId, agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                const { error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en assignConversationToAgent:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Liberar conversación de agente
     */
    releaseConversationFromAgent(conversationId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                const updateData = {
                    assigned_agent_id: null,
                    ai_mode: 'active',
                    updated_at: new Date().toISOString()
                };
                if (reason) {
                    updateData.metadata = { release_reason: reason };
                }
                const { error } = yield supabase_1.supabase
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversationId);
                if (error) {
                    console.error('❌ Error liberando conversación de agente:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
            }
            catch (error) {
                console.error('❌ Error en releaseConversationFromAgent:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Actualizar última actividad de conversación
     */
    updateConversationLastMessage(conversationId, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return false;
            }
            try {
                const { error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en updateConversationLastMessage:', error);
                return false;
            }
        });
    }
    // ===== GESTIÓN DE MENSAJES =====
    /**
     * Crear mensaje
     */
    createMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: message, error } = yield supabase_1.supabase
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
                const updateData = {
                    last_message_at: message.created_at,
                    updated_at: message.created_at
                };
                // Incrementar contador de mensajes no leídos si es mensaje del usuario
                if (data.senderType === 'user') {
                    updateData.unread_count = supabase_1.supabase.rpc('increment_unread_count');
                }
                const { error: updateError } = yield supabase_1.supabase
                    .from('conversations')
                    .update(updateData)
                    .eq('id', data.conversationId);
                if (updateError) {
                    console.error('❌ Error actualizando conversación después de crear mensaje:', updateError);
                }
                else {
                    console.log(`✅ Conversación ${data.conversationId} actualizada con último mensaje: ${message.created_at}`);
                }
                return message;
            }
            catch (error) {
                console.error('❌ Error en createMessage:', error);
                return null;
            }
        });
    }
    /**
     * Obtener mensajes de conversación
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50) {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: messages, error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en getConversationMessages:', error);
                return [];
            }
        });
    }
    /**
     * Obtener el último mensaje de una conversación
     */
    getLastMessage(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: message, error } = yield supabase_1.supabase
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
            if (!this.isEnabled || !supabase_1.supabase) {
                return false;
            }
            try {
                const { error } = yield supabase_1.supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('id', messageId);
                if (error) {
                    console.error('❌ Error marcando mensaje como leído:', error);
                    return false;
                }
                return true;
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
            if (!this.isEnabled || !supabase_1.supabase) {
                return false;
            }
            try {
                // Marcar todos los mensajes de la conversación como leídos
                const { error: messagesError } = yield supabase_1.supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('conversation_id', conversationId)
                    .eq('is_read', false);
                if (messagesError) {
                    console.error('❌ Error marcando mensajes como leídos:', messagesError);
                    return false;
                }
                // Resetear contador de mensajes no leídos
                const { error: conversationError } = yield supabase_1.supabase
                    .from('conversations')
                    .update({ unread_count: 0 })
                    .eq('id', conversationId);
                if (conversationError) {
                    console.error('❌ Error reseteando contador de mensajes no leídos:', conversationError);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ Error en markConversationAsRead:', error);
                return false;
            }
        });
    }
    /**
     * Limpiar mensajes antiguos
     */
    cleanupOldMessages(olderThanHours) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return 0;
            }
            try {
                const cutoffDate = new Date();
                cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
                const { error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en cleanupOldMessages:', error);
                return 0;
            }
        });
    }
    // ===== ESTADÍSTICAS =====
    /**
     * Obtener estadísticas del chatbot
     */
    getChatbotStats() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return {
                    totalConversations: 0,
                    totalMessages: 0,
                    totalOrders: 0,
                    activeConversations: 0
                };
            }
            try {
                // Obtener estadísticas de conversaciones
                const { count: totalConversations } = yield supabase_1.supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true });
                const { count: activeConversations } = yield supabase_1.supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active');
                // Obtener estadísticas de mensajes
                const { count: totalMessages } = yield supabase_1.supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true });
                // Obtener estadísticas de órdenes (si existe la tabla)
                let totalOrders = 0;
                try {
                    const { count } = yield supabase_1.supabase
                        .from('orders')
                        .select('*', { count: 'exact', head: true });
                    totalOrders = count || 0;
                }
                catch (error) {
                    // La tabla orders puede no existir aún
                    console.log('📋 Tabla orders no disponible aún');
                }
                return {
                    totalConversations: totalConversations || 0,
                    totalMessages: totalMessages || 0,
                    totalOrders,
                    activeConversations: activeConversations || 0
                };
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
    upsertConversationSummary(conversationId_1, summaryData_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, summaryData, generatedBy = 'gemini-2.5-flash') {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📝 Resumen guardado para conversación ${conversationId} (legacy)`);
            return null;
        });
    }
    getConversationSummary(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📝 Resumen obtenido para conversación ${conversationId} (legacy)`);
            return null;
        });
    }
    searchProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, limit = 10) {
            // TODO: Implementar búsqueda de productos en el nuevo esquema
            console.log(`🔍 Búsqueda de productos: ${searchTerm} (legacy)`);
            return [];
        });
    }
    createOrder(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementar en el nuevo esquema si es necesario
            console.log(`📦 Orden creada (legacy)`);
            return null;
        });
    }
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getChatbotStats();
        });
    }
    getActiveConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return [];
            }
            try {
                const { data: conversations, error } = yield supabase_1.supabase
                    .from('conversations')
                    .select('*')
                    .eq('status', 'active')
                    .order('updated_at', { ascending: false });
                if (error) {
                    console.error('❌ Error obteniendo conversaciones activas:', error);
                    return [];
                }
                return conversations || [];
            }
            catch (error) {
                console.error('❌ Error en getActiveConversations:', error);
                return [];
            }
        });
    }
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            if (!this.isEnabled || !supabase_1.supabase) {
                return [];
            }
            try {
                // Ordenar por last_message_at si existe, sino por updated_at
                const { data: conversations, error } = yield supabase_1.supabase
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
            }
            catch (error) {
                console.error('❌ Error en getConversations:', error);
                return [];
            }
        });
    }
    searchConversations(criteria) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                return [];
            }
            try {
                let query = supabase_1.supabase
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
                const { data: conversations, error } = yield query.order('updated_at', { ascending: false });
                if (error) {
                    console.error('❌ Error buscando conversaciones:', error);
                    return [];
                }
                return conversations || [];
            }
            catch (error) {
                console.error('❌ Error en searchConversations:', error);
                return [];
            }
        });
    }
}
exports.SupabaseDatabaseService = SupabaseDatabaseService;
// Instancia singleton
exports.supabaseDatabaseService = new SupabaseDatabaseService();
