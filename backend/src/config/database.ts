/**
 * Configuración de base de datos Supabase
 * Sistema de persistencia escalable para WhatsApp Business LLM
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './index';

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  connectionPoolSize: number;
  queryTimeout: number;
  retryAttempts: number;
  enableWAL: boolean;
}

export interface ConversationRecord {
  id: string;
  user_id: string;
  phone_number: string;
  point_of_sale_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata: any;
  function_called?: string;
  intent?: string;
  confidence_score?: number;
}

export interface UserProfileRecord {
  id: string;
  phone_number: string;
  preferred_language: string;
  communication_style: string;
  preferences: any;
  business_context: any;
  interactions_count: number;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMemoryRecord {
  id: string;
  conversation_id: string;
  short_term_memory: any;
  long_term_memory: any;
  working_memory: any;
  behavior_patterns: string[];
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  private supabase: SupabaseClient;
  private config: DatabaseConfig;
  private connectionPool: Map<string, any> = new Map();
  private isConnected: boolean = false;

  constructor() {
    const appConfig = getConfig();
    
    this.config = {
      supabaseUrl: appConfig.database.supabaseUrl,
      supabaseKey: appConfig.database.supabaseKey,
      connectionPoolSize: 10,
      queryTimeout: 30000,
      retryAttempts: 3,
      enableWAL: true
    };

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
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
  private async initializeConnection(): Promise<void> {
    try {
      console.log('[DatabaseService] Inicializando conexión a Supabase...');
      
      // Verificar conexión
      const { data, error } = await this.supabase
        .from('conversations')
        .select('count')
        .limit(1);

      if (error && error.code === '42P01') {
        // Tablas no existen, crearlas
        await this.createTables();
      } else if (error) {
        throw error;
      }

      this.isConnected = true;
      console.log('[DatabaseService] ✅ Conexión a Supabase establecida');
      
    } catch (error) {
      console.error('[DatabaseService] ❌ Error conectando a Supabase:', error);
      this.isConnected = false;
    }
  }

  /**
   * Crea las tablas necesarias en Supabase
   */
  private async createTables(): Promise<void> {
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
        const { error } = await this.supabase.rpc('execute_sql', { sql: schema });
        if (error) {
          console.error('[DatabaseService] Error creando tabla:', error);
        }
      } catch (error) {
        console.error('[DatabaseService] Error ejecutando schema:', error);
      }
    }

    console.log('[DatabaseService] ✅ Esquema de base de datos creado');
  }

  /**
   * Verifica si la base de datos está disponible
   */
  async isHealthy(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Ejecuta una consulta con retry automático
   */
  private async executeWithRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    attempts: number = this.config.retryAttempts
  ): Promise<{ data: T | null; error: any }> {
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await operation();
        
        if (!result.error) {
          return result;
        }
        
        if (i === attempts - 1) {
          return result;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        
      } catch (error) {
        if (i === attempts - 1) {
          return { data: null, error };
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    
    return { data: null, error: new Error('Max retry attempts reached') };
  }

  /**
   * CONVERSACIONES
   */
  
  async createConversation(conversation: Omit<ConversationRecord, 'created_at' | 'updated_at'>): Promise<ConversationRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('conversations')
        .insert(conversation)
        .select()
        .single();
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error creando conversación:', error);
      return null;
    }

    return data;
  }

  async getConversation(conversationId: string): Promise<ConversationRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error obteniendo conversación:', error);
      return null;
    }

    return data;
  }

  async updateConversation(conversationId: string, updates: Partial<ConversationRecord>): Promise<boolean> {
    const { error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error actualizando conversación:', error);
      return false;
    }

    return true;
  }

  /**
   * MENSAJES
   */
  
  async createMessage(message: Omit<MessageRecord, 'timestamp'>): Promise<MessageRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('messages')
        .insert({ ...message, timestamp: new Date().toISOString() })
        .select()
        .single();
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error creando mensaje:', error);
      return null;
    }

    return data;
  }

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<MessageRecord[]> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error obteniendo mensajes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * PERFILES DE USUARIO
   */
  
  async createOrUpdateUserProfile(profile: Omit<UserProfileRecord, 'created_at' | 'updated_at'>): Promise<UserProfileRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('user_profiles')
        .upsert({ 
          ...profile, 
          updated_at: new Date().toISOString() 
        })
        .select()
        .single();
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error creando/actualizando perfil:', error);
      return null;
    }

    return data;
  }

  async getUserProfile(phoneNumber: string): Promise<UserProfileRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();
      return result;
    });

    if (error && error.code !== 'PGRST116') {
      console.error('[DatabaseService] Error obteniendo perfil:', error);
    }

    return data;
  }

  /**
   * MEMORIA CONVERSACIONAL
   */
  
  async createOrUpdateConversationMemory(memory: Omit<ConversationMemoryRecord, 'created_at' | 'updated_at'>): Promise<ConversationMemoryRecord | null> {
        const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('conversation_memory')
        .upsert({
          ...memory,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      return result;
    });

    if (error) {
      console.error('[DatabaseService] Error creando/actualizando memoria:', error);
      return null;
    }

    return data;
  }

  async getConversationMemory(conversationId: string): Promise<ConversationMemoryRecord | null> {
    const { data, error } = await this.executeWithRetry(async () => {
      const result = await this.supabase
        .from('conversation_memory')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();
      return result;
    });

    if (error && error.code !== 'PGRST116') {
      console.error('[DatabaseService] Error obteniendo memoria:', error);
    }

    return data;
  }

  /**
   * UTILIDADES Y MANTENIMIENTO
   */
  
  async cleanupOldData(daysOld: number = 30): Promise<{ deletedConversations: number; deletedMessages: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    try {
      // Eliminar conversaciones antiguas (los mensajes se eliminan por cascade)
      const { data: deletedConversations, error: convError } = await this.supabase
        .from('conversations')
        .delete()
        .lt('updated_at', cutoffDate.toISOString())
        .select('id');

      if (convError) {
        console.error('[DatabaseService] Error limpiando conversaciones:', convError);
      }

      console.log(`[DatabaseService] Limpieza completada: ${deletedConversations?.length || 0} conversaciones eliminadas`);

      return {
        deletedConversations: deletedConversations?.length || 0,
        deletedMessages: 0 // Se eliminan por cascade
      };
      
    } catch (error) {
      console.error('[DatabaseService] Error en limpieza:', error);
      return { deletedConversations: 0, deletedMessages: 0 };
    }
  }

  async getStats(): Promise<any> {
    try {
      const [conversations, messages, profiles, memory] = await Promise.all([
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
    } catch (error) {
      console.error('[DatabaseService] Error obteniendo estadísticas:', error);
      return { isConnected: false };
    }
  }
}

// Exportar instancia singleton
export const databaseService = new DatabaseService(); 