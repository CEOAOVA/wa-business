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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rutas para monitoreo de colas Bull
 */
const express_1 = require("express");
const auth_jwt_1 = require("../middleware/auth-jwt");
const bull_queue_service_1 = require("../services/bull-queue.service");
const router = (0, express_1.Router)();
/**
 * GET /api/queue/stats
 * Obtener estadísticas de las colas
 */
router.get('/stats', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield bull_queue_service_1.bullQueueService.getQueueStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
/**
 * POST /api/queue/pause
 * Pausar procesamiento de colas
 */
router.post('/pause', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Solo admins pueden pausar
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No autorizado'
            });
        }
        yield bull_queue_service_1.bullQueueService.pauseQueues();
        res.json({
            success: true,
            message: 'Colas pausadas'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
/**
 * POST /api/queue/resume
 * Reanudar procesamiento de colas
 */
router.post('/resume', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Solo admins pueden reanudar
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No autorizado'
            });
        }
        yield bull_queue_service_1.bullQueueService.resumeQueues();
        res.json({
            success: true,
            message: 'Colas reanudadas'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
/**
 * DELETE /api/queue/clear
 * Limpiar todas las colas (PELIGROSO)
 */
router.delete('/clear', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Solo admins pueden limpiar
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'No autorizado'
            });
        }
        // Confirmación requerida
        if (req.body.confirm !== 'CLEAR_ALL_QUEUES') {
            return res.status(400).json({
                success: false,
                error: 'Confirmación requerida: confirm=CLEAR_ALL_QUEUES'
            });
        }
        yield bull_queue_service_1.bullQueueService.clearQueues();
        res.json({
            success: true,
            message: 'Todas las colas han sido limpiadas'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
exports.default = router;
