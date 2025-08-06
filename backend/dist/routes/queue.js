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
// ✅ RUTAS DE MONITOREO DE COLAS - IMPLEMENTADO
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const message_queue_service_1 = require("../services/queue/message-queue.service");
const logger_1 = require("../config/logger");
const router = express_1.default.Router();
/**
 * GET /api/queue/stats
 * Obtener estadísticas de las colas
 */
router.get('/stats', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        const stats = yield queueService.getQueueStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo estadísticas de colas', { error });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
}));
/**
 * POST /api/queue/clean/completed
 * Limpiar trabajos completados
 */
router.post('/clean/completed', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        yield queueService.cleanCompleted();
        res.json({
            success: true,
            message: 'Trabajos completados limpiados'
        });
    }
    catch (error) {
        logger_1.logger.error('Error limpiando trabajos completados', { error });
        res.status(500).json({
            success: false,
            error: 'Error limpiando trabajos'
        });
    }
}));
/**
 * POST /api/queue/clean/failed
 * Limpiar trabajos fallidos
 */
router.post('/clean/failed', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        yield queueService.cleanFailed();
        res.json({
            success: true,
            message: 'Trabajos fallidos limpiados'
        });
    }
    catch (error) {
        logger_1.logger.error('Error limpiando trabajos fallidos', { error });
        res.status(500).json({
            success: false,
            error: 'Error limpiando trabajos'
        });
    }
}));
/**
 * POST /api/queue/pause
 * Pausar todas las colas
 */
router.post('/pause', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        yield queueService.pauseQueues();
        res.json({
            success: true,
            message: 'Colas pausadas'
        });
    }
    catch (error) {
        logger_1.logger.error('Error pausando colas', { error });
        res.status(500).json({
            success: false,
            error: 'Error pausando colas'
        });
    }
}));
/**
 * POST /api/queue/resume
 * Reanudar todas las colas
 */
router.post('/resume', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        yield queueService.resumeQueues();
        res.json({
            success: true,
            message: 'Colas reanudadas'
        });
    }
    catch (error) {
        logger_1.logger.error('Error reanudando colas', { error });
        res.status(500).json({
            success: false,
            error: 'Error reanudando colas'
        });
    }
}));
/**
 * GET /api/queue/job/:queue/:jobId
 * Obtener detalles de un trabajo específico
 */
router.get('/job/:queue/:jobId', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { queue, jobId } = req.params;
        if (queue !== 'messages' && queue !== 'chatbot') {
            return res.status(400).json({
                success: false,
                error: 'Cola inválida. Use "messages" o "chatbot"'
            });
        }
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        const job = yield queueService.getJob(queue, jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Trabajo no encontrado'
            });
        }
        res.json({
            success: true,
            data: {
                id: job.id,
                data: job.data,
                progress: job.progress(),
                attemptsMade: job.attemptsMade,
                failedReason: job.failedReason,
                timestamp: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo trabajo', { error });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo trabajo'
        });
    }
}));
/**
 * POST /api/queue/retry/:queue/:jobId
 * Reintentar un trabajo fallido
 */
router.post('/retry/:queue/:jobId', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { queue, jobId } = req.params;
        if (queue !== 'messages' && queue !== 'chatbot') {
            return res.status(400).json({
                success: false,
                error: 'Cola inválida. Use "messages" o "chatbot"'
            });
        }
        const queueService = (0, message_queue_service_1.getMessageQueueService)();
        yield queueService.retryJob(queue, jobId);
        res.json({
            success: true,
            message: 'Trabajo programado para reintento'
        });
    }
    catch (error) {
        logger_1.logger.error('Error reintentando trabajo', { error });
        res.status(500).json({
            success: false,
            error: 'Error reintentando trabajo'
        });
    }
}));
exports.default = router;
