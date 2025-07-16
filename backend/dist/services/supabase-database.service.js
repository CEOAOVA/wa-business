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
        this.isEnabled = !!supabase_1.supabase && process.env.USE_SUPABASE === 'true';
        if (this.isEnabled) {
            console.log('🚀 Supabase Database Service activado');
        }
        else {
            console.log('⚠️ Supabase Database Service deshabilitado - usando simulación');
        }
    }
    /**
     * Verificar si Supabase está habilitado
     */
    isSupabaseEnabled() {
        return this.isEnabled;
    }
    // ===== GESTIÓN DE CONVERSACIONES =====
    /**
     * Obtener o crear conversación por teléfono del contacto
     */
    getOrCreateConversation(contactPhone) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: getOrCreateConversation para', contactPhone);
                // Retornar conversación simulada para desarrollo
                return {
                    id: `sim-conv-${contactPhone.replace(/\D/g, '').slice(-10)}`,
                    contact_phone: contactPhone,
                    status: 'active',
                    ai_mode: 'active',
                    assigned_agent_id: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
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
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .select()
                    .single();
                if (createError) {
                    console.error('❌ Error creando conversación en Supabase:', createError);
                    return null;
                }
                console.log(`✅ Nueva conversación creada en Supabase: ${newConversation.id} para ${contactPhone}`);
                return newConversation;
            }
            catch (error) {
                console.error('❌ Error en getOrCreateConversation:', error);
                return null;
            }
        });
    }
    /**
     * Actualizar el modo AI de una conversación
     */
    setConversationAIMode(conversationId, mode, agentId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: setConversationAIMode ${conversationId} -> ${mode}`);
                return { success: true };
            }
            try {
                // Obtener el modo actual antes del cambio
                const { data: currentConversation } = yield supabase_1.supabase
                    .from('conversations')
                    .select('ai_mode')
                    .eq('id', conversationId)
                    .single();
                // Actualizar la conversación
                const { error: updateError } = yield supabase_1.supabase
                    .from('conversations')
                    .update({
                    ai_mode: mode,
                    assigned_agent_id: agentId,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', conversationId);
                if (updateError) {
                    console.error('❌ Error actualizando modo AI:', updateError);
                    return { success: false, error: updateError.message };
                }
                // Registrar el cambio en el historial
                if (currentConversation) {
                    yield supabase_1.supabase
                        .from('conversation_mode_history')
                        .insert({
                        conversation_id: conversationId,
                        changed_by_agent_id: agentId,
                        previous_mode: currentConversation.ai_mode,
                        new_mode: mode,
                        reason: reason,
                        changed_at: new Date().toISOString()
                    });
                }
                console.log(`✅ Modo AI actualizado: ${conversationId} -> ${mode}`);
                return { success: true };
            }
            catch (error) {
                console.error('❌ Error en setConversationAIMode:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtener el modo AI de una conversación
     */
    getConversationAIMode(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: getConversationAIMode ${conversationId} -> active`);
                return 'active';
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('conversations')
                    .select('ai_mode')
                    .eq('id', conversationId)
                    .single();
                if (error || !data) {
                    console.error('❌ Error obteniendo modo AI:', error);
                    return null;
                }
                return data.ai_mode;
            }
            catch (error) {
                console.error('❌ Error en getConversationAIMode:', error);
                return null;
            }
        });
    }
    // ===== GESTIÓN DE MENSAJES =====
    /**
     * Crear un nuevo mensaje
     */
    createMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: createMessage para conversación', data.conversationId);
                // Retornar mensaje simulado para desarrollo
                return {
                    id: parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
                    conversation_id: data.conversationId,
                    sender_type: data.senderType,
                    content: data.content,
                    message_type: data.messageType || 'text',
                    whatsapp_message_id: data.whatsappMessageId,
                    metadata: data.metadata,
                    created_at: new Date().toISOString()
                };
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
                    metadata: data.metadata,
                    created_at: new Date().toISOString()
                })
                    .select()
                    .single();
                if (error) {
                    console.error('❌ Error creando mensaje en Supabase:', error);
                    return null;
                }
                // Actualizar timestamp de la conversación
                yield supabase_1.supabase
                    .from('conversations')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', data.conversationId);
                console.log(`✅ Mensaje creado en Supabase: ${message.id}`);
                return message;
            }
            catch (error) {
                console.error('❌ Error en createMessage:', error);
                return null;
            }
        });
    }
    /**
     * Obtener mensajes de una conversación
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50) {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: getConversationMessages para ${conversationId}`);
                return [];
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(limit);
                if (error) {
                    console.error('❌ Error obteniendo mensajes:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('❌ Error en getConversationMessages:', error);
                return [];
            }
        });
    }
    // ===== GESTIÓN DE RESÚMENES =====
    /**
     * Guardar o actualizar resumen de conversación
     */
    upsertConversationSummary(conversationId_1, summaryData_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, summaryData, generatedBy = 'gemini-2.5-flash') {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: upsertConversationSummary para ${conversationId}`);
                return null;
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('conversation_summaries')
                    .upsert({
                    conversation_id: conversationId,
                    summary_data: summaryData,
                    generated_by: generatedBy,
                    created_at: new Date().toISOString()
                })
                    .select()
                    .single();
                if (error) {
                    console.error('❌ Error guardando resumen:', error);
                    return null;
                }
                console.log(`✅ Resumen guardado para conversación: ${conversationId}`);
                return data;
            }
            catch (error) {
                console.error('❌ Error en upsertConversationSummary:', error);
                return null;
            }
        });
    }
    /**
     * Obtener resumen de conversación
     */
    getConversationSummary(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: getConversationSummary para ${conversationId}`);
                return null;
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('conversation_summaries')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .single();
                if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
                    console.error('❌ Error obteniendo resumen:', error);
                    return null;
                }
                return data;
            }
            catch (error) {
                console.error('❌ Error en getConversationSummary:', error);
                return null;
            }
        });
    }
    // ===== GESTIÓN DE PRODUCTOS (SIMULACIÓN ERP) =====
    /**
     * Buscar productos por término
     */
    searchProducts(searchTerm_1) {
        return __awaiter(this, arguments, void 0, function* (searchTerm, limit = 10) {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log(`📋 Simulación: searchProducts "${searchTerm}"`);
                // Retornar productos simulados
                return [
                    {
                        id: '1',
                        sku: 'BRAKE-001',
                        name: 'Pastillas de freno Toyota',
                        description: 'Pastillas de freno compatibles con Toyota Corolla',
                        price: 850.00,
                        stock: 15,
                        metadata: { brand: 'Toyota', compatibility: ['Corolla', 'Camry'] }
                    }
                ];
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('products')
                    .select('*')
                    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
                    .gt('stock', 0)
                    .limit(limit);
                if (error) {
                    console.error('❌ Error buscando productos:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('❌ Error en searchProducts:', error);
                return [];
            }
        });
    }
    // ===== GESTIÓN DE PEDIDOS =====
    /**
     * Crear un nuevo pedido
     */
    createOrder(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: createOrder');
                return null;
            }
            try {
                const { data: order, error } = yield supabase_1.supabase
                    .from('orders')
                    .insert({
                    conversation_id: data.conversationId,
                    agent_id: data.agentId,
                    status: data.status || 'pending',
                    order_details: data.orderDetails,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                    .select()
                    .single();
                if (error) {
                    console.error('❌ Error creando pedido:', error);
                    return null;
                }
                console.log(`✅ Pedido creado: ${order.id}`);
                return order;
            }
            catch (error) {
                console.error('❌ Error en createOrder:', error);
                return null;
            }
        });
    }
    // ===== ESTADÍSTICAS =====
    /**
     * Obtener estadísticas básicas
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: getStats');
                return {
                    totalConversations: 5,
                    totalMessages: 47,
                    totalOrders: 3,
                    activeConversations: 2
                };
            }
            try {
                const [conversationsResult, messagesResult, ordersResult, activeConversationsResult] = yield Promise.all([
                    supabase_1.supabase.from('conversations').select('*', { count: 'exact', head: true }),
                    supabase_1.supabase.from('messages').select('*', { count: 'exact', head: true }),
                    supabase_1.supabase.from('orders').select('*', { count: 'exact', head: true }),
                    supabase_1.supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('status', 'active')
                ]);
                return {
                    totalConversations: conversationsResult.count || 0,
                    totalMessages: messagesResult.count || 0,
                    totalOrders: ordersResult.count || 0,
                    activeConversations: activeConversationsResult.count || 0
                };
            }
            catch (error) {
                console.error('❌ Error obteniendo estadísticas:', error);
                return { totalConversations: 0, totalMessages: 0, totalOrders: 0, activeConversations: 0 };
            }
        });
    }
    // ===== MÉTODOS DE CONSULTA ADICIONALES =====
    /**
     * Obtener conversaciones activas
     */
    getActiveConversations() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: getActiveConversations');
                return [];
            }
            try {
                const { data, error } = yield supabase_1.supabase
                    .from('conversations')
                    .select('*')
                    .eq('status', 'active')
                    .order('updated_at', { ascending: false });
                if (error) {
                    console.error('❌ Error obteniendo conversaciones activas:', error);
                    return [];
                }
                return data || [];
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
            if (!this.isEnabled || !supabase_1.supabase) {
                console.log('📋 Simulación: searchConversations');
                return [];
            }
            try {
                let query = supabase_1.supabase.from('conversations').select('*');
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
                query = query.order('updated_at', { ascending: false });
                const { data, error } = yield query;
                if (error) {
                    console.error('❌ Error buscando conversaciones:', error);
                    return [];
                }
                return data || [];
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
