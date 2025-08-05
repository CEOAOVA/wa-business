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
const bulkhead_service_1 = require("./resilience/bulkhead.service");
class SupabaseDatabaseService {
    constructor() {
        // FORZAR Supabase como única opción - NO más fallbacks
        this.isEnabled = !!supabase_1.supabaseAdmin;
        if (this.isEnabled) {
            console.log('🚀 Supabase Database Service activado (NUEVO ESQUEMA)');
            // Inicializar bulkhead para Supabase
            this.supabaseBulkhead = bulkhead_service_1.bulkheadService.getBulkhead('supabase', bulkhead_service_1.BULKHEAD_CONFIGS.supabase);
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agents, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agent, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: agent, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                // Intentar obtener contacto existente
                const { data: existingContact, error: fetchError } = yield supabase_1.supabaseAdmin
                    .from('contacts')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                if (existingContact && !fetchError) {
                    return existingContact;
                }
                // Crear nuevo contacto si no existe
                const { data: newContact, error: createError } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contact, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contact, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: contacts, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible - configurar SUPABASE_URL y SUPABASE_ANON_KEY');
            }
            try {
                // Intentar obtener conversación existente
                const { data: existingConversation, error: fetchError } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('*')
                    .eq('contact_phone', contactPhone)
                    .single();
                if (existingConversation && !fetchError) {
                    return existingConversation;
                }
                // Crear nueva conversación si no existe
                const { data: newConversation, error: createError } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
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
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return null;
            }
            try {
                const { data: conversation, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                const { data: conversations, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
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
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return false;
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: message, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .insert({
                    conversation_id: data.conversationId,
                    sender_type: data.senderType,
                    content: data.content,
                    message_type: data.messageType || 'text',
                    whatsapp_message_id: data.whatsappMessageId,
                    client_id: data.clientId, // NUEVO: Agregar client_id
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
                    try {
                        // Intentar usar la función RPC si existe
                        const { error: incrementError } = yield supabase_1.supabaseAdmin.rpc('increment_unread_count', {
                            conversation_id: data.conversationId
                        });
                        if (incrementError) {
                            console.log('⚠️ Función RPC no disponible, usando método alternativo');
                            // Método alternativo: obtener el valor actual y sumar 1
                            const { data: currentConversation } = yield supabase_1.supabaseAdmin
                                .from('conversations')
                                .select('unread_count')
                                .eq('id', data.conversationId)
                                .single();
                            if (currentConversation) {
                                updateData.unread_count = (currentConversation.unread_count || 0) + 1;
                            }
                        }
                    }
                    catch (error) {
                        console.log('⚠️ Error con función RPC, usando método alternativo');
                        // Método alternativo: obtener el valor actual y sumar 1
                        const { data: currentConversation } = yield supabase_1.supabaseAdmin
                            .from('conversations')
                            .select('unread_count')
                            .eq('id', data.conversationId)
                            .single();
                        if (currentConversation) {
                            updateData.unread_count = (currentConversation.unread_count || 0) + 1;
                        }
                    }
                }
                const { error: updateError } = yield supabase_1.supabaseAdmin
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
     * Verificar si ya existe un mensaje con el mismo client_id en una conversación
     */
    checkMessageByClientId(conversationId, clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: message, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .eq('client_id', clientId)
                    .single();
                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error('❌ Error verificando mensaje por client_id:', error);
                    return null;
                }
                return message;
            }
            catch (error) {
                console.error('❌ Error en checkMessageByClientId:', error);
                return null;
            }
        });
    }
    /**
     * Obtener mensajes de conversación
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50) {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                console.log(`📨 [Supabase] Obteniendo mensajes para conversación: ${conversationId} (límite: ${limit})`);
                // OPTIMIZACIÓN: Usar índices específicos y consulta más eficiente
                const { data: messages, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .select('id, conversation_id, sender_type, content, message_type, whatsapp_message_id, client_id, is_read, metadata, created_at')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true }) // Ordenar por timestamp ascendente (más antiguo primero)
                    .limit(limit);
                if (error) {
                    console.error('❌ Error obteniendo mensajes:', error);
                    return [];
                }
                console.log(`📨 [Supabase] ${(messages === null || messages === void 0 ? void 0 : messages.length) || 0} mensajes obtenidos para ${conversationId}`);
                // DEBUG: Contar mensajes por tipo de remitente
                if (messages && messages.length > 0) {
                    const userMessages = messages.filter(m => m.sender_type === 'user').length;
                    const botMessages = messages.filter(m => m.sender_type === 'bot').length;
                    const agentMessages = messages.filter(m => m.sender_type === 'agent').length;
                    console.log(`📨 [Supabase] Desglose de mensajes: User=${userMessages}, Bot=${botMessages}, Agent=${agentMessages}`);
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { data: message, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return false;
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return false;
            }
            try {
                // Marcar todos los mensajes de la conversación como leídos
                const { error: messagesError } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .update({ is_read: true })
                    .eq('conversation_id', conversationId)
                    .eq('is_read', false);
                if (messagesError) {
                    console.error('❌ Error marcando mensajes como leídos:', messagesError);
                    return false;
                }
                // Resetear contador de mensajes no leídos
                const { error: conversationError } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return 0;
            }
            try {
                const cutoffDate = new Date();
                cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
                const { error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return {
                    totalConversations: 0,
                    totalMessages: 0,
                    totalOrders: 0,
                    activeConversations: 0
                };
            }
            try {
                // Obtener estadísticas de conversaciones
                const { count: totalConversations } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('*', { count: 'exact', head: true });
                const { count: activeConversations } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active');
                // Obtener estadísticas de mensajes
                const { count: totalMessages } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .select('*', { count: 'exact', head: true });
                // Obtener estadísticas de órdenes (si existe la tabla)
                let totalOrders = 0;
                try {
                    const { count } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                const { data: conversations, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                // Ordenar por last_message_at si existe, sino por updated_at
                const { data: conversations, error } = yield supabase_1.supabaseAdmin
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
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                let query = supabase_1.supabaseAdmin
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
    /**
     * Obtener modo takeover de conversación
     */
    getConversationTakeoverMode(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return null;
            }
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('takeover_mode')
                    .eq('id', conversationId)
                    .single();
                if (error) {
                    console.error('Error obteniendo takeover_mode:', error);
                    return null;
                }
                return (data === null || data === void 0 ? void 0 : data.takeover_mode) || 'spectator';
            }
            catch (error) {
                console.error('Error en getConversationTakeoverMode:', error);
                return null;
            }
        });
    }
    /**
     * Establecer modo takeover de conversación
     */
    setConversationTakeoverMode(conversationId, mode, agentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                const updateData = {
                    takeover_mode: mode,
                    updated_at: new Date().toISOString()
                };
                // Si es takeover, asignar al agente
                if (mode === 'takeover' && agentId) {
                    updateData.assigned_agent_id = agentId;
                    updateData.ai_mode = 'inactive';
                }
                else if (mode === 'spectator') {
                    // En modo espectador, mantener ai_mode activo pero sin agente asignado
                    updateData.assigned_agent_id = null;
                    updateData.ai_mode = 'active';
                }
                else if (mode === 'ai_only') {
                    // En modo solo AI, desasignar agente y mantener AI activo
                    updateData.assigned_agent_id = null;
                    updateData.ai_mode = 'active';
                }
                const { error } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversationId);
                if (error) {
                    console.error('Error actualizando takeover_mode:', error);
                    return { success: false, error: error.message };
                }
                // Log del cambio
                console.log(`✅ Takeover mode actualizado: ${conversationId} -> ${mode} ${agentId ? `(agente: ${agentId})` : ''} ${reason ? `(razón: ${reason})` : ''}`);
                return { success: true };
            }
            catch (error) {
                console.error('Error en setConversationTakeoverMode:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtener conversaciones en modo espectador (que pueden ser tomadas)
     */
    getSpectatorConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('*')
                    .eq('takeover_mode', 'spectator')
                    .eq('status', 'active')
                    .order('last_message_at', { ascending: false });
                if (error) {
                    console.error('Error obteniendo conversaciones en espectador:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('Error en getSpectatorConversations:', error);
                return [];
            }
        });
    }
    /**
     * Obtener conversaciones en takeover (controladas por agentes)
     */
    getTakeoverConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return [];
            }
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('conversations')
                    .select('*')
                    .eq('takeover_mode', 'takeover')
                    .eq('status', 'active')
                    .order('last_message_at', { ascending: false });
                if (error) {
                    console.error('Error obteniendo conversaciones en takeover:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('Error en getTakeoverConversations:', error);
                return [];
            }
        });
    }
    /**
     * Verificar si una conversación puede ser procesada por el chatbot
     */
    canChatbotProcessMessage(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                // TEMPORAL: Permitir procesamiento si Supabase no está disponible
                console.log('⚠️ Supabase no disponible, permitiendo procesamiento de chatbot por defecto');
                return true;
            }
            try {
                const mode = yield this.getConversationTakeoverMode(conversationId);
                // El chatbot puede procesar solo si está en modo 'spectator' o 'ai_only'
                // TEMPORAL: Si no se puede obtener el modo, permitir procesamiento
                if (mode === null) {
                    console.log('⚠️ No se pudo obtener takeover_mode, permitiendo procesamiento por defecto');
                    return true;
                }
                return mode === 'spectator' || mode === 'ai_only';
            }
            catch (error) {
                console.error('Error verificando si chatbot puede procesar:', error);
                // TEMPORAL: En caso de error, permitir procesamiento
                console.log('⚠️ Error verificando takeover_mode, permitiendo procesamiento por defecto');
                return true;
            }
        });
    }
    /**
     * Ejecutar migración para agregar campo postal_code a contacts
     */
    addPostalCodeToContacts() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                return { success: false, error: '❌ Supabase no disponible' };
            }
            try {
                console.log('🔄 Ejecutando migración: agregando postal_code a contacts...');
                // Agregar columna postal_code si no existe
                const { error: alterError } = yield supabase_1.supabaseAdmin.rpc('exec_sql', {
                    sql_query: `
          ALTER TABLE contacts 
          ADD COLUMN IF NOT EXISTS postal_code TEXT;
        `
                });
                if (alterError) {
                    console.error('❌ Error agregando columna postal_code:', alterError);
                    return { success: false, error: alterError.message };
                }
                console.log('✅ Migración completada: postal_code agregado a contacts');
                return { success: true };
            }
            catch (error) {
                console.error('❌ Error en migración postal_code:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
            }
        });
    }
    /**
     * Actualizar contacto con código postal
     */
    updateContactWithPostalCode(contactId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                throw new Error('❌ Supabase no disponible');
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
                    .from('contacts')
                    .update(Object.assign(Object.assign({}, data), { updated_at: new Date().toISOString() }))
                    .eq('id', contactId);
                if (error) {
                    console.error('❌ Error actualizando contacto:', error);
                    return false;
                }
                console.log(`✅ Contacto ${contactId} actualizado con código postal`);
                return true;
            }
            catch (error) {
                console.error('❌ Error en updateContactWithPostalCode:', error);
                return false;
            }
        });
    }
    // ===== NUEVOS MÉTODOS PARA PERSISTENCIA =====
    /**
     * Actualizar estado de mensaje
     */
    updateMessageStatus(messageId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [PERSISTENCE] Supabase no disponible');
                return false;
            }
            try {
                const updateData = {
                    status: status,
                    updated_at: new Date().toISOString()
                };
                // Actualizar timestamps específicos según el estado
                if (status === 'sent') {
                    updateData.sent_at = new Date().toISOString();
                }
                else if (status === 'delivered') {
                    updateData.delivered_at = new Date().toISOString();
                }
                else if (status === 'read') {
                    updateData.read_at = new Date().toISOString();
                }
                else if (status === 'failed') {
                    updateData.last_retry_at = new Date().toISOString();
                }
                const { error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .update(updateData)
                    .eq('id', messageId);
                if (error) {
                    console.error('❌ [PERSISTENCE] Error actualizando estado de mensaje:', error);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ [PERSISTENCE] Error en updateMessageStatus:', error);
                return false;
            }
        });
    }
    /**
     * Actualizar mensaje con WhatsApp Message ID
     */
    updateMessageWithWhatsAppId(messageId, whatsappMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [PERSISTENCE] Supabase no disponible');
                return false;
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .update({
                    whatsapp_message_id: whatsappMessageId,
                    status: 'sent',
                    updated_at: new Date().toISOString()
                })
                    .eq('id', messageId);
                if (error) {
                    console.error('❌ [PERSISTENCE] Error actualizando WhatsApp Message ID:', error);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ [PERSISTENCE] Error en updateMessageWithWhatsAppId:', error);
                return false;
            }
        });
    }
    /**
     * Obtener mensajes fallidos para retry
     */
    getFailedMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [PERSISTENCE] Supabase no disponible');
                return [];
            }
            try {
                // Usar el índice parcial para mensajes fallidos
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .select('*')
                    .eq('status', 'failed')
                    .lt('retry_count', 3) // Solo mensajes con menos de 3 intentos
                    .order('created_at', { ascending: true })
                    .limit(50); // Reducir límite para mejor performance
                if (error) {
                    console.error('❌ [PERSISTENCE] Error obteniendo mensajes fallidos:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('❌ [PERSISTENCE] Error en getFailedMessages:', error);
                return [];
            }
        });
    }
    /**
     * Incrementar contador de retry para un mensaje
     */
    incrementRetryCount(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [PERSISTENCE] Supabase no disponible');
                return false;
            }
            try {
                const { error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .update({
                    retry_count: supabase_1.supabaseAdmin.rpc('increment_retry_count', { message_id: messageId }),
                    last_retry_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .eq('id', messageId);
                if (error) {
                    console.error('❌ [PERSISTENCE] Error incrementando retry count:', error);
                    return false;
                }
                return true;
            }
            catch (error) {
                console.error('❌ [PERSISTENCE] Error en incrementRetryCount:', error);
                return false;
            }
        });
    }
    /**
     * Limpiar mensajes temporales antiguos
     */
    cleanupTemporaryMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [PERSISTENCE] Supabase no disponible');
                return 0;
            }
            try {
                // Eliminar mensajes temporales más antiguos de 1 hora
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .delete()
                    .like('whatsapp_message_id', 'temp_%')
                    .lt('created_at', oneHourAgo)
                    .select('id');
                if (error) {
                    console.error('❌ [PERSISTENCE] Error limpiando mensajes temporales:', error);
                    return 0;
                }
                return (data === null || data === void 0 ? void 0 : data.length) || 0;
            }
            catch (error) {
                console.error('❌ [PERSISTENCE] Error en cleanupTemporaryMessages:', error);
                return 0;
            }
        });
    }
    // ===== MÉTODOS PARA FASE 3: RETRY SERVICE =====
    /**
     * Obtener mensaje por ID
     */
    getMessageById(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [RETRY] Supabase no disponible');
                return null;
            }
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .select('*')
                    .eq('id', messageId)
                    .single();
                if (error) {
                    console.error('❌ [RETRY] Error obteniendo mensaje por ID:', error);
                    return null;
                }
                return data;
            }
            catch (error) {
                console.error('❌ [RETRY] Error en getMessageById:', error);
                return null;
            }
        });
    }
    /**
     * Limpiar mensajes fallidos antiguos
     */
    cleanupOldFailedMessages(cutoffTime) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabaseAdmin) {
                console.error('❌ [RETRY] Supabase no disponible');
                return 0;
            }
            try {
                const { data, error } = yield supabase_1.supabaseAdmin
                    .from('messages')
                    .delete()
                    .eq('status', 'failed')
                    .lt('created_at', cutoffTime.toISOString())
                    .select('id');
                if (error) {
                    console.error('❌ [RETRY] Error limpiando mensajes fallidos antiguos:', error);
                    return 0;
                }
                return (data === null || data === void 0 ? void 0 : data.length) || 0;
            }
            catch (error) {
                console.error('❌ [RETRY] Error en cleanupOldFailedMessages:', error);
                return 0;
            }
        });
    }
}
exports.SupabaseDatabaseService = SupabaseDatabaseService;
// Instancia singleton
exports.supabaseDatabaseService = new SupabaseDatabaseService();
