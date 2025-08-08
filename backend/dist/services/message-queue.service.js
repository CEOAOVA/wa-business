"use strict";
/**
 * Message Queue Service - Sistema de cola para procesamiento asíncrono de webhooks
 * Mejora la resilencia y evita timeouts en el procesamiento de mensajes
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
exports.messageQueueService = exports.MessageQueueService = void 0;
const structured_logger_1 = require("../utils/structured-logger");
const whatsapp_service_1 = require("./whatsapp.service");
class MessageQueueService {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelays = [1000, 2000, 4000]; // Backoff exponencial
        this.maxQueueSize = 1000;
        this.processingInterval = null;
        structured_logger_1.StructuredLogger.logSystemEvent('message_queue_initialized', {
            maxRetries: this.maxRetries,
            maxQueueSize: this.maxQueueSize
        });
    }
    /**
     * Agregar mensaje a la cola
     */
    addToQueue(payload_1) {
        return __awaiter(this, arguments, void 0, function* (payload, priority = 'normal') {
            // Verificar límite de cola
            if (this.queue.length >= this.maxQueueSize) {
                const oldestMessage = this.queue.shift();
                structured_logger_1.StructuredLogger.logError('message_queue', new Error('Queue overflow, dropping oldest message'), {
                    droppedMessageId: oldestMessage === null || oldestMessage === void 0 ? void 0 : oldestMessage.id,
                    queueSize: this.queue.length
                });
            }
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const correlationId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const queuedMessage = {
                id: messageId,
                payload,
                retries: 0,
                createdAt: new Date(),
                correlationId,
                priority
            };
            // Insertar según prioridad
            if (priority === 'high') {
                this.queue.unshift(queuedMessage);
            }
            else {
                this.queue.push(queuedMessage);
            }
            structured_logger_1.StructuredLogger.logSystemEvent('message_queued', {
                messageId,
                correlationId,
                priority,
                queueSize: this.queue.length
            });
            // Iniciar procesamiento si no está corriendo
            if (!this.processing) {
                this.startProcessing();
            }
            return messageId;
        });
    }
    /**
     * Iniciar procesamiento de la cola
     */
    startProcessing() {
        if (this.processing)
            return;
        this.processing = true;
        structured_logger_1.StructuredLogger.logSystemEvent('queue_processing_started', {
            queueSize: this.queue.length
        });
        // Procesar inmediatamente
        this.processQueue();
        // Configurar procesamiento periódico
        this.processingInterval = setInterval(() => {
            if (this.queue.length > 0) {
                this.processQueue();
            }
        }, 5000); // Cada 5 segundos
    }
    /**
     * Detener procesamiento de la cola
     */
    stopProcessing() {
        this.processing = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        structured_logger_1.StructuredLogger.logSystemEvent('queue_processing_stopped', {
            remainingMessages: this.queue.length
        });
    }
    /**
     * Procesar mensajes en la cola
     */
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.queue.length > 0 && this.processing) {
                const message = this.queue.shift();
                try {
                    const startTime = Date.now();
                    message.lastAttempt = new Date();
                    structured_logger_1.StructuredLogger.logSystemEvent('processing_queued_message', {
                        messageId: message.id,
                        correlationId: message.correlationId,
                        attempt: message.retries + 1,
                        queueSize: this.queue.length
                    });
                    // Procesar el mensaje webhook
                    yield this.processWebhookMessage(message.payload, message.correlationId);
                    const duration = Date.now() - startTime;
                    structured_logger_1.StructuredLogger.logPerformanceMetric('webhook_processed_from_queue', duration, {
                        messageId: message.id,
                        correlationId: message.correlationId,
                        attempt: message.retries + 1
                    });
                }
                catch (error) {
                    const errorId = structured_logger_1.StructuredLogger.logError('queue_message_processing', error, {
                        messageId: message.id,
                        correlationId: message.correlationId,
                        attempt: message.retries + 1
                    });
                    // Reintentar si no se han agotado los intentos
                    if (message.retries < this.maxRetries) {
                        message.retries++;
                        // Delay antes del reintento
                        const delay = this.retryDelays[message.retries - 1] || this.retryDelays[this.retryDelays.length - 1];
                        structured_logger_1.StructuredLogger.logSystemEvent('message_retry_scheduled', {
                            messageId: message.id,
                            correlationId: message.correlationId,
                            attempt: message.retries,
                            delay,
                            errorId
                        });
                        // Reintroducir en la cola después del delay
                        setTimeout(() => {
                            this.queue.unshift(message); // Prioridad alta para reintentos
                        }, delay);
                    }
                    else {
                        // Mensaje fallido definitivamente
                        structured_logger_1.StructuredLogger.logError('message_permanently_failed', error, {
                            messageId: message.id,
                            correlationId: message.correlationId,
                            totalAttempts: message.retries + 1,
                            errorId
                        });
                        // Aquí se podría implementar una cola de mensajes fallidos
                        // o notificación a un sistema de alertas
                    }
                }
            }
            // Si no hay más mensajes, detener procesamiento
            if (this.queue.length === 0) {
                this.processing = false;
                if (this.processingInterval) {
                    clearInterval(this.processingInterval);
                    this.processingInterval = null;
                }
                structured_logger_1.StructuredLogger.logSystemEvent('queue_processing_completed', {
                    queueSize: this.queue.length
                });
            }
        });
    }
    /**
     * Procesar mensaje webhook individual
     */
    processWebhookMessage(payload, correlationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = structured_logger_1.StructuredLogger.createContext(correlationId);
            try {
                context.logWebhook('processing_start', payload);
                // Delegar al servicio de WhatsApp existente (compatibilidad)
                yield whatsapp_service_1.whatsappService.processWebhookLegacy(payload);
                context.logWebhook('processing_success', payload);
            }
            catch (error) {
                context.logError('webhook_processing', error, { payload });
                throw error; // Re-throw para que el sistema de reintentos funcione
            }
        });
    }
    /**
     * Obtener estadísticas de la cola
     */
    getQueueStats() {
        const priorityStats = this.queue.reduce((acc, msg) => {
            acc[msg.priority] = (acc[msg.priority] || 0) + 1;
            return acc;
        }, {});
        return {
            totalMessages: this.queue.length,
            isProcessing: this.processing,
            priorityBreakdown: priorityStats,
            oldestMessage: this.queue.length > 0 ? this.queue[0].createdAt : null,
            maxQueueSize: this.maxQueueSize,
            maxRetries: this.maxRetries
        };
    }
    /**
     * Limpiar mensajes antiguos de la cola
     */
    cleanupOldMessages(maxAgeMinutes = 30) {
        const cutoffTime = new Date(Date.now() - (maxAgeMinutes * 60 * 1000));
        const initialSize = this.queue.length;
        this.queue = this.queue.filter(msg => msg.createdAt > cutoffTime);
        const removedCount = initialSize - this.queue.length;
        if (removedCount > 0) {
            structured_logger_1.StructuredLogger.logSystemEvent('queue_cleanup', {
                removedMessages: removedCount,
                remainingMessages: this.queue.length,
                maxAgeMinutes
            });
        }
        return removedCount;
    }
    /**
     * Obtener mensaje por ID
     */
    getMessageById(messageId) {
        return this.queue.find(msg => msg.id === messageId);
    }
    /**
     * Remover mensaje específico de la cola
     */
    removeMessage(messageId) {
        const initialSize = this.queue.length;
        this.queue = this.queue.filter(msg => msg.id !== messageId);
        const removed = initialSize > this.queue.length;
        if (removed) {
            structured_logger_1.StructuredLogger.logSystemEvent('message_removed_from_queue', {
                messageId,
                remainingMessages: this.queue.length
            });
        }
        return removed;
    }
    /**
     * Limpiar toda la cola
     */
    clearQueue() {
        const clearedCount = this.queue.length;
        this.queue = [];
        structured_logger_1.StructuredLogger.logSystemEvent('queue_cleared', {
            clearedMessages: clearedCount
        });
        return clearedCount;
    }
    /**
     * Destruir el servicio
     */
    destroy() {
        this.stopProcessing();
        const remainingMessages = this.clearQueue();
        structured_logger_1.StructuredLogger.logSystemEvent('message_queue_destroyed', {
            remainingMessages
        });
    }
}
exports.MessageQueueService = MessageQueueService;
// Instancia singleton
exports.messageQueueService = new MessageQueueService();
