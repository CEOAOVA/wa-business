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
const express_1 = __importDefault(require("express"));
const performance_metrics_1 = require("../services/monitoring/performance-metrics");
const memory_monitor_1 = require("../services/monitoring/memory-monitor");
const logger_1 = require("../config/logger");
const router = express_1.default.Router();
// Endpoint para obtener métricas de rendimiento
router.get('/metrics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metrics = performance_metrics_1.performanceMonitor.getMetricsSummary();
        const memoryStats = memory_monitor_1.memoryMonitor.getMemoryStats();
        res.json({
            success: true,
            data: {
                performance: metrics,
                memory: memoryStats,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo métricas', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo métricas del sistema'
        });
    }
}));
// Endpoint para obtener métricas específicas
router.get('/metrics/:name', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const { limit = 100 } = req.query;
        const metrics = performance_metrics_1.performanceMonitor.getMetrics(name, parseInt(limit));
        res.json({
            success: true,
            data: {
                name,
                metrics,
                count: metrics.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo métricas específicas', {
            name: req.params.name,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo métricas específicas'
        });
    }
}));
// Endpoint para obtener thresholds
router.get('/thresholds', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const thresholds = performance_metrics_1.performanceMonitor.getThresholds();
        const thresholdData = {};
        for (const [name, threshold] of thresholds) {
            thresholdData[name] = threshold;
        }
        res.json({
            success: true,
            data: thresholdData
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo thresholds', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo thresholds'
        });
    }
}));
// Endpoint para actualizar thresholds
router.put('/thresholds/:name', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const { warning, critical, action } = req.body;
        if (!warning || !critical || !action) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren warning, critical y action'
            });
        }
        performance_metrics_1.performanceMonitor.setThreshold(name, { warning, critical, action });
        res.json({
            success: true,
            message: `Threshold ${name} actualizado correctamente`
        });
    }
    catch (error) {
        logger_1.logger.error('Error actualizando threshold', {
            name: req.params.name,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Error actualizando threshold'
        });
    }
}));
// Endpoint para limpiar métricas
router.delete('/metrics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.query;
        if (name) {
            performance_metrics_1.performanceMonitor.clearMetrics(name);
        }
        else {
            performance_metrics_1.performanceMonitor.clearMetrics();
        }
        res.json({
            success: true,
            message: name ? `Métricas ${name} limpiadas` : 'Todas las métricas limpiadas'
        });
    }
    catch (error) {
        logger_1.logger.error('Error limpiando métricas', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Error limpiando métricas'
        });
    }
}));
// Endpoint para obtener estado del sistema
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const memoryStats = memory_monitor_1.memoryMonitor.getMemoryStats();
        const latestMetrics = performance_metrics_1.performanceMonitor.getMetricsSummary();
        // Obtener métricas críticas
        const criticalMetrics = {
            memory_usage: ((_a = latestMetrics.memory_usage) === null || _a === void 0 ? void 0 : _a.latest) || 0,
            cpu_usage: ((_b = latestMetrics.cpu_usage) === null || _b === void 0 ? void 0 : _b.latest) || 0,
            network_connections: ((_c = latestMetrics.network_connections) === null || _c === void 0 ? void 0 : _c.latest) || 0,
            websocket_connections: ((_d = latestMetrics.websocket_connections) === null || _d === void 0 ? void 0 : _d.latest) || 0
        };
        // Determinar estado general del sistema
        let systemStatus = 'healthy';
        let issues = [];
        if (criticalMetrics.memory_usage > 90) {
            systemStatus = 'critical';
            issues.push('Uso de memoria crítico');
        }
        else if (criticalMetrics.memory_usage > 80) {
            systemStatus = 'warning';
            issues.push('Uso de memoria alto');
        }
        if (criticalMetrics.cpu_usage > 90) {
            systemStatus = 'critical';
            issues.push('Uso de CPU crítico');
        }
        else if (criticalMetrics.cpu_usage > 70) {
            if (systemStatus === 'healthy')
                systemStatus = 'warning';
            issues.push('Uso de CPU alto');
        }
        res.json({
            success: true,
            data: {
                status: systemStatus,
                issues,
                memory: memoryStats,
                metrics: criticalMetrics,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo estado del sistema', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del sistema'
        });
    }
}));
exports.default = router;
