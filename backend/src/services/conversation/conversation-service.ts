/**
 * Servicio de conversación avanzado para WhatsApp Business
 * Integra el motor de conversación completo con funcionalidad LLM
 */

import { 
  advancedConversationEngine, 
  ConversationRequest, 
  ConversationResponse 
} from './advanced-conversation-engine';
import { conversationMemoryManager } from './conversation-memory';

export interface ConversationContext {
  conversationId: string;
  pointOfSaleId: string;
  userId?: string;
  sessionId?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface ConversationState {
  phase: 'initial' | 'searching' | 'awaiting_decision' | 'processing' | 'completed';
  lastIntent?: string;
  currentProduct?: any;
  awaitingInput?: boolean;
  context?: any;
}

export class ConversationService {
  private sessions = new Map<string, {
    context: ConversationContext;
    messages: ConversationMessage[];
    state: ConversationState;
    lastActivity: Date;
  }>();

  /**
   * Inicializa una nueva sesión de conversación
   */
  initializeSession(context: ConversationContext): void {
    console.log(`[ConversationService] Inicializando sesión ${context.conversationId}`);
    
    this.sessions.set(context.conversationId, {
      context,
      messages: [],
      state: {
        phase: 'initial',
        awaitingInput: false
      },
      lastActivity: new Date()
    });
  }

  /**
   * Agrega un mensaje a la sesión
   */
  addMessage(conversationId: string, message: ConversationMessage): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      console.warn(`[ConversationService] Sesión no encontrada: ${conversationId}`);
      return;
    }

    session.messages.push(message);
    session.lastActivity = new Date();
    
