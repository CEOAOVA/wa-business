"use strict";
/**
 * Sistema de monitoreo avanzado para WhatsApp Business LLM
 * Incluye health checks, métricas, alertas y dashboard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const events_1 = require("events");
class MonitoringService extends events_1.EventEmitter {
    constructor() {
        super();
        // Métricas en tiempo real
        this.webSocketMetrics = {
            activeConnections: 0,
            totalConnections: 0,
            disconnectedConnections: 0,
            averageLatency: 0,
            heartbeatSuccessRate: 100,
            reconnectAttempts: 0,
            failedReconnects: 0,
            lastHeartbeat: new Date()
        };
        this.supabaseMetrics = {
            poolUtilization: 0,
            activeConnections: 0,
            totalConnections: 0,
            failedConnections: 0,
            averageQueryTime: 0,
            slowQueries: 0,
            errorRate: 0,
            lastHealthCheck: new Date()
        };
        this.circuitBreakerMetrics = {
            supabaseTrips: 0,
            soapTrips: 0,
            whatsappTrips: 0,
            totalTrips: 0,
            recoveryTime: 0,
            lastTrip: new Date()
        };
        this.systemMetrics = {
            memoryUsage: process.memoryUsage(),
            cpuUsage: 0,
            uptime: process.uptime(),
            activeSessions: 0,
            totalRequests: 0,
            errorRate: 0
        };
        this.alerts = [];
        this.metricsHistory = {
            webSocket: [],
            supabase: [],
            system: []
        };
        this.MAX_HISTORY_SIZE = 1000;
        this.ALERT_THRESHOLDS = {
            webSocketLatency: 1000, // 1 segundo
            webSocketErrorRate: 10, // 10%
            supabaseUtilization: 80, // 80%
            supabaseErrorRate: 5, // 5%
            memoryUsage: 85, // 85%
            circuitBreakerTrips: 5 // 5 trips por hora
        };
        this.startMetricsCollection();
        this.startAlertMonitoring();
    }
    static getInstance() {
        if (!MonitoringService.instance) {
            MonitoringService.instance = new MonitoringService();
        }
        return MonitoringService.instance;
    }
    /**
     * Actualizar métricas de WebSocket
     */
    updateWebSocketMetrics(metrics) {
        this.webSocketMetrics = Object.assign(Object.assign({}, this.webSocketMetrics), metrics);
        this.webSocketMetrics.lastHeartbeat = new Date();
        // Guardar en historial
        this.metricsHistory.webSocket.push(Object.assign({}, this.webSocketMetrics));
        if (this.metricsHistory.webSocket.length > this.MAX_HISTORY_SIZE) {
            this.metricsHistory.webSocket.shift();
        }
        // Verificar alertas
        this.checkWebSocketAlerts();
        // Emitir evento
        this.emit('websocket-metrics-updated', this.webSocketMetrics);
    }
    /**
     * Actualizar métricas de Supabase
     */
    updateSupabaseMetrics(metrics) {
        this.supabaseMetrics = Object.assign(Object.assign({}, this.supabaseMetrics), metrics);
        this.supabaseMetrics.lastHealthCheck = new Date();
        // Guardar en historial
        this.metricsHistory.supabase.push(Object.assign({}, this.supabaseMetrics));
        if (this.metricsHistory.supabase.length > this.MAX_HISTORY_SIZE) {
            this.metricsHistory.supabase.shift();
        }
        // Verificar alertas
        this.checkSupabaseAlerts();
        // Emitir evento
        this.emit('supabase-metrics-updated', this.supabaseMetrics);
    }
    /**
     * Actualizar métricas del Circuit Breaker
     */
    updateCircuitBreakerMetrics(metrics) {
        this.circuitBreakerMetrics = Object.assign(Object.assign({}, this.circuitBreakerMetrics), metrics);
        // Verificar alertas
        this.checkCircuitBreakerAlerts();
        // Emitir evento
        this.emit('circuit-breaker-metrics-updated', this.circuitBreakerMetrics);
    }
    /**
     * Registrar alerta
     */
    createAlert(type, message) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            timestamp: new Date(),
            resolved: false
        };
        this.alerts.push(alert);
        // Mantener solo las últimas 100 alertas
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
        console.log(`🚨 [Monitoring] Alerta ${type.toUpperCase()}: ${message}`);
        this.emit('alert-created', alert);
    }
    /**
     * Resolver alerta
     */
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date();
            this.emit('alert-resolved', alert);
        }
    }
    /**
     * Obtener métricas actuales
     */
    getMetrics() {
        return {
            webSocket: this.webSocketMetrics,
            supabase: this.supabaseMetrics,
            circuitBreaker: this.circuitBreakerMetrics,
            system: this.systemMetrics,
            alerts: this.alerts.filter(a => !a.resolved)
        };
    }
    /**
     * Obtener historial de métricas
     */
    getMetricsHistory() {
        return this.metricsHistory;
    }
    /**
     * Verificar alertas de WebSocket
     */
    checkWebSocketAlerts() {
        const { averageLatency, heartbeatSuccessRate, failedReconnects } = this.webSocketMetrics;
        if (averageLatency > this.ALERT_THRESHOLDS.webSocketLatency) {
            this.createAlert('warning', `Latencia de WebSocket alta: ${averageLatency}ms`);
        }
        if (heartbeatSuccessRate < (100 - this.ALERT_THRESHOLDS.webSocketErrorRate)) {
            this.createAlert('error', `Tasa de éxito de heartbeat baja: ${heartbeatSuccessRate}%`);
        }
        if (failedReconnects > 10) {
            this.createAlert('critical', `Muchos reintentos fallidos de WebSocket: ${failedReconnects}`);
        }
    }
    /**
     * Verificar alertas de Supabase
     */
    checkSupabaseAlerts() {
        const { poolUtilization, errorRate, averageQueryTime } = this.supabaseMetrics;
        if (poolUtilization > this.ALERT_THRESHOLDS.supabaseUtilization) {
            this.createAlert('warning', `Utilización del pool de Supabase alta: ${poolUtilization}%`);
        }
        if (errorRate > this.ALERT_THRESHOLDS.supabaseErrorRate) {
            this.createAlert('error', `Tasa de error de Supabase alta: ${errorRate}%`);
        }
        if (averageQueryTime > 5000) {
            this.createAlert('warning', `Tiempo promedio de consulta lento: ${averageQueryTime}ms`);
        }
    }
    /**
     * Verificar alertas del Circuit Breaker
     */
    checkCircuitBreakerAlerts() {
        const { totalTrips } = this.circuitBreakerMetrics;
        if (totalTrips > this.ALERT_THRESHOLDS.circuitBreakerTrips) {
            this.createAlert('critical', `Muchos trips del Circuit Breaker: ${totalTrips}`);
        }
    }
    /**
     * Recolectar métricas del sistema
     */
    startMetricsCollection() {
        setInterval(() => {
            // Actualizar métricas del sistema
            this.systemMetrics = {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage().user / 1000000, // Convertir a segundos
                uptime: process.uptime(),
                activeSessions: this.webSocketMetrics.activeConnections,
                totalRequests: this.systemMetrics.totalRequests + 1,
                errorRate: this.systemMetrics.errorRate
            };
            // Verificar uso de memoria
            const memoryUsagePercent = (this.systemMetrics.memoryUsage.heapUsed / this.systemMetrics.memoryUsage.heapTotal) * 100;
            if (memoryUsagePercent > this.ALERT_THRESHOLDS.memoryUsage) {
                this.createAlert('warning', `Uso de memoria alto: ${memoryUsagePercent.toFixed(2)}%`);
            }
            // Guardar en historial
            this.metricsHistory.system.push(Object.assign({}, this.systemMetrics));
            if (this.metricsHistory.system.length > this.MAX_HISTORY_SIZE) {
                this.metricsHistory.system.shift();
            }
            this.emit('system-metrics-updated', this.systemMetrics);
        }, 30000); // Cada 30 segundos
    }
    /**
     * Monitoreo continuo de alertas
     */
    startAlertMonitoring() {
        setInterval(() => {
            // Verificar alertas antiguas no resueltas
            const oldAlerts = this.alerts.filter(alert => !alert.resolved &&
                Date.now() - alert.timestamp.getTime() > 300000 // 5 minutos
            );
            oldAlerts.forEach(alert => {
                if (alert.type === 'critical') {
                    console.error(`🚨 [Monitoring] Alerta crítica sin resolver: ${alert.message}`);
                }
            });
        }, 60000); // Cada minuto
    }
    /**
     * Generar reporte de salud del sistema
     */
    generateHealthReport() {
        const alerts = this.alerts.filter(a => !a.resolved);
        const criticalAlerts = alerts.filter(a => a.type === 'critical');
        const warningAlerts = alerts.filter(a => a.type === 'warning');
        let status = 'healthy';
        let summary = 'Sistema funcionando correctamente';
        if (criticalAlerts.length > 0) {
            status = 'critical';
            summary = `${criticalAlerts.length} alertas críticas activas`;
        }
        else if (warningAlerts.length > 0) {
            status = 'warning';
            summary = `${warningAlerts.length} alertas de advertencia activas`;
        }
        return {
            status,
            summary,
            details: {
                alerts: alerts.length,
                criticalAlerts: criticalAlerts.length,
                warningAlerts: warningAlerts.length,
                webSocket: this.webSocketMetrics,
                supabase: this.supabaseMetrics,
                system: this.systemMetrics
            }
        };
    }
}
exports.MonitoringService = MonitoringService;
// Exportar instancia singleton
exports.monitoringService = MonitoringService.getInstance();
