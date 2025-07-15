"use strict";
/**
 * Configuración de base de datos Supabase
 * Sistema de persistencia escalable para WhatsApp Business LLM
 */
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
const supabase_js_1 = require("@supabase/supabase-js");
const index_1 = require("./index");
class DatabaseService {
    constructor() {
        this.connectionPool = new Map();
        this.isConnected = false;
        // NUEVO: Caché en memoria para resúmenes (más barato que Redis)
        this.summaryCache = new Map();
        const appConfig = (0, index_1.getConfig)();
        this.config = {
            supabaseUrl: appConfig.database.supabaseUrl,
            supabaseKey: appConfig.database.supabaseKey,
            connectionPoolSize: 10,
            queryTimeout: 30000,
            retryAttempts: 3,
            enableWAL: true
        };
        this.supabase = (0, supabase_js_1.createClient)(this.config.supabaseUrl, this.config.supabaseKey, {
            auth: {
                persistSession: false
            },
            db: {
                schema: 'public'
            },
            global: {
                headers: {
                    'X-Client-Name': 'whatsapp-business-llm'
                }
            }
        });
        this.initializeConnection();
        // NUEVO: Limpiar caché expirado cada 10 minutos
        setInterval(() => this.cleanExpiredSummaryCache(), 10 * 60 * 1000);
    }
    /**
     * Inicializa la conexión y crea las tablas si no existen
     */
    initializeConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('[DatabaseService] Inicializando conexión a Supabase...');
                // Verificar conexión
                const { data, error } = yield this.supabase
                    .from('conversations')
                    .select('count')
                    .limit(1);
                if (error && error.code === '42P01') {
                    // Tablas no existen, crearlas
                    yield this.createTables();
                }
                else if (error) {
                    throw error;
                }
                this.isConnected = true;
                console.log('[DatabaseService] ✅ Conexión a Supabase establecida');
            }
            catch (error) {
                console.error('[DatabaseService] ❌ Error conectando a Supabase:', error);
                this.isConnected = false;
            }
        });
    }
    /**
     * Crea las tablas necesarias en Supabase
     */
    createTables() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[DatabaseService] Creando esquema de base de datos...');
            const tableSchemas = [
                // Tabla de conversaciones (ACTUALIZADA con ai_mode)
                `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        point_of_sale_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        ai_mode TEXT DEFAULT 'active' CHECK (ai_mode IN ('active', 'inactive')),
        assigned_agent_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );`,
                // Tabla de mensajes
                `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        function_called TEXT,
        intent TEXT,
        confidence_score REAL
      );`,
                // Tabla de perfiles de usuario
                `CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE NOT NULL,
        preferred_language TEXT DEFAULT 'es',
        communication_style TEXT DEFAULT 'casual',
        preferences JSONB DEFAULT '{}'::jsonb,
        business_context JSONB DEFAULT '{}'::jsonb,
        interactions_count INTEGER DEFAULT 0,
        last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
                // Tabla de memoria conversacional
                `CREATE TABLE IF NOT EXISTS conversation_memory (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        short_term_memory JSONB DEFAULT '{}'::jsonb,
        long_term_memory JSONB DEFAULT '{}'::jsonb,
        working_memory JSONB DEFAULT '{}'::jsonb,
        behavior_patterns TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
                // NUEVA: Tabla de resúmenes de conversación
                `CREATE TABLE IF NOT EXISTS conversation_summaries (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        summary_text TEXT NOT NULL,
        key_points JSONB DEFAULT '{}'::jsonb,
        last_message_count INTEGER NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
      );`,
                // Índices para performance
                `CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_pos ON conversations(point_of_sale_id);`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_ai_mode ON conversations(ai_mode);`, // NUEVO
                `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`,
                `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`,
                `CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);`,
                `CREATE INDEX IF NOT EXISTS idx_memory_conversation ON conversation_memory(conversation_id);`,
                `CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id);`, // NUEVO
                `CREATE INDEX IF NOT EXISTS idx_summaries_expires ON conversation_summaries(expires_at);` // NUEVO
            ];
            for (const schema of tableSchemas) {
                try {
                    const { error } = yield this.supabase.rpc('execute_sql', { sql: schema });
                    if (error) {
                        console.error('[DatabaseService] Error creando tabla:', error);
                    }
                }
                catch (error) {
                    console.error('[DatabaseService] Error ejecutando schema:', error);
                }
            }
            console.log('[DatabaseService] ✅ Esquema de base de datos creado');
        });
    }
    /**
     * Verifica si la base de datos está disponible
     */
    isHealthy() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield this.supabase
                    .from('conversations')
                    .select('count')
                    .limit(1);
                return !error;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Ejecuta una consulta con retry automático
     */
    executeWithRetry(operation_1) {
        return __awaiter(this, arguments, void 0, function* (operation, attempts = this.config.retryAttempts) {
            for (let i = 0; i < attempts; i++) {
                try {
                    const result = yield operation();
                    if (!result.error) {
                        return result;
                    }
                    if (i === attempts - 1) {
                        return result;
                    }
                    // Esperar antes del siguiente intento
                    yield new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
                catch (error) {
                    if (i === attempts - 1) {
                        return { data: null, error };
                    }
                    yield new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
            return { data: null, error: new Error('Max retry attempts reached') };
        });
    }
    /**
     * CONVERSACIONES
     */
    createConversation(conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('conversations')
                    .insert(conversation)
                    .select()
                    .single();
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error creando conversación:', error);
                return null;
            }
            return data;
        });
    }
    getConversation(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .single();
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error obteniendo conversación:', error);
                return null;
            }
            return data;
        });
    }
    updateConversation(conversationId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('conversations')
                    .update(Object.assign(Object.assign({}, updates), { updated_at: new Date().toISOString() }))
                    .eq('id', conversationId);
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error actualizando conversación:', error);
                return false;
            }
            return true;
        });
    }
    /**
     * MENSAJES
     */
    createMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('messages')
                    .insert(Object.assign(Object.assign({}, message), { timestamp: new Date().toISOString() }))
                    .select()
                    .single();
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error creando mensaje:', error);
                return null;
            }
            return data;
        });
    }
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50) {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('timestamp', { ascending: false })
                    .limit(limit);
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error obteniendo mensajes:', error);
                return [];
            }
            return data || [];
        });
    }
    /**
     * PERFILES DE USUARIO
     */
    createOrUpdateUserProfile(profile) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('user_profiles')
                    .upsert(Object.assign(Object.assign({}, profile), { updated_at: new Date().toISOString() }))
                    .select()
                    .single();
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error creando/actualizando perfil:', error);
                return null;
            }
            return data;
        });
    }
    getUserProfile(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('phone_number', phoneNumber)
                    .single();
                return result;
            }));
            if (error && error.code !== 'PGRST116') {
                console.error('[DatabaseService] Error obteniendo perfil:', error);
            }
            return data;
        });
    }
    /**
     * MEMORIA CONVERSACIONAL
     */
    createOrUpdateConversationMemory(memory) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('conversation_memory')
                    .upsert(Object.assign(Object.assign({}, memory), { updated_at: new Date().toISOString() }))
                    .select()
                    .single();
                return result;
            }));
            if (error) {
                console.error('[DatabaseService] Error creando/actualizando memoria:', error);
                return null;
            }
            return data;
        });
    }
    getConversationMemory(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield this.executeWithRetry(() => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.supabase
                    .from('conversation_memory')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .single();
                return result;
            }));
            if (error && error.code !== 'PGRST116') {
                console.error('[DatabaseService] Error obteniendo memoria:', error);
            }
            return data;
        });
    }
    /**
     * UTILIDADES Y MANTENIMIENTO
     */
    cleanupOldData() {
        return __awaiter(this, arguments, void 0, function* (daysOld = 30) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            try {
                // Eliminar conversaciones antiguas (los mensajes se eliminan por cascade)
                const { data: deletedConversations, error: convError } = yield this.supabase
                    .from('conversations')
                    .delete()
                    .lt('updated_at', cutoffDate.toISOString())
                    .select('id');
                if (convError) {
                    console.error('[DatabaseService] Error limpiando conversaciones:', convError);
                }
                console.log(`[DatabaseService] Limpieza completada: ${(deletedConversations === null || deletedConversations === void 0 ? void 0 : deletedConversations.length) || 0} conversaciones eliminadas`);
                return {
                    deletedConversations: (deletedConversations === null || deletedConversations === void 0 ? void 0 : deletedConversations.length) || 0,
                    deletedMessages: 0 // Se eliminan por cascade
                };
            }
            catch (error) {
                console.error('[DatabaseService] Error en limpieza:', error);
                return { deletedConversations: 0, deletedMessages: 0 };
            }
        });
    }
    // NUEVOS MÉTODOS PARA TAKEOVER
    /**
     * Cambia el modo de IA para una conversación (takeover)
     */
    setConversationAIMode(conversationId, mode, agentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateData = {
                    ai_mode: mode,
                    updated_at: new Date().toISOString()
                };
                if (mode === 'inactive' && agentId) {
                    updateData.assigned_agent_id = agentId;
                }
                else if (mode === 'active') {
                    updateData.assigned_agent_id = null;
                }
                const { error } = yield this.supabase
                    .from('conversations')
                    .update(updateData)
                    .eq('id', conversationId);
                if (error) {
                    console.error('[DatabaseService] Error actualizando modo IA:', error);
                    return { success: false, error: error.message };
                }
                console.log(`[DatabaseService] ✅ Modo IA actualizado: ${conversationId} -> ${mode}`);
                return { success: true };
            }
            catch (error) {
                console.error('[DatabaseService] Error en setConversationAIMode:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtiene el modo de IA para una conversación
     */
    getConversationAIMode(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield this.supabase
                    .from('conversations')
                    .select('ai_mode, assigned_agent_id')
                    .eq('id', conversationId)
                    .single();
                if (error || !data) {
                    console.error('[DatabaseService] Error obteniendo modo IA:', error);
                    return null;
                }
                return {
                    aiMode: data.ai_mode,
                    assignedAgentId: data.assigned_agent_id
                };
            }
            catch (error) {
                console.error('[DatabaseService] Error en getConversationAIMode:', error);
                return null;
            }
        });
    }
    // NUEVOS MÉTODOS PARA RESÚMENES
    /**
     * Obtiene un resumen de conversación desde caché o base de datos
     */
    getConversationSummary(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Verificar caché en memoria primero
                const cached = this.summaryCache.get(conversationId);
                if (cached && cached.expiresAt > new Date()) {
                    console.log(`[DatabaseService] ✅ Resumen desde caché: ${conversationId}`);
                    return {
                        summary: cached.summary,
                        keyPoints: cached.keyPoints,
                        isFromCache: true
                    };
                }
                // 2. Verificar base de datos
                const { data, error } = yield this.supabase
                    .from('conversation_summaries')
                    .select('summary_text, key_points, last_message_count')
                    .eq('conversation_id', conversationId)
                    .gt('expires_at', new Date().toISOString())
                    .order('generated_at', { ascending: false })
                    .limit(1)
                    .single();
                if (!error && data) {
                    // Agregar al caché en memoria
                    this.summaryCache.set(conversationId, {
                        summary: data.summary_text,
                        keyPoints: data.key_points,
                        messageCount: data.last_message_count,
                        cachedAt: new Date(),
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
                    });
                    console.log(`[DatabaseService] ✅ Resumen desde BD: ${conversationId}`);
                    return {
                        summary: data.summary_text,
                        keyPoints: data.key_points,
                        isFromCache: false
                    };
                }
                return null;
            }
            catch (error) {
                console.error('[DatabaseService] Error obteniendo resumen:', error);
                return null;
            }
        });
    }
    /**
     * Guarda un nuevo resumen de conversación
     */
    saveConversationSummary(conversationId, summary, keyPoints, messageCount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const summaryData = {
                    id: `summary_${conversationId}_${Date.now()}`,
                    conversation_id: conversationId,
                    summary_text: summary,
                    key_points: keyPoints,
                    last_message_count: messageCount,
                    generated_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
                };
                const { error } = yield this.supabase
                    .from('conversation_summaries')
                    .insert(summaryData);
                if (error) {
                    console.error('[DatabaseService] Error guardando resumen:', error);
                    return { success: false, error: error.message };
                }
                // Actualizar caché en memoria
                this.summaryCache.set(conversationId, {
                    summary,
                    keyPoints,
                    messageCount,
                    cachedAt: new Date(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                });
                console.log(`[DatabaseService] ✅ Resumen guardado: ${conversationId}`);
                return { success: true };
            }
            catch (error) {
                console.error('[DatabaseService] Error en saveConversationSummary:', error);
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * Obtiene el historial completo de mensajes para una conversación
     */
    getConversationHistory(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data, error } = yield this.supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('timestamp', { ascending: true });
                if (error) {
                    console.error('[DatabaseService] Error obteniendo historial:', error);
                    return [];
                }
                return data || [];
            }
            catch (error) {
                console.error('[DatabaseService] Error en getConversationHistory:', error);
                return [];
            }
        });
    }
    /**
     * Limpia resúmenes expirados del caché en memoria
     */
    cleanExpiredSummaryCache() {
        const now = new Date();
        const expiredKeys = [];
        for (const [key, cached] of this.summaryCache.entries()) {
            if (cached.expiresAt <= now) {
                expiredKeys.push(key);
            }
        }
        expiredKeys.forEach(key => this.summaryCache.delete(key));
        if (expiredKeys.length > 0) {
            console.log(`[DatabaseService] 🧹 Limpieza de caché: ${expiredKeys.length} resúmenes expirados eliminados`);
        }
    }
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [conversations, messages, profiles, memory, summaries] = yield Promise.all([
                    this.supabase.from('conversations').select('count'),
                    this.supabase.from('messages').select('count'),
                    this.supabase.from('user_profiles').select('count'),
                    this.supabase.from('conversation_memory').select('count'),
                    this.supabase.from('conversation_summaries').select('count') // NUEVO
                ]);
                return {
                    isConnected: this.isConnected,
                    conversations: conversations.count || 0,
                    messages: messages.count || 0,
                    userProfiles: profiles.count || 0,
                    conversationMemory: memory.count || 0,
                    conversationSummaries: summaries.count || 0, // NUEVO
                    cacheStats: {
                        summariesInCache: this.summaryCache.size,
                        cacheHitRate: 'N/A' // Se puede calcular con métricas adicionales
                    }
                };
            }
            catch (error) {
                console.error('[DatabaseService] Error obteniendo estadísticas:', error);
                return { isConnected: false };
            }
        });
    }
}
exports.DatabaseService = DatabaseService;
// Exportar instancia singleton
exports.databaseService = new DatabaseService();
