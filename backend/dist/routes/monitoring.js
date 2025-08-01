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
const express_1 = require("express");
const monitoring_service_1 = require("../services/monitoring/monitoring-service");
const bulkhead_service_1 = require("../services/resilience/bulkhead.service");
const circuit_breaker_service_1 = require("../services/circuit-breaker/circuit-breaker.service");
const router = (0, express_1.Router)();
/**
 * GET /api/monitoring/health
 * Health check del sistema
 */
router.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const healthReport = monitoring_service_1.monitoringService.generateHealthReport();
        res.json(Object.assign({ success: true, timestamp: new Date().toISOString() }, healthReport));
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error generando health report',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * GET /api/monitoring/metrics
 * Métricas actuales del sistema
 */
router.get('/metrics', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metrics = monitoring_service_1.monitoringService.getMetrics();
        const bulkheadMetrics = bulkhead_service_1.bulkheadService.getAllMetrics();
        const bulkheadStatus = bulkhead_service_1.bulkheadService.getAllStatus();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: Object.assign(Object.assign({}, metrics), { bulkhead: {
                    metrics: bulkheadMetrics,
                    status: bulkheadStatus
                }, circuitBreakers: {
                    supabase: circuit_breaker_service_1.supabaseCircuitBreaker.getMetrics(),
                    soap: circuit_breaker_service_1.soapCircuitBreaker.getMetrics(),
                    whatsapp: circuit_breaker_service_1.whatsappCircuitBreaker.getMetrics()
                } })
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo métricas',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * GET /api/monitoring/alerts
 * Alertas activas del sistema
 */
router.get('/alerts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const metrics = monitoring_service_1.monitoringService.getMetrics();
        const alerts = metrics.alerts;
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            alerts: {
                total: alerts.length,
                critical: alerts.filter((a) => a.type === 'critical').length,
                error: alerts.filter((a) => a.type === 'error').length,
                warning: alerts.filter((a) => a.type === 'warning').length,
                list: alerts
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo alertas',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * POST /api/monitoring/alerts/:alertId/resolve
 * Resolver una alerta específica
 */
router.post('/alerts/:alertId/resolve', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { alertId } = req.params;
        monitoring_service_1.monitoringService.resolveAlert(alertId);
        res.json({
            success: true,
            message: 'Alerta resuelta correctamente',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error resolviendo alerta',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * GET /api/monitoring/history
 * Historial de métricas
 */
router.get('/history', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { hours = 1 } = req.query;
        const history = monitoring_service_1.monitoringService.getMetricsHistory();
        // Filtrar por horas si se especifica
        const cutoffTime = Date.now() - (parseInt(hours) * 60 * 60 * 1000);
        const filteredHistory = {
            webSocket: history.webSocket.filter((entry) => entry.lastHeartbeat.getTime() > cutoffTime),
            supabase: history.supabase.filter((entry) => entry.lastHealthCheck.getTime() > cutoffTime),
            system: history.system.filter((entry) => entry.uptime > (process.uptime() - parseInt(hours) * 3600))
        };
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            hours: parseInt(hours),
            history: filteredHistory
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo historial',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * GET /api/monitoring/status
 * Estado general del sistema
 */
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const healthReport = monitoring_service_1.monitoringService.generateHealthReport();
        const metrics = monitoring_service_1.monitoringService.getMetrics();
        const bulkheadStatus = bulkhead_service_1.bulkheadService.getAllStatus();
        // Calcular uptime
        const uptime = process.uptime();
        const uptimeFormatted = {
            seconds: Math.floor(uptime),
            minutes: Math.floor(uptime / 60),
            hours: Math.floor(uptime / 3600),
            days: Math.floor(uptime / 86400)
        };
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            status: {
                health: healthReport.status,
                uptime: uptimeFormatted,
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024)
                },
                websocket: {
                    activeConnections: metrics.webSocket.activeConnections,
                    averageLatency: metrics.webSocket.averageLatency,
                    heartbeatSuccessRate: metrics.webSocket.heartbeatSuccessRate
                },
                supabase: {
                    poolUtilization: metrics.supabase.poolUtilization,
                    activeConnections: metrics.supabase.activeConnections,
                    errorRate: metrics.supabase.errorRate
                },
                bulkhead: bulkheadStatus,
                alerts: {
                    total: metrics.alerts.length,
                    critical: metrics.alerts.filter((a) => a.type === 'critical').length
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del sistema',
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * POST /api/monitoring/cleanup
 * Limpiar datos antiguos y bulkheads inactivos
 */
router.post('/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Limpiar bulkheads inactivos
        bulkhead_service_1.bulkheadService.cleanup();
        res.json({
            success: true,
            message: 'Cleanup completado',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error durante cleanup',
            timestamp: new Date().toISOString()
        });
    }
}));
exports.default = router;
