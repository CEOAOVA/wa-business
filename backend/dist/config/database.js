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
                // Tabla de conversaciones
                `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        point_of_sale_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
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
                // Índices para performance
                `CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_pos ON conversations(point_of_sale_id);`,
                `CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);`,
                `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`,
                `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`,
                `CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);`,
                `CREATE INDEX IF NOT EXISTS idx_memory_conversation ON conversation_memory(conversation_id);`
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
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [conversations, messages, profiles, memory] = yield Promise.all([
                    this.supabase.from('conversations').select('count'),
                    this.supabase.from('messages').select('count'),
                    this.supabase.from('user_profiles').select('count'),
                    this.supabase.from('conversation_memory').select('count')
                ]);
                return {
                    isConnected: this.isConnected,
                    conversations: conversations.count || 0,
                    messages: messages.count || 0,
                    userProfiles: profiles.count || 0,
                    conversationMemory: memory.count || 0
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
