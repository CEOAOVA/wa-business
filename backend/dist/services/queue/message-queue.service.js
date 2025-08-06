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
exports.getMessageQueueService = exports.MessageQueueService = void 0;
// ✅ SERVICIO DE COLAS CON BULL - IMPLEMENTADO
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../../config/logger");
const whatsapp_service_1 = require("../whatsapp.service");
const chatbot_service_1 = require("../chatbot.service");
const config_1 = require("../../config");
class MessageQueueService {
    constructor() {
        this.MAX_RETRIES = 3;
        this.config = (0, config_1.getConfig)();
        // Redis configuration
        this.redisConfig = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                reconnectOnError: () => true
            },
            defaultJobOptions: {
                attempts: this.MAX_RETRIES,
                backoff: {
                    type: 'exponential',
                    delay: 2000 // Delay inicial
                },
                removeOnComplete: 100, // Mantener últimos 100 trabajos completados
                removeOnFail: 50 // Mantener últimos 50 trabajos fallidos
            }
        };
        this.whatsappService = null;
        this.chatbotService = null;
        this.messageQueue = new bull_1.default('whatsapp-messages', this.redisConfig);
        this.chatbotQueue = new bull_1.default('chatbot-processing', this.redisConfig);
        this.setupProcessors();
        this.setupEventListeners();
        logger_1.logger.info('✅ Servicio de colas inicializado con Bull');
    }
    /**
     * Configurar procesadores de trabajos
     */
    setupProcessors() {
        // Procesador para mensajes de WhatsApp
        this.messageQueue.process('send-message', 5, (job) => __awaiter(this, void 0, void 0, function* () {
            const { to, message, type, conversationId, mediaUrl } = job.data;
            logger_1.logger.info(`[Queue] Procesando mensaje ${job.id}`, { to, type });
            try {
                // Lazy load WhatsApp service
                if (!this.whatsappService) {
                    this.whatsappService = new whatsapp_service_1.WhatsAppService();
                }
                const result = yield this.whatsappService.sendMessage({
                    to,
                    message,
                    clientId: conversationId || 'system',
                    type: type === 'text' ? 'text' : undefined // Solo soporta 'text' por ahora
                });
                if (!result.success) {
                    throw new Error(result.error || 'Error enviando mensaje');
                }
                logger_1.logger.info(`✅ [Queue] Mensaje enviado exitosamente ${job.id}`);
                return result;
            }
            catch (error) {
                logger_1.logger.error(`❌ [Queue] Error procesando mensaje ${job.id}`, { error });
                // Si es error de rate limit, reintentamos con delay mayor
                if (error instanceof Error && error.message.includes('rate limit')) {
                    // Bull manejará el retry con backoff exponencial automáticamente
                    throw new Error('Rate limit alcanzado, reintentando...');
                }
                throw error;
            }
        }));
        // Procesador para chatbot
        this.chatbotQueue.process('process-message', 3, (job) => __awaiter(this, void 0, void 0, function* () {
            const { phoneNumber, message, contactName, conversationId } = job.data;
            logger_1.logger.info(`[Queue] Procesando mensaje de chatbot ${job.id}`, { phoneNumber });
            try {
                // Lazy load Chatbot service
                if (!this.chatbotService) {
                    this.chatbotService = new chatbot_service_1.ChatbotService();
                }
                const response = yield this.chatbotService.processWhatsAppMessage(phoneNumber, message);
                // Si el chatbot genera una respuesta, la encolamos para envío
                if (response.shouldSend && response.response) {
                    yield this.addMessage({
                        to: phoneNumber,
                        message: response.response,
                        type: 'text',
                        conversationId,
                        priority: 0 // Prioridad normal para mensajes del chatbot
                    });
                }
                logger_1.logger.info(`✅ [Queue] Mensaje de chatbot procesado ${job.id}`);
                return response;
            }
            catch (error) {
                logger_1.logger.error(`❌ [Queue] Error procesando chatbot ${job.id}`, { error });
                throw error;
            }
        }));
    }
    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Eventos de la cola de mensajes
        this.messageQueue.on('completed', (job, result) => {
            logger_1.logger.debug(`[Queue] Trabajo completado: ${job.id}`, { result });
        });
        this.messageQueue.on('failed', (job, error) => {
            logger_1.logger.error(`[Queue] Trabajo fallido: ${job.id}`, {
                error: error.message,
                attempts: job.attemptsMade
            });
        });
        this.messageQueue.on('stalled', (job) => {
            logger_1.logger.warn(`[Queue] Trabajo estancado: ${job.id}`);
        });
        // Eventos de la cola del chatbot
        this.chatbotQueue.on('completed', (job, result) => {
            logger_1.logger.debug(`[Queue] Chatbot procesado: ${job.id}`);
        });
        this.chatbotQueue.on('failed', (job, error) => {
            logger_1.logger.error(`[Queue] Chatbot fallido: ${job.id}`, { error: error.message });
        });
        // Eventos globales
        this.messageQueue.on('error', (error) => {
            logger_1.logger.error('[Queue] Error en cola de mensajes', { error });
        });
        this.chatbotQueue.on('error', (error) => {
            logger_1.logger.error('[Queue] Error en cola de chatbot', { error });
        });
    }
    /**
     * Agregar mensaje a la cola
     */
    addMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const jobOptions = {
                    priority: data.priority || 0,
                    delay: 0,
                    attempts: this.MAX_RETRIES
                };
                // Si es mensaje prioritario, procesarlo primero
                if (data.priority && data.priority > 0) {
                    jobOptions.lifo = true; // Last In First Out para prioridad
                }
                const job = yield this.messageQueue.add('send-message', data, jobOptions);
                logger_1.logger.info(`✅ Mensaje agregado a cola: ${job.id}`, {
                    to: data.to,
                    priority: data.priority
                });
                return job.id;
            }
            catch (error) {
                logger_1.logger.error('Error agregando mensaje a cola', { error, data });
                throw error;
            }
        });
    }
    /**
     * Agregar mensaje de chatbot a la cola
     */
    addChatbotMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const job = yield this.chatbotQueue.add('process-message', data, {
                    attempts: 2, // Menos reintentos para chatbot
                    backoff: {
                        type: 'fixed',
                        delay: 1000
                    }
                });
                logger_1.logger.info(`✅ Mensaje de chatbot agregado a cola: ${job.id}`, {
                    phoneNumber: data.phoneNumber
                });
                return job.id;
            }
            catch (error) {
                logger_1.logger.error('Error agregando mensaje de chatbot a cola', { error, data });
                throw error;
            }
        });
    }
    /**
     * Obtener estadísticas de las colas
     */
    getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [msgWaiting, msgActive, msgCompleted, msgFailed, msgDelayed, msgPaused, botWaiting, botActive, botCompleted, botFailed, botDelayed, botPaused] = yield Promise.all([
                    this.messageQueue.getWaitingCount(),
                    this.messageQueue.getActiveCount(),
                    this.messageQueue.getCompletedCount(),
                    this.messageQueue.getFailedCount(),
                    this.messageQueue.getDelayedCount(),
                    this.messageQueue.isPaused(),
                    this.chatbotQueue.getWaitingCount(),
                    this.chatbotQueue.getActiveCount(),
                    this.chatbotQueue.getCompletedCount(),
                    this.chatbotQueue.getFailedCount(),
                    this.chatbotQueue.getDelayedCount(),
                    this.chatbotQueue.isPaused()
                ]);
                return {
                    messages: {
                        waiting: msgWaiting,
                        active: msgActive,
                        completed: msgCompleted,
                        failed: msgFailed,
                        delayed: msgDelayed,
                        paused: msgPaused
                    },
                    chatbot: {
                        waiting: botWaiting,
                        active: botActive,
                        completed: botCompleted,
                        failed: botFailed,
                        delayed: botDelayed,
                        paused: botPaused
                    }
                };
            }
            catch (error) {
                logger_1.logger.error('Error obteniendo estadísticas de colas', { error });
                throw error;
            }
        });
    }
    /**
     * Limpiar trabajos completados
     */
    cleanCompleted() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [msgCleaned, botCleaned] = yield Promise.all([
                    this.messageQueue.clean(1000, 'completed'),
                    this.chatbotQueue.clean(1000, 'completed')
                ]);
                logger_1.logger.info(`✅ Limpiados ${msgCleaned.length} mensajes y ${botCleaned.length} trabajos de chatbot`);
            }
            catch (error) {
                logger_1.logger.error('Error limpiando trabajos completados', { error });
            }
        });
    }
    /**
     * Limpiar trabajos fallidos
     */
    cleanFailed() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [msgCleaned, botCleaned] = yield Promise.all([
                    this.messageQueue.clean(1000, 'failed'),
                    this.chatbotQueue.clean(1000, 'failed')
                ]);
                logger_1.logger.info(`✅ Limpiados ${msgCleaned.length} mensajes fallidos y ${botCleaned.length} trabajos de chatbot fallidos`);
            }
            catch (error) {
                logger_1.logger.error('Error limpiando trabajos fallidos', { error });
            }
        });
    }
    /**
     * Pausar colas
     */
    pauseQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.messageQueue.pause(),
                this.chatbotQueue.pause()
            ]);
            logger_1.logger.info('⏸️ Colas pausadas');
        });
    }
    /**
     * Reanudar colas
     */
    resumeQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.messageQueue.resume(),
                this.chatbotQueue.resume()
            ]);
            logger_1.logger.info('▶️ Colas reanudadas');
        });
    }
    /**
     * Obtener trabajo por ID
     */
    getJob(queueName, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = queueName === 'messages' ? this.messageQueue : this.chatbotQueue;
            return yield queue.getJob(jobId);
        });
    }
    /**
     * Reintentar trabajo fallido
     */
    retryJob(queueName, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield this.getJob(queueName, jobId);
            if (job && job.failedReason) {
                yield job.retry();
                logger_1.logger.info(`🔄 Reintentando trabajo ${jobId}`);
            }
        });
    }
    /**
     * Cerrar conexiones
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.messageQueue.close(),
                this.chatbotQueue.close()
            ]);
            logger_1.logger.info('✅ Colas cerradas correctamente');
        });
    }
    /**
     * Limpiar todas las colas (¡CUIDADO!)
     */
    obliterate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('No se puede limpiar colas en producción');
            }
            yield Promise.all([
                this.messageQueue.obliterate({ force: true }),
                this.chatbotQueue.obliterate({ force: true })
            ]);
            logger_1.logger.warn('⚠️ Todas las colas han sido limpiadas completamente');
        });
    }
}
exports.MessageQueueService = MessageQueueService;
// Singleton
let messageQueueService = null;
const getMessageQueueService = () => {
    if (!messageQueueService) {
        messageQueueService = new MessageQueueService();
    }
    return messageQueueService;
};
exports.getMessageQueueService = getMessageQueueService;
exports.default = MessageQueueService;
