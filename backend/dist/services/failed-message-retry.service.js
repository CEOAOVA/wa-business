"use strict";
/**
 * Failed Message Retry Service - Sistema de reintentos para mensajes fallidos
 * FASE 3: Implementar acknowledgment y retry automático
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
exports.failedMessageRetryService = exports.FailedMessageRetryService = void 0;
const database_service_1 = require("./database.service");
const whatsapp_service_1 = require("./whatsapp.service");
class FailedMessageRetryService {
    constructor() {
        this.isProcessing = false;
        this.processingInterval = null;
        this.maxRetries = 3;
        this.retryDelays = [5000, 10000, 30000]; // 5s, 10s, 30s
        this.batchSize = 10; // Procesar máximo 10 mensajes por batch
        console.log('🔄 [RETRY_SERVICE] Inicializando servicio de retry de mensajes fallidos');
    }
    /**
     * Iniciar procesamiento automático de mensajes fallidos
     */
    startAutoRetry() {
        if (this.isProcessing) {
            console.log('⚠️ [RETRY_SERVICE] Procesamiento ya está activo');
            return;
        }
        this.isProcessing = true;
        console.log('🚀 [RETRY_SERVICE] Iniciando procesamiento automático de mensajes fallidos');
        // Procesar inmediatamente
        this.processFailedMessages();
        // Configurar procesamiento periódico cada 2 minutos
        this.processingInterval = setInterval(() => {
            this.processFailedMessages();
        }, 120000); // 2 minutos
    }
    /**
     * Detener procesamiento automático
     */
    stopAutoRetry() {
        this.isProcessing = false;
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        console.log('⏹️ [RETRY_SERVICE] Procesamiento automático detenido');
    }
    /**
     * Procesar mensajes fallidos en lotes
     */
    processFailedMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔍 [RETRY_SERVICE] Buscando mensajes fallidos para reintentar...');
                const failedMessages = yield database_service_1.databaseService.getFailedMessages();
                if (failedMessages.length === 0) {
                    console.log('✅ [RETRY_SERVICE] No hay mensajes fallidos para procesar');
                    return;
                }
                console.log(`📦 [RETRY_SERVICE] Encontrados ${failedMessages.length} mensajes fallidos`);
                // Procesar en lotes para evitar sobrecarga
                const batches = this.chunkArray(failedMessages, this.batchSize);
                for (const batch of batches) {
                    yield this.processBatch(batch);
                    // Pausa entre lotes para evitar rate limiting
                    yield this.delay(1000);
                }
            }
            catch (error) {
                console.error('❌ [RETRY_SERVICE] Error procesando mensajes fallidos:', error);
            }
        });
    }
    /**
     * Procesar un lote de mensajes fallidos
     */
    processBatch(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔄 [RETRY_SERVICE] Procesando lote de ${messages.length} mensajes`);
            const promises = messages.map(message => this.retryMessage(message));
            const results = yield Promise.allSettled(promises);
            let successCount = 0;
            let failureCount = 0;
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.success) {
                    successCount++;
                }
                else {
                    failureCount++;
                    console.error(`❌ [RETRY_SERVICE] Fallo en reintento de mensaje ${messages[index].id}:`, result.status === 'rejected' ? result.reason : result.value.error);
                }
            });
            console.log(`📊 [RETRY_SERVICE] Resultados del lote: ${successCount} exitosos, ${failureCount} fallidos`);
        });
    }
    /**
     * Reintentar un mensaje específico
     */
    retryMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 [RETRY_SERVICE] Reintentando mensaje ${message.id} (intento ${message.retry_count + 1}/${this.maxRetries})`);
                // Verificar si aún se puede reintentar
                if (message.retry_count >= this.maxRetries) {
                    console.log(`⚠️ [RETRY_SERVICE] Mensaje ${message.id} ha alcanzado el máximo de reintentos`);
                    return {
                        success: false,
                        messageId: message.id,
                        error: 'Máximo de reintentos alcanzado',
                        attempts: message.retry_count
                    };
                }
                // Incrementar contador de reintentos
                yield database_service_1.databaseService.incrementRetryCount(message.id);
                // Reintentar envío
                const result = yield whatsapp_service_1.whatsappService.sendMessage({
                    to: message.to_wa_id,
                    message: message.content,
                    clientId: message.client_id || `retry_${message.id}`,
                    isChatbotResponse: false
                });
                if (result.success) {
                    console.log(`✅ [RETRY_SERVICE] Mensaje ${message.id} reenviado exitosamente`);
                    return {
                        success: true,
                        messageId: message.id,
                        whatsappMessageId: result.messageId,
                        attempts: message.retry_count + 1
                    };
                }
                else {
                    console.error(`❌ [RETRY_SERVICE] Fallo en reintento de mensaje ${message.id}:`, result.error);
                    return {
                        success: false,
                        messageId: message.id,
                        error: result.error,
                        attempts: message.retry_count + 1
                    };
                }
            }
            catch (error) {
                console.error(`❌ [RETRY_SERVICE] Error en reintento de mensaje ${message.id}:`, error);
                return {
                    success: false,
                    messageId: message.id,
                    error: error.message,
                    attempts: message.retry_count + 1
                };
            }
        });
    }
    /**
     * Reintentar mensaje específico por ID
     */
    retryMessageById(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield database_service_1.databaseService.getMessageById(messageId);
                if (!message) {
                    return {
                        success: false,
                        messageId,
                        error: 'Mensaje no encontrado',
                        attempts: 0
                    };
                }
                return yield this.retryMessage(message);
            }
            catch (error) {
                console.error(`❌ [RETRY_SERVICE] Error obteniendo mensaje ${messageId}:`, error);
                return {
                    success: false,
                    messageId,
                    error: error.message,
                    attempts: 0
                };
            }
        });
    }
    /**
     * Obtener estadísticas de retry
     */
    getRetryStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const failedMessages = yield database_service_1.databaseService.getFailedMessages();
                const totalFailed = failedMessages.length;
                const totalRetries = failedMessages.reduce((sum, msg) => sum + (msg.retry_count || 0), 0);
                const averageRetries = totalFailed > 0 ? totalRetries / totalFailed : 0;
                // Calcular tasa de éxito (mensajes que ya no están en estado failed)
                const successCount = failedMessages.filter(msg => msg.status !== 'failed').length;
                const successRate = totalFailed > 0 ? (successCount / totalFailed) * 100 : 0;
                return {
                    totalFailed,
                    totalRetried: totalRetries,
                    successRate,
                    averageRetries
                };
            }
            catch (error) {
                console.error('❌ [RETRY_SERVICE] Error obteniendo estadísticas:', error);
                return {
                    totalFailed: 0,
                    totalRetried: 0,
                    successRate: 0,
                    averageRetries: 0
                };
            }
        });
    }
    /**
     * Limpiar mensajes fallidos antiguos (más de 24 horas)
     */
    cleanupOldFailedMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 horas
                const cleanedCount = yield database_service_1.databaseService.cleanupOldFailedMessages(cutoffTime);
                console.log(`🧹 [RETRY_SERVICE] Limpiados ${cleanedCount} mensajes fallidos antiguos`);
                return cleanedCount;
            }
            catch (error) {
                console.error('❌ [RETRY_SERVICE] Error limpiando mensajes antiguos:', error);
                return 0;
            }
        });
    }
    /**
     * Obtener mensajes fallidos con paginación
     */
    getFailedMessages() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            try {
                console.log(`🔍 [RETRY_SERVICE] Obteniendo mensajes fallidos (limit: ${limit}, offset: ${offset})`);
                const failedMessages = yield database_service_1.databaseService.getFailedMessages();
                // Aplicar paginación manual
                const paginatedMessages = failedMessages.slice(offset, offset + limit);
                console.log(`✅ [RETRY_SERVICE] Mensajes fallidos obtenidos: ${paginatedMessages.length}/${failedMessages.length}`);
                return paginatedMessages;
            }
            catch (error) {
                console.error('❌ [RETRY_SERVICE] Error obteniendo mensajes fallidos:', error);
                return [];
            }
        });
    }
    /**
     * Reintentar mensaje fallido por ID
     */
    retryFailedMessage(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = parseInt(messageId);
                if (isNaN(id)) {
                    console.error(`❌ [RETRY_SERVICE] ID de mensaje inválido: ${messageId}`);
                    return null;
                }
                console.log(`🔄 [RETRY_SERVICE] Reintentando mensaje fallido: ${id}`);
                const result = yield this.retryMessageById(id);
                if (result.success) {
                    console.log(`✅ [RETRY_SERVICE] Mensaje ${id} reenviado exitosamente`);
                }
                else {
                    console.error(`❌ [RETRY_SERVICE] Fallo al reenviar mensaje ${id}:`, result.error);
                }
                return result;
            }
            catch (error) {
                console.error(`❌ [RETRY_SERVICE] Error reintentando mensaje ${messageId}:`, error);
                return null;
            }
        });
    }
    /**
     * Limpiar todos los mensajes fallidos
     */
    clearAllFailedMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🧹 [RETRY_SERVICE] Limpiando todos los mensajes fallidos');
                const failedMessages = yield database_service_1.databaseService.getFailedMessages();
                let removedCount = 0;
                for (const message of failedMessages) {
                    try {
                        const success = yield database_service_1.databaseService.updateMessageStatus(message.id, 'deleted');
                        if (success) {
                            removedCount++;
                        }
                    }
                    catch (error) {
                        console.error(`❌ [RETRY_SERVICE] Error eliminando mensaje ${message.id}:`, error);
                    }
                }
                console.log(`✅ [RETRY_SERVICE] Limpieza completada: ${removedCount} mensajes eliminados`);
                return removedCount;
            }
            catch (error) {
                console.error('❌ [RETRY_SERVICE] Error en limpieza total:', error);
                return 0;
            }
        });
    }
    /**
     * Utilidades auxiliares
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Destruir el servicio
     */
    destroy() {
        this.stopAutoRetry();
        console.log('🗑️ [RETRY_SERVICE] Servicio destruido');
    }
}
exports.FailedMessageRetryService = FailedMessageRetryService;
// Instancia singleton
exports.failedMessageRetryService = new FailedMessageRetryService();