    console.log(`[ConversationService] Mensaje agregado a sesión ${conversationId}: ${message.role}`);
  }

  /**
   * Obtiene el historial de mensajes de una sesión
   */
  getMessageHistory(conversationId: string): ConversationMessage[] {
    const session = this.sessions.get(conversationId);
    return session?.messages || [];
  }

  /**
   * Actualiza el estado de una sesión
   */
  updateSessionState(conversationId: string, state: Partial<ConversationState>): void {
    const session = this.sessions.get(conversationId);
    if (!session) {
      console.warn(`[ConversationService] Sesión no encontrada: ${conversationId}`);
      return;
    }

    session.state = { ...session.state, ...state };
    session.lastActivity = new Date();
    
    console.log(`[ConversationService] Estado actualizado para sesión ${conversationId}:`, state);
  }

  /**
   * Obtiene el estado actual de una sesión
   */
  getSessionState(conversationId: string): ConversationState | null {
    const session = this.sessions.get(conversationId);
    return session?.state || null;
  }

  /**
   * Obtiene información completa de una sesión
   */
  getSession(conversationId: string) {
    return this.sessions.get(conversationId);
  }

  /**
   * Verifica si una sesión existe
   */
  hasSession(conversationId: string): boolean {
    return this.sessions.has(conversationId);
  }

  /**
   * Elimina una sesión
   */
  removeSession(conversationId: string): void {
    if (this.sessions.delete(conversationId)) {
      console.log(`[ConversationService] Sesión eliminada: ${conversationId}`);
    }
  }

  /**
   * Limpia sesiones inactivas
   */
  cleanupInactiveSessions(maxAgeMinutes: number = 60): number {
    const now = new Date();
    let removedCount = 0;
    
    for (const [conversationId, session] of this.sessions.entries()) {
      const ageMinutes = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        this.sessions.delete(conversationId);
        removedCount++;
        console.log(`[ConversationService] Sesión inactiva eliminada: ${conversationId}`);
      }
    }
    
    return removedCount;
  }

  /**
   * Obtiene estadísticas de sesiones
   */
  getStats(): {
    totalSessions: number;
    activeSessionsByPhase: Record<string, number>;
    averageMessagesPerSession: number;
  } {
    const totalSessions = this.sessions.size;
    const activeSessionsByPhase: Record<string, number> = {};
    let totalMessages = 0;
    
    for (const session of this.sessions.values()) {
      const phase = session.state.phase;
      activeSessionsByPhase[phase] = (activeSessionsByPhase[phase] || 0) + 1;
      totalMessages += session.messages.length;
    }
    
    return {
      totalSessions,
      activeSessionsByPhase,
      averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0
    };
  }

  /**
   * Procesa un mensaje usando el motor de conversación avanzado
   */
  async processMessage(
    conversationId: string,
    userMessage: string,
    context: ConversationContext
  ): Promise<string> {
    try {
      // Asegurar que la sesión existe
      if (!this.hasSession(conversationId)) {
        this.initializeSession(context);
      }

      // Agregar mensaje del usuario
      this.addMessage(conversationId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Crear request para el motor avanzado
      const request: ConversationRequest = {
        conversationId,
        userId: context.userId || conversationId,
        phoneNumber: context.userId || 'unknown',
        message: userMessage,
        pointOfSaleId: context.pointOfSaleId,
        metadata: {
          messageType: 'text',
          timestamp: new Date()
        }
      };

      // Procesar usando el motor avanzado
      const response = await advancedConversationEngine.processConversation(request);

      // Actualizar estado de la sesión
      this.updateSessionState(conversationId, {
        phase: this.mapPhase(response.conversationState.phase),
        lastIntent: response.intent,
        awaitingInput: !response.conversationState.canProgress
      });

      // Agregar respuesta del asistente
      this.addMessage(conversationId, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          intent: response.intent,
          functionsCalled: response.functionCalls.length,
          confidenceScore: response.metadata.confidenceScore
        }
      });

      return response.response;
      
    } catch (error) {
      console.error('[ConversationService] Error procesando mensaje:', error);
      
      const errorResponse = "Disculpa, he tenido un problema técnico. ¿Podrías intentar de nuevo?";
      
      this.addMessage(conversationId, {
        role: 'assistant',
        content: errorResponse,
        timestamp: new Date(),
        metadata: { error: true }
      });
      
      return errorResponse;
    }
  }

  /**
   * Procesa un mensaje con respuesta detallada
   */
  async processMessageDetailed(
    conversationId: string,
    userMessage: string,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    try {
      // Asegurar que la sesión existe
      if (!this.hasSession(conversationId)) {
        this.initializeSession(context);
      }

      // Agregar mensaje del usuario
      this.addMessage(conversationId, {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Crear request para el motor avanzado
      const request: ConversationRequest = {
        conversationId,
        userId: context.userId || conversationId,
        phoneNumber: context.userId || 'unknown',
        message: userMessage,
        pointOfSaleId: context.pointOfSaleId,
        metadata: {
          messageType: 'text',
          timestamp: new Date()
        }
      };

      // Procesar usando el motor avanzado
      const response = await advancedConversationEngine.processConversation(request);

      // Actualizar estado de la sesión
      this.updateSessionState(conversationId, {
        phase: this.mapPhase(response.conversationState.phase),
        lastIntent: response.intent,
        awaitingInput: !response.conversationState.canProgress
      });

      // Agregar respuesta del asistente
      this.addMessage(conversationId, {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: {
          intent: response.intent,
          functionsCalled: response.functionCalls.length,
          confidenceScore: response.metadata.confidenceScore
        }
      });

      return response;
      
    } catch (error) {
      console.error('[ConversationService] Error procesando mensaje detallado:', error);
      throw error;
    }
  }

  /**
   * Mapea fases del motor avanzado a fases del servicio básico
   */
  private mapPhase(advancedPhase: string): ConversationState['phase'] {
    switch (advancedPhase) {
      case 'search_product':
      case 'inventory_check':
        return 'searching';
      case 'purchase_intent':
        return 'processing';
      case 'support_request':
        return 'awaiting_decision';
      default:
        return 'initial';
    }
  }
}

// Exportar instancia singleton
export const conversationService = new ConversationService(); 