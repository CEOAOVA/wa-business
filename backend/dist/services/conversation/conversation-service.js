"use strict";
/**
 * Servicio de conversación avanzado para WhatsApp Business
 * Integra el motor de conversación completo con funcionalidad LLM
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
exports.conversationService = exports.ConversationService = void 0;
const advanced_conversation_engine_1 = require("./advanced-conversation-engine");
class ConversationService {
    constructor() {
        this.sessions = new Map();
    }
    /**
     * Inicializa una nueva sesión de conversación
     */
    initializeSession(context) {
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
    addMessage(conversationId, message) {
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
    getMessageHistory(conversationId) {
        const session = this.sessions.get(conversationId);
        return (session === null || session === void 0 ? void 0 : session.messages) || [];
    }
    /**
     * Actualiza el estado de una sesión
     */
    updateSessionState(conversationId, state) {
        const session = this.sessions.get(conversationId);
        if (!session) {
            console.warn(`[ConversationService] Sesión no encontrada: ${conversationId}`);
            return;
        }
        session.state = Object.assign(Object.assign({}, session.state), state);
        session.lastActivity = new Date();
        console.log(`[ConversationService] Estado actualizado para sesión ${conversationId}:`, state);
    }
    /**
     * Obtiene el estado actual de una sesión
     */
    getSessionState(conversationId) {
        const session = this.sessions.get(conversationId);
        return (session === null || session === void 0 ? void 0 : session.state) || null;
    }
    /**
     * Obtiene información completa de una sesión
     */
    getSession(conversationId) {
        return this.sessions.get(conversationId);
    }
    /**
     * Verifica si una sesión existe
     */
    hasSession(conversationId) {
        return this.sessions.has(conversationId);
    }
    /**
     * Elimina una sesión
     */
    removeSession(conversationId) {
        if (this.sessions.delete(conversationId)) {
            console.log(`[ConversationService] Sesión eliminada: ${conversationId}`);
        }
    }
    /**
     * Limpia sesiones inactivas
     */
    cleanupInactiveSessions(maxAgeMinutes = 60) {
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
    getStats() {
        const totalSessions = this.sessions.size;
        const activeSessionsByPhase = {};
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
    processMessage(conversationId, userMessage, context) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const request = {
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
                const response = yield advanced_conversation_engine_1.advancedConversationEngine.processConversation(request);
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
            }
            catch (error) {
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
        });
    }
    /**
     * Procesa un mensaje con respuesta detallada
     */
    processMessageDetailed(conversationId, userMessage, context) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const request = {
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
                const response = yield advanced_conversation_engine_1.advancedConversationEngine.processConversation(request);
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
            }
            catch (error) {
                console.error('[ConversationService] Error procesando mensaje detallado:', error);
                throw error;
            }
        });
    }
    /**
     * Mapea fases del motor avanzado a fases del servicio básico
     */
    mapPhase(advancedPhase) {
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
exports.ConversationService = ConversationService;
// Exportar instancia singleton
exports.conversationService = new ConversationService();
