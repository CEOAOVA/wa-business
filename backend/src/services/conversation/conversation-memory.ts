/**
 * Sistema de memoria conversacional avanzado
 * Rastrea contexto, preferencias del usuario y historial para respuestas inteligentes
 */

export interface UserProfile {
  userId: string;
  phoneNumber: string;
  preferredLanguage: 'es' | 'en';
  timeZone: string;
  interactions: {
    totalMessages: number;
    lastInteraction: Date;
    commonTopics: string[];
    satisfactionScore?: number;
  };
  preferences: {
    preferredBrands: string[];
    vehicleInfo?: {
      brand: string;
      model: string;
      year: number;
      vin?: string;
    };
    communicationStyle: 'formal' | 'casual' | 'technical';
    priceRange?: {
      min: number;
      max: number;
    };
  };
  businessContext: {
    pointOfSaleId: string;
    isVipCustomer: boolean;
    creditLimit?: number;
    lastPurchase?: Date;
  };
}

export interface ConversationMemory {
  conversationId: string;
  shortTermMemory: {
    currentTopic: string;
    recentQueries: string[];
    contextualEntities: Map<string, any>;
    temporalReferences: Map<string, Date>;
  };
  longTermMemory: {
    userProfile: UserProfile;
    previousConversations: ConversationSummary[];
    learnedPreferences: Map<string, any>;
    behaviorPatterns: string[];
  };
  workingMemory: {
    currentIntent: string;
    activeFunction?: string;
    pendingActions: string[];
    contextStack: any[];
  };
  metadata: {
    created: Date;
    lastUpdated: Date;
    conversationLength: number;
    averageResponseTime: number;
  };
}

export interface ConversationSummary {
  conversationId: string;
  date: Date;
  duration: number;
  messagesCount: number;
  mainTopics: string[];
  outcome: 'completed' | 'abandoned' | 'escalated';
  satisfaction?: number;
  keyInsights: string[];
}

export class ConversationMemoryManager {
  private memoryStore = new Map<string, ConversationMemory>();
  private userProfiles = new Map<string, UserProfile>();
  private conversationSummaries = new Map<string, ConversationSummary>();

  /**
   * Inicializa la memoria para una nueva conversación
   */
  initializeMemory(
    conversationId: string,
    userId: string,
    phoneNumber: string,
    pointOfSaleId: string
  ): ConversationMemory {
    // Buscar o crear perfil de usuario
    let userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      userProfile = this.createUserProfile(userId, phoneNumber, pointOfSaleId);
      this.userProfiles.set(userId, userProfile);
    }

    // Crear memoria conversacional
    const memory: ConversationMemory = {
      conversationId,
      shortTermMemory: {
        currentTopic: '',
        recentQueries: [],
        contextualEntities: new Map(),
        temporalReferences: new Map()
      },
      longTermMemory: {
        userProfile,
        previousConversations: this.getUserConversationHistory(userId),
        learnedPreferences: new Map(),
        behaviorPatterns: []
      },
      workingMemory: {
        currentIntent: '',
        activeFunction: undefined,
        pendingActions: [],
        contextStack: []
      },
      metadata: {
        created: new Date(),
        lastUpdated: new Date(),
        conversationLength: 0,
        averageResponseTime: 0
      }
    };

    this.memoryStore.set(conversationId, memory);
    console.log(`[ConversationMemory] Memoria inicializada para conversación ${conversationId}`);
    
