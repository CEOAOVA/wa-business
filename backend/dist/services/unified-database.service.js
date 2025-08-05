"use strict";
/**
 * Unified Database Service - Consolidación híbrida con feature flags
 * Permite migración gradual y rollback seguro en producción
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
exports.unifiedDatabaseService = exports.UnifiedDatabaseService = void 0;
const structured_logger_1 = require("../utils/structured-logger");
const supabase_database_service_1 = require("./supabase-database.service");
const database_service_1 = require("./database.service");
const circuit_breaker_service_1 = require("./circuit-breaker.service");
const supabase_1 = require("../config/supabase");
class UnifiedDatabaseService {
    constructor() {
        this.config = {
            useDirectSupabase: process.env.USE_DIRECT_SUPABASE === 'true',
            useOptimizedQueries: process.env.USE_OPTIMIZED_QUERIES === 'true',
            useBatchOperations: process.env.USE_BATCH_OPERATIONS === 'true',
            useCircuitBreaker: process.env.USE_CIRCUIT_BREAKER === 'true',
            enablePerformanceMetrics: process.env.ENABLE_PERFORMANCE_METRICS !== 'false',
            rollbackThreshold: parseInt(process.env.ROLLBACK_THRESHOLD || '10') // 10% error rate
        };
        this.metrics = {
            legacyOperations: 0,
            optimizedOperations: 0,
            legacyErrors: 0,
            optimizedErrors: 0,
            averageLegacyTime: 0,
            averageOptimizedTime: 0,
            errorRate: 0,
            recommendedConfig: {}
        };
        this.startTime = Date.now();
        structured_logger_1.StructuredLogger.logSystemEvent('unified_database_service_initialized', {
            config: this.config,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Procesar mensaje saliente con estrategia híbrida
     */
    processOutgoingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const correlationId = `unified_out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('process_outgoing_start', 'messages', {
                useDirectSupabase: this.config.useDirectSupabase,
                messageId: data.clientId || 'unknown'
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedProcessOutgoingMessage(data, context), 'processOutgoingMessage', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.processOutgoingMessage(data), 'processOutgoingMessage', context);
            }
        });
    }
    /**
     * Procesar mensaje entrante con estrategia híbrida
     */
    processIncomingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const correlationId = `unified_in_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('process_incoming_start', 'messages', {
                useDirectSupabase: this.config.useDirectSupabase,
                from: data.from || 'unknown'
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedProcessIncomingMessage(data, context), 'processIncomingMessage', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.processIncomingMessage(data), 'processIncomingMessage', context);
            }
        });
    }
    /**
     * Obtener conversaciones con estrategia híbrida
     */
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            const correlationId = `unified_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            if (this.config.useOptimizedQueries) {
                return yield this.executeOptimizedMethod(() => this.optimizedGetConversations(limit, offset, context), 'getConversations', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.getConversations(limit, offset), 'getConversations', context);
            }
        });
    }
    /**
     * Obtener mensajes de conversación con estrategia híbrida
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            const correlationId = `unified_msgs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            if (this.config.useOptimizedQueries) {
                return yield this.executeOptimizedMethod(() => this.optimizedGetConversationMessages(conversationId, limit, offset, context), 'getConversationMessages', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.getConversationMessages(conversationId, limit, offset), 'getConversationMessages', context);
            }
        });
    }
    /**
     * Marcar mensaje como leído con estrategia híbrida
     */
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const correlationId = `unified_read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('mark_message_read_start', 'messages', {
                messageId,
                useDirectSupabase: this.config.useDirectSupabase
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedMarkMessageAsRead(messageId, context), 'markMessageAsRead', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.markMessageAsRead(messageId), 'markMessageAsRead', context);
            }
        });
    }
    /**
     * Eliminar mensaje con estrategia híbrida
     */
    deleteMessage(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            const correlationId = `unified_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('delete_message_start', 'messages', {
                messageId,
                useDirectSupabase: this.config.useDirectSupabase
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedDeleteMessage(messageId, context), 'deleteMessage', context);
            }
            else {
                return yield this.executeLegacyMethod(() => this.legacyDeleteMessage(messageId), 'deleteMessage', context);
            }
        });
    }
    /**
     * Limpiar mensajes antiguos con estrategia híbrida
     */
    cleanupOldMessages() {
        return __awaiter(this, arguments, void 0, function* (daysOld = 30) {
            const correlationId = `unified_cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('cleanup_messages_start', 'messages', {
                daysOld,
                useDirectSupabase: this.config.useDirectSupabase
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedCleanupOldMessages(daysOld, context), 'cleanupOldMessages', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.cleanupOldMessages(daysOld), 'cleanupOldMessages', context);
            }
        });
    }
    /**
     * Marcar conversación como leída con estrategia híbrida
     */
    markConversationAsRead(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const correlationId = `unified_conv_read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            context.logDatabase('mark_conversation_read_start', 'conversations', {
                conversationId,
                useDirectSupabase: this.config.useDirectSupabase
            });
            if (this.config.useDirectSupabase) {
                return yield this.executeOptimizedMethod(() => this.optimizedMarkConversationAsRead(conversationId, context), 'markConversationAsRead', context);
            }
            else {
                return yield this.executeLegacyMethod(() => database_service_1.databaseService.markConversationAsRead(conversationId), 'markConversationAsRead', context);
            }
        });
    }
    /**
     * Ejecutar método optimizado con métricas y circuit breaker
     */
    executeOptimizedMethod(operation, operationName, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                let result;
                if (this.config.useCircuitBreaker) {
                    result = yield circuit_breaker_service_1.databaseCircuitBreaker.call(operation);
                }
                else {
                    result = yield operation();
                }
                const duration = Date.now() - startTime;
                this.updateOptimizedMetrics(duration, false);
                context.logPerformance(`${operationName}_optimized_success`, duration, {
                    useCircuitBreaker: this.config.useCircuitBreaker
                });
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                this.updateOptimizedMetrics(duration, true);
                const errorId = context.logError(`${operationName}_optimized_failed`, error, {
                    duration,
                    useCircuitBreaker: this.config.useCircuitBreaker
                });
                // Verificar si necesitamos rollback automático
                yield this.checkAutoRollback(context);
                throw error;
            }
        });
    }
    /**
     * Ejecutar método legacy con métricas
     */
    executeLegacyMethod(operation, operationName, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                const result = yield operation();
                const duration = Date.now() - startTime;
                this.updateLegacyMetrics(duration, false);
                context.logPerformance(`${operationName}_legacy_success`, duration);
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                this.updateLegacyMetrics(duration, true);
                const errorId = context.logError(`${operationName}_legacy_failed`, error, { duration });
                throw error;
            }
        });
    }
    /**
     * Método optimizado para procesar mensaje saliente
     */
    optimizedProcessOutgoingMessage(data, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar createMessage directamente - método disponible
            const result = yield supabase_database_service_1.supabaseDatabaseService.createMessage({
                conversationId: data.conversationId,
                senderType: 'agent',
                content: data.content || data.message,
                messageType: data.messageType || 'text',
                whatsappMessageId: data.whatsappMessageId,
                clientId: data.clientId,
                metadata: data.metadata
            });
            context.logDatabase('optimized_outgoing_processed', 'messages', {
                messageId: (result === null || result === void 0 ? void 0 : result.id) || 'unknown',
                optimizations: ['direct_supabase', 'structured_logging']
            });
            return result;
        });
    }
    /**
     * Método optimizado para procesar mensaje entrante
     */
    optimizedProcessIncomingMessage(data, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar createMessage directamente - método disponible
            const result = yield supabase_database_service_1.supabaseDatabaseService.createMessage({
                conversationId: data.conversationId,
                senderType: 'user',
                content: data.content || data.message,
                messageType: data.messageType || 'text',
                whatsappMessageId: data.whatsappMessageId,
                clientId: data.clientId,
                metadata: data.metadata
            });
            context.logDatabase('optimized_incoming_processed', 'messages', {
                messageId: (result === null || result === void 0 ? void 0 : result.id) || 'unknown',
                from: data.from,
                optimizations: ['direct_supabase', 'structured_logging']
            });
            return result;
        });
    }
    /**
     * Método optimizado para obtener conversaciones
     */
    optimizedGetConversations(limit, offset, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar query optimizada directamente
            const conversations = yield supabase_database_service_1.supabaseDatabaseService.getConversations(limit, offset);
            context.logDatabase('optimized_conversations_fetched', 'conversations', {
                count: conversations.length,
                limit,
                offset,
                optimizations: ['direct_query', 'reduced_joins']
            });
            return conversations;
        });
    }
    /**
     * Método optimizado para obtener mensajes de conversación
     */
    optimizedGetConversationMessages(conversationId, limit, offset, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar query optimizada directamente - ajustar parámetros
            const messages = yield supabase_database_service_1.supabaseDatabaseService.getConversationMessages(conversationId, limit);
            context.logDatabase('optimized_messages_fetched', 'messages', {
                count: messages.length,
                conversationId,
                limit,
                offset,
                optimizations: ['direct_query', 'indexed_lookup']
            });
            return messages;
        });
    }
    /**
     * Método optimizado para marcar mensaje como leído
     */
    optimizedMarkMessageAsRead(messageId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar directamente supabaseDatabaseService
            const result = yield supabase_database_service_1.supabaseDatabaseService.markMessageAsRead(messageId);
            context.logDatabase('optimized_message_marked_read', 'messages', {
                messageId,
                success: !!result,
                optimizations: ['direct_supabase', 'single_query']
            });
            return result;
        });
    }
    /**
     * Método optimizado para eliminar mensaje
     */
    optimizedDeleteMessage(messageId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar eliminación directa con Supabase
            if (!supabase_1.supabaseAdmin)
                throw new Error('Supabase not configured');
            const { data, error } = yield supabase_1.supabaseAdmin
                .from('messages')
                .delete()
                .eq('id', messageId);
            if (error)
                throw error;
            context.logDatabase('optimized_message_deleted', 'messages', {
                messageId,
                success: !error,
                optimizations: ['direct_supabase', 'cascade_delete']
            });
            return data;
        });
    }
    /**
     * Método optimizado para limpiar mensajes antiguos
     */
    optimizedCleanupOldMessages(daysOld, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar método disponible en supabaseDatabaseService
            const hoursOld = daysOld * 24; // Convertir días a horas
            const deletedCount = yield supabase_database_service_1.supabaseDatabaseService.cleanupOldMessages(hoursOld);
            context.logDatabase('optimized_messages_cleaned', 'messages', {
                daysOld,
                deletedCount,
                optimizations: ['batch_delete', 'indexed_date_filter']
            });
            return { deletedCount };
        });
    }
    /**
     * Método optimizado para marcar conversación como leída
     */
    optimizedMarkConversationAsRead(conversationId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Usar método disponible en supabaseDatabaseService
            const result = yield supabase_database_service_1.supabaseDatabaseService.markConversationAsRead(conversationId);
            context.logDatabase('optimized_conversation_marked_read', 'conversations', {
                conversationId,
                success: result,
                optimizations: ['direct_supabase', 'single_query']
            });
            return result;
        });
    }
    /**
     * Método legacy para eliminar mensaje (fallback)
     */
    legacyDeleteMessage(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar usando Supabase directamente como fallback
            if (!supabase_1.supabaseAdmin)
                throw new Error('Supabase not configured');
            const { data, error } = yield supabase_1.supabaseAdmin
                .from('messages')
                .delete()
                .eq('id', messageId);
            if (error)
                throw error;
            return data;
        });
    }
    /**
     * Actualizar métricas de métodos optimizados
     */
    updateOptimizedMetrics(duration, isError) {
        this.metrics.optimizedOperations++;
        if (isError) {
            this.metrics.optimizedErrors++;
        }
        // Calcular promedio móvil
        this.metrics.averageOptimizedTime =
            (this.metrics.averageOptimizedTime * (this.metrics.optimizedOperations - 1) + duration) /
                this.metrics.optimizedOperations;
        this.updateErrorRate();
    }
    /**
     * Actualizar métricas de métodos legacy
     */
    updateLegacyMetrics(duration, isError) {
        this.metrics.legacyOperations++;
        if (isError) {
            this.metrics.legacyErrors++;
        }
        // Calcular promedio móvil
        this.metrics.averageLegacyTime =
            (this.metrics.averageLegacyTime * (this.metrics.legacyOperations - 1) + duration) /
                this.metrics.legacyOperations;
        this.updateErrorRate();
    }
    /**
     * Actualizar tasa de error general
     */
    updateErrorRate() {
        const totalOperations = this.metrics.legacyOperations + this.metrics.optimizedOperations;
        const totalErrors = this.metrics.legacyErrors + this.metrics.optimizedErrors;
        this.metrics.errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
    }
    /**
     * Verificar si necesitamos rollback automático
     */
    checkAutoRollback(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.metrics.errorRate > this.config.rollbackThreshold &&
                this.metrics.optimizedOperations > 10) { // Mínimo 10 operaciones para estadística válida
                context.logError('auto_rollback_triggered', new Error('Error rate exceeded threshold'), {
                    errorRate: this.metrics.errorRate,
                    threshold: this.config.rollbackThreshold,
                    metrics: this.metrics
                });
                // Desactivar optimizaciones automáticamente
                this.config.useDirectSupabase = false;
                this.config.useOptimizedQueries = false;
                structured_logger_1.StructuredLogger.logSystemEvent('auto_rollback_executed', {
                    previousConfig: this.config,
                    metrics: this.metrics,
                    reason: 'error_rate_exceeded'
                });
            }
        });
    }
    /**
     * Obtener métricas actuales
     */
    getMetrics() {
        // Calcular configuración recomendada basada en métricas
        this.metrics.recommendedConfig = this.calculateRecommendedConfig();
        return Object.assign({}, this.metrics);
    }
    /**
     * Calcular configuración recomendada basada en métricas
     */
    calculateRecommendedConfig() {
        const recommended = {};
        // Recomendar método directo si es más rápido y confiable
        if (this.metrics.optimizedOperations > 20 && this.metrics.legacyOperations > 20) {
            const optimizedErrorRate = (this.metrics.optimizedErrors / this.metrics.optimizedOperations) * 100;
            const legacyErrorRate = (this.metrics.legacyErrors / this.metrics.legacyOperations) * 100;
            recommended.useDirectSupabase =
                optimizedErrorRate <= legacyErrorRate &&
                    this.metrics.averageOptimizedTime <= this.metrics.averageLegacyTime * 1.2; // 20% tolerancia
            recommended.useOptimizedQueries =
                this.metrics.averageOptimizedTime < this.metrics.averageLegacyTime;
        }
        // Recomendar circuit breaker si hay errores frecuentes
        recommended.useCircuitBreaker = this.metrics.errorRate > 5;
        return recommended;
    }
    /**
     * Obtener configuración actual
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Actualizar configuración (para testing y ajustes)
     */
    updateConfig(newConfig) {
        const oldConfig = Object.assign({}, this.config);
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        structured_logger_1.StructuredLogger.logSystemEvent('unified_database_config_updated', {
            oldConfig,
            newConfig: this.config,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Resetear métricas (para testing)
     */
    resetMetrics() {
        this.metrics = {
            legacyOperations: 0,
            optimizedOperations: 0,
            legacyErrors: 0,
            optimizedErrors: 0,
            averageLegacyTime: 0,
            averageOptimizedTime: 0,
            errorRate: 0,
            recommendedConfig: {}
        };
        structured_logger_1.StructuredLogger.logSystemEvent('unified_database_metrics_reset', {
            timestamp: new Date().toISOString()
        });
    }
}
exports.UnifiedDatabaseService = UnifiedDatabaseService;
// Instancia singleton
exports.unifiedDatabaseService = new UnifiedDatabaseService();
