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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bullQueueService = exports.BullQueueService = void 0;
/**
 * Servicio de cola con Bull para procesamiento asíncrono robusto
 */
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../utils/logger");
const whatsapp_service_1 = require("./whatsapp.service");
const database_service_1 = require("./database.service");
const socket_service_1 = require("./socket.service");
// Configuración de Redis
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};
/**
 * Servicio de cola con Bull para procesamiento de mensajes
 */
class BullQueueService {
    constructor() {
        this.processedMessages = new Set();
        this.deduplicationTTL = 3600000; // 1 hora en ms
        // Crear colas separadas para diferentes tipos de trabajo
        this.webhookQueue = new bull_1.default('webhook-processing', {
            redis: redisConfig,
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 500,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });
        this.messageQueue = new bull_1.default('message-sending', {
            redis: redisConfig,
            defaultJobOptions: {
                removeOnComplete: 50,
                removeOnFail: 100,
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            }
        });
        this.setupProcessors();
        this.setupEventHandlers();
        this.startCleanupJob();
        logger_1.logger.info('Bull Queue Service inicializado');
    }
    static getInstance() {
        if (!BullQueueService.instance) {
            BullQueueService.instance = new BullQueueService();
        }
        return BullQueueService.instance;
    }
    /**
     * Agregar webhook a la cola para procesamiento asíncrono
     */
    addWebhookToQueue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Extraer messageId si existe
                const messageId = this.extractMessageId(data.payload);
                // Deduplicación por messageId
                if (messageId) {
                    if (this.processedMessages.has(messageId)) {
                        logger_1.logger.debug(`Mensaje duplicado ignorado: ${messageId}`);
                        return `duplicate_${messageId}`;
                    }
                    // Marcar como procesado
                    this.processedMessages.add(messageId);
                    data.messageId = messageId;
                    // Programar limpieza
                    setTimeout(() => {
                        this.processedMessages.delete(messageId);
                    }, this.deduplicationTTL);
                }
                // Determinar prioridad y opciones
                const jobOptions = {
                    priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2,
                    delay: 0
                };
                // Agregar a la cola
                const job = yield this.webhookQueue.add(data, jobOptions);
                logger_1.logger.debug(`Webhook agregado a cola: ${job.id}`, {
                    requestId: data.requestId,
                    messageId: messageId || undefined,
                    priority: data.priority
                });
                return job.id || String(job.id);
            }
            catch (error) {
                logger_1.logger.error('Error agregando webhook a cola', error);
                throw error;
            }
        });
    }
    /**
     * Agregar mensaje saliente a la cola
     */
    addMessageToQueue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const job = yield this.messageQueue.add(data, {
                    priority: 1,
                    delay: 0
                });
                logger_1.logger.debug(`Mensaje agregado a cola de envío: ${job.id}`);
                return job.id;
            }
            catch (error) {
                logger_1.logger.error('Error agregando mensaje a cola', error);
                throw error;
            }
        });
    }
    /**
     * Configurar procesadores de trabajos
     */
    setupProcessors() {
        // Procesador de webhooks
        this.webhookQueue.process(10, (job) => __awaiter(this, void 0, void 0, function* () {
            const { requestId, payload, messageId } = job.data;
            try {
                logger_1.logger.debug(`Procesando webhook ${requestId}`);
                // Procesar el webhook
                yield whatsapp_service_1.whatsappService.processWebhook({
                    requestId,
                    payload,
                    messageId
                });
                logger_1.logger.info(`Webhook procesado exitosamente: ${requestId}`);
                return { success: true, requestId };
            }
            catch (error) {
                logger_1.logger.error(`Error procesando webhook ${requestId}`, error);
                // Si es el último intento, guardar en tabla de errores
                if (job.attemptsMade >= (job.opts.attempts || 3)) {
                    yield this.saveFailedWebhook(job.data, error);
                }
                throw error;
            }
        }));
        // Procesador de mensajes salientes
        this.messageQueue.process(5, (job) => __awaiter(this, void 0, void 0, function* () {
            const { to, message, clientId } = job.data;
            try {
                logger_1.logger.debug(`Enviando mensaje a ${to}`);
                const result = yield whatsapp_service_1.whatsappService.sendMessage({
                    to,
                    message,
                    clientId
                });
                if (!result.success) {
                    throw new Error(result.error || 'Error enviando mensaje');
                }
                logger_1.logger.info(`Mensaje enviado exitosamente a ${to}`);
                return result;
            }
            catch (error) {
                logger_1.logger.error(`Error enviando mensaje a ${to}`, error);
                // Si es el último intento, notificar via Socket
                if (job.attemptsMade >= (job.opts.attempts || 5)) {
                    socket_service_1.socketService.emitGlobal('message_failed', {
                        to,
                        clientId,
                        error: error.message
                    });
                }
                throw error;
            }
        }));
    }
    /**
     * Configurar manejadores de eventos
     */
    setupEventHandlers() {
        // Eventos de webhook queue
        this.webhookQueue.on('completed', (job, result) => {
            logger_1.logger.debug(`Webhook job completado: ${job.id}`);
        });
        this.webhookQueue.on('failed', (job, err) => {
            logger_1.logger.error(`Webhook job falló: ${job.id}`, err);
        });
        this.webhookQueue.on('stalled', (job) => {
            logger_1.logger.warn(`Webhook job stalled: ${job.id}`);
        });
        // Eventos de message queue
        this.messageQueue.on('completed', (job, result) => {
            logger_1.logger.debug(`Message job completado: ${job.id}`);
        });
        this.messageQueue.on('failed', (job, err) => {
            logger_1.logger.error(`Message job falló: ${job.id}`, err);
        });
        // Monitoreo de salud
        setInterval(() => {
            this.logQueueStats();
        }, 60000); // Cada minuto
    }
    /**
     * Extraer messageId del payload de WhatsApp
     */
    extractMessageId(payload) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            if ((_g = (_f = (_e = (_d = (_c = (_b = (_a = payload === null || payload === void 0 ? void 0 : payload.entry) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.changes) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) === null || _e === void 0 ? void 0 : _e.messages) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.id) {
                return payload.entry[0].changes[0].value.messages[0].id;
            }
            return null;
        }
        catch (_h) {
            return null;
        }
    }
    /**
     * Guardar webhook fallido para análisis
     */
    saveFailedWebhook(data, error) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield database_service_1.databaseService.supabase
                    .from('failed_webhooks')
                    .insert({
                    request_id: data.requestId,
                    payload: data.payload,
                    message_id: data.messageId,
                    error_message: error.message,
                    error_stack: error.stack,
                    created_at: new Date().toISOString()
                });
            }
            catch (dbError) {
                logger_1.logger.error('Error guardando webhook fallido', dbError);
            }
        });
    }
    /**
     * Iniciar trabajo de limpieza periódica
     */
    startCleanupJob() {
        // Limpiar trabajos completados cada hora
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const webhookCleaned = yield this.webhookQueue.clean(3600000, 'completed');
                const messageCleaned = yield this.messageQueue.clean(3600000, 'completed');
                logger_1.logger.info('Limpieza de colas completada', {
                    webhookCleaned: webhookCleaned.length,
                    messageCleaned: messageCleaned.length
                });
            }
            catch (error) {
                logger_1.logger.error('Error en limpieza de colas', error);
            }
        }), 3600000); // Cada hora
    }
    /**
     * Obtener estadísticas de las colas
     */
    getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [webhookStats, messageStats] = yield Promise.all([
                this.getQueueInfo(this.webhookQueue),
                this.getQueueInfo(this.messageQueue)
            ]);
            return {
                webhook: webhookStats,
                message: messageStats,
                deduplication: {
                    cachedMessages: this.processedMessages.size
                }
            };
        });
    }
    /**
     * Obtener información de una cola
     */
    getQueueInfo(queue) {
        return __awaiter(this, void 0, void 0, function* () {
            const [waiting, active, completed, failed, delayed] = yield Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount()
            ]);
            return {
                waiting,
                active,
                completed,
                failed,
                delayed,
                total: waiting + active + delayed
            };
        });
    }
    /**
     * Log de estadísticas
     */
    logQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.getQueueStats();
                logger_1.logger.info('Queue Statistics', stats);
            }
            catch (error) {
                logger_1.logger.error('Error obteniendo estadísticas de cola', error);
            }
        });
    }
    /**
     * Pausar procesamiento
     */
    pauseQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.webhookQueue.pause(),
                this.messageQueue.pause()
            ]);
            logger_1.logger.info('Colas pausadas');
        });
    }
    /**
     * Reanudar procesamiento
     */
    resumeQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.webhookQueue.resume(),
                this.messageQueue.resume()
            ]);
            logger_1.logger.info('Colas reanudadas');
        });
    }
    /**
     * Limpiar todas las colas (usar con cuidado)
     */
    clearQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.webhookQueue.empty(),
                this.messageQueue.empty()
            ]);
            this.processedMessages.clear();
            logger_1.logger.warn('Todas las colas han sido limpiadas');
        });
    }
}
exports.BullQueueService = BullQueueService;
// Exportar instancia singleton
exports.bullQueueService = BullQueueService.getInstance();