    return memory;
  }

  /**
   * Crea un nuevo perfil de usuario
   */
  private createUserProfile(userId: string, phoneNumber: string, pointOfSaleId: string): UserProfile {
    return {
      userId,
      phoneNumber,
      preferredLanguage: 'es',
      timeZone: 'America/Mexico_City',
      interactions: {
        totalMessages: 0,
        lastInteraction: new Date(),
        commonTopics: [],
        satisfactionScore: undefined
      },
      preferences: {
        preferredBrands: [],
        vehicleInfo: undefined,
        communicationStyle: 'casual',
        priceRange: undefined
      },
      businessContext: {
        pointOfSaleId,
        isVipCustomer: false,
        creditLimit: undefined,
        lastPurchase: undefined
      }
    };
  }

  /**
   * Obtiene el historial de conversaciones del usuario
   */
  private getUserConversationHistory(userId: string): ConversationSummary[] {
    const userSummaries: ConversationSummary[] = [];
    
    for (const summary of this.conversationSummaries.values()) {
      const memory = this.memoryStore.get(summary.conversationId);
      if (memory?.longTermMemory.userProfile.userId === userId) {
        userSummaries.push(summary);
      }
    }
    
    return userSummaries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Actualiza la memoria con nuevo contenido
   */
  updateMemory(conversationId: string, updates: {
    currentTopic?: string;
    query?: string;
    intent?: string;
    entities?: Map<string, any>;
    function?: string;
    action?: string;
    context?: any;
  }): void {
    const memory = this.memoryStore.get(conversationId);
    if (!memory) {
      console.warn(`[ConversationMemory] Memoria no encontrada: ${conversationId}`);
      return;
    }

    // Actualizar memoria a corto plazo
    if (updates.currentTopic) {
      memory.shortTermMemory.currentTopic = updates.currentTopic;
    }
    
    if (updates.query) {
      memory.shortTermMemory.recentQueries.push(updates.query);
      if (memory.shortTermMemory.recentQueries.length > 10) {
        memory.shortTermMemory.recentQueries.shift();
      }
    }

    if (updates.entities) {
      for (const [key, value] of updates.entities.entries()) {
        memory.shortTermMemory.contextualEntities.set(key, value);
      }
    }

    // Actualizar memoria de trabajo
    if (updates.intent) {
      memory.workingMemory.currentIntent = updates.intent;
    }
    
    if (updates.function) {
      memory.workingMemory.activeFunction = updates.function;
    }
    
    if (updates.action) {
      memory.workingMemory.pendingActions.push(updates.action);
    }
    
    if (updates.context) {
      memory.workingMemory.contextStack.push(updates.context);
      if (memory.workingMemory.contextStack.length > 5) {
        memory.workingMemory.contextStack.shift();
      }
    }

    memory.metadata.lastUpdated = new Date();
    memory.metadata.conversationLength++;

    console.log(`[ConversationMemory] Memoria actualizada para conversación ${conversationId}`);
  }

  /**
   * Obtiene la memoria de una conversación
   */
  getMemory(conversationId: string): ConversationMemory | null {
    return this.memoryStore.get(conversationId) || null;
  }

  /**
   * Aprende de las preferencias del usuario
   */
  learnPreference(conversationId: string, key: string, value: any): void {
    const memory = this.memoryStore.get(conversationId);
    if (!memory) return;

    memory.longTermMemory.learnedPreferences.set(key, value);
    
    // Actualizar perfil de usuario
    const userProfile = memory.longTermMemory.userProfile;
    switch (key) {
      case 'preferred_brand':
        if (!userProfile.preferences.preferredBrands.includes(value)) {
          userProfile.preferences.preferredBrands.push(value);
        }
        break;
      case 'vehicle_info':
        userProfile.preferences.vehicleInfo = value;
        break;
      case 'communication_style':
        userProfile.preferences.communicationStyle = value;
        break;
      case 'price_range':
        userProfile.preferences.priceRange = value;
        break;
    }

    console.log(`[ConversationMemory] Preferencia aprendida: ${key} = ${value}`);
  }

  /**
   * Analiza patrones de comportamiento
   */
  analyzeBehaviorPatterns(conversationId: string): string[] {
    const memory = this.memoryStore.get(conversationId);
    if (!memory) return [];

    const patterns: string[] = [];
    const queries = memory.shortTermMemory.recentQueries;
    
    // Detectar patrones de búsqueda
    if (queries.filter(q => q.includes('precio')).length > 2) {
      patterns.push('price_conscious');
    }
    
    if (queries.filter(q => q.includes('marca')).length > 1) {
      patterns.push('brand_focused');
    }
    
    if (queries.filter(q => q.includes('compatible')).length > 1) {
      patterns.push('compatibility_focused');
    }

    // Detectar urgencia
    if (queries.some(q => q.includes('urgente') || q.includes('rápido'))) {
      patterns.push('urgent_need');
    }

    memory.longTermMemory.behaviorPatterns = patterns;
    return patterns;
  }

  /**
   * Genera contexto para el LLM
   */
  generateContextForLLM(conversationId: string): any {
    const memory = this.memoryStore.get(conversationId);
    if (!memory) return {};

    const userProfile = memory.longTermMemory.userProfile;
    const patterns = this.analyzeBehaviorPatterns(conversationId);

    return {
      user: {
        communicationStyle: userProfile.preferences.communicationStyle,
        preferredBrands: userProfile.preferences.preferredBrands,
        vehicleInfo: userProfile.preferences.vehicleInfo,
        isVipCustomer: userProfile.businessContext.isVipCustomer,
        behaviorPatterns: patterns
      },
      conversation: {
        currentTopic: memory.shortTermMemory.currentTopic,
        recentQueries: memory.shortTermMemory.recentQueries.slice(-3),
        currentIntent: memory.workingMemory.currentIntent,
        activeFunction: memory.workingMemory.activeFunction,
        pendingActions: memory.workingMemory.pendingActions
      },
      context: {
        conversationLength: memory.metadata.conversationLength,
        pointOfSaleId: userProfile.businessContext.pointOfSaleId,
        timeOfDay: this.getTimeOfDay(),
        entities: Object.fromEntries(memory.shortTermMemory.contextualEntities)
      }
    };
  }

  /**
   * Obtiene la hora del día para contexto temporal
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Finaliza una conversación y crea resumen
   */
  finalizeConversation(conversationId: string, outcome: 'completed' | 'abandoned' | 'escalated'): void {
    const memory = this.memoryStore.get(conversationId);
    if (!memory) return;

    const summary: ConversationSummary = {
      conversationId,
      date: memory.metadata.created,
      duration: new Date().getTime() - memory.metadata.created.getTime(),
      messagesCount: memory.metadata.conversationLength,
      mainTopics: [memory.shortTermMemory.currentTopic],
      outcome,
      satisfaction: undefined,
      keyInsights: []
    };

    this.conversationSummaries.set(conversationId, summary);
    
    // Actualizar estadísticas del usuario
    const userProfile = memory.longTermMemory.userProfile;
    userProfile.interactions.totalMessages += memory.metadata.conversationLength;
    userProfile.interactions.lastInteraction = new Date();
    
    console.log(`[ConversationMemory] Conversación finalizada: ${conversationId} (${outcome})`);
  }

  /**
   * Limpia memoria antigua
   */
  cleanupOldMemory(maxAgeHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [conversationId, memory] of this.memoryStore.entries()) {
      if (memory.metadata.lastUpdated < cutoffTime) {
        this.memoryStore.delete(conversationId);
        cleanedCount++;
      }
    }

    console.log(`[ConversationMemory] Limpieza completada: ${cleanedCount} memorias eliminadas`);
    return cleanedCount;
  }
}

// Exportar instancia singleton
export const conversationMemoryManager = new ConversationMemoryManager(); 