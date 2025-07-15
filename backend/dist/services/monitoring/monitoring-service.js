"use strict";
/**
 * Sistema de monitoreo avanzado para WhatsApp Business LLM
 * Incluye health checks, métricas, alertas y dashboard
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
exports.monitoringService = exports.MonitoringService = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
const database_1 = require("../../config/database");
const soap_service_1 = require("../soap/soap-service");
class MonitoringService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.healthChecks = new Map();
        this.alerts = [];
        this.responseTimes = [];
        this.isRunning = false;
        this.metricsHistory = [];
        this.config = Object.assign({ healthCheckInterval: 30000, metricsRetentionHours: 24, alertThresholds: {
                responseTime: 5000, // 5 segundos
                errorRate: 5, // 5%
                memoryUsage: 85, // 85%
                diskUsage: 90 // 90%
            }, enableAlerts: true, enableDashboard: true }, config);
        this.initializeMetrics();
        this.registerHealthChecks();
        this.startMonitoring();
    }
    /**
     * Inicializa métricas del sistema
     */
    initializeMetrics() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                rate: 0
            },
            responses: {
                averageTime: 0,
                p95Time: 0,
                p99Time: 0,
                slowestEndpoints: []
            },
            functions: {
                totalCalls: 0,
                successRate: 0,
                averageTime: 0,
                functionStats: new Map()
            },
            conversations: {
                active: 0,
                total: 0,
                averageLength: 0,
                completionRate: 0
            },
            system: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: 0,
                uptime: process.uptime(),
                errors: 0
            }
        };
    }
    /**
     * Registra health checks para servicios críticos
     */
    registerHealthChecks() {
        // Health check para base de datos
        this.healthChecks.set('database', () => __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            try {
                const isHealthy = yield database_1.databaseService.isHealthy();
                const responseTime = Date.now() - start;
                return {
                    service: 'database',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    responseTime,
                    metadata: yield database_1.databaseService.getStats()
                };
            }
            catch (error) {
                return {
                    service: 'database',
                    status: 'unhealthy',
                    responseTime: Date.now() - start,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }));
        // Health check para SOAP services
        this.healthChecks.set('soap', () => __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            try {
                const isHealthy = yield soap_service_1.soapService.testConnection();
                const responseTime = Date.now() - start;
                return {
                    service: 'soap',
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    responseTime
                };
            }
            catch (error) {
                return {
                    service: 'soap',
                    status: 'unhealthy',
                    responseTime: Date.now() - start,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }));
        // Health check para memoria del sistema
        this.healthChecks.set('memory', () => __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            const memoryUsage = process.memoryUsage();
            const totalMemory = memoryUsage.heapTotal;
            const usedMemory = memoryUsage.heapUsed;
            const memoryPercent = (usedMemory / totalMemory) * 100;
            let status = 'healthy';
            if (memoryPercent > this.config.alertThresholds.memoryUsage) {
                status = 'unhealthy';
            }
            else if (memoryPercent > 70) {
                status = 'degraded';
            }
            return {
                service: 'memory',
                status,
                responseTime: Date.now() - start,
                metadata: {
                    memoryPercent: Math.round(memoryPercent),
                    heapUsed: Math.round(usedMemory / 1024 / 1024),
                    heapTotal: Math.round(totalMemory / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                }
            };
        }));
        // Health check para APIs externas (OpenRouter)
        this.healthChecks.set('llm', () => __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            try {
                // Simulamos un health check básico
                // En un entorno real, haríamos una llamada de prueba a la API
                const responseTime = Date.now() - start + Math.random() * 100;
                return {
                    service: 'llm',
                    status: 'healthy',
                    responseTime: Math.round(responseTime)
                };
            }
            catch (error) {
                return {
                    service: 'llm',
                    status: 'unhealthy',
                    responseTime: Date.now() - start,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }));
    }
    /**
     * Inicia el sistema de monitoreo
     */
    startMonitoring() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        logger_1.logger.info('Starting monitoring service', { service: 'monitoring' });
        // Ejecutar health checks periódicamente
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.runHealthChecks();
        }), this.config.healthCheckInterval);
        // Actualizar métricas cada 60 segundos
        setInterval(() => {
            this.updateMetrics();
        }, 60000);
        // Limpiar datos antiguos cada hora
        setInterval(() => {
            this.cleanupOldData();
        }, 3600000);
        // Ejecutar health check inicial
        this.runHealthChecks();
    }
    /**
     * Ejecuta todos los health checks
     */
    runHealthChecks() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const [name, healthCheck] of this.healthChecks.entries()) {
                try {
                    const result = yield healthCheck();
                    results.push(result);
                    // Generar alertas si es necesario
                    if (result.status === 'unhealthy') {
                        this.createAlert('critical', name, `Service ${name} is unhealthy: ${result.error || 'Unknown error'}`, result);
                    }
                    else if (result.status === 'degraded') {
                        this.createAlert('warning', name, `Service ${name} is degraded`, result);
                    }
                }
                catch (error) {
                    const result = {
                        service: name,
                        status: 'unhealthy',
                        responseTime: 0,
                        error: error instanceof Error ? error.message : 'Health check failed'
                    };
                    results.push(result);
                    this.createAlert('critical', name, `Health check failed for ${name}`, result);
                }
            }
            // Determinar estado general del sistema
            let overall = 'healthy';
            const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
            const degradedCount = results.filter(r => r.status === 'degraded').length;
            if (unhealthyCount > 0) {
                overall = 'unhealthy';
            }
            else if (degradedCount > 0) {
                overall = 'degraded';
            }
            const systemHealth = {
                overall,
                services: results,
                timestamp: new Date(),
                uptime: process.uptime()
            };
            // Emitir evento de health check
            this.emit('healthCheck', systemHealth);
            // Log si hay problemas
            if (overall !== 'healthy') {
                logger_1.logger.warn(`System health is ${overall}`, {
                    service: 'monitoring',
                    healthCheck: systemHealth
                });
            }
            return systemHealth;
        });
    }
    /**
     * Actualiza métricas del sistema
     */
    updateMetrics() {
        // Actualizar métricas del sistema
        this.metrics.system.memoryUsage = process.memoryUsage();
        this.metrics.system.uptime = process.uptime();
        // Calcular estadísticas de tiempo de respuesta
        if (this.responseTimes.length > 0) {
            this.responseTimes.sort((a, b) => a - b);
            this.metrics.responses.averageTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
            this.metrics.responses.p95Time = this.responseTimes[Math.floor(this.responseTimes.length * 0.95)];
            this.metrics.responses.p99Time = this.responseTimes[Math.floor(this.responseTimes.length * 0.99)];
        }
        // Calcular rate de requests
        this.metrics.requests.rate = this.metrics.requests.total / (this.metrics.system.uptime || 1);
        // Guardar métricas en historial
        this.metricsHistory.push({
            timestamp: new Date(),
            metrics: JSON.parse(JSON.stringify(this.metrics))
        });
        // Emitir evento de métricas
        this.emit('metricsUpdate', this.metrics);
        logger_1.logger.debug('Metrics updated', {
            service: 'monitoring',
            metrics: {
                requests: this.metrics.requests.total,
                averageResponseTime: Math.round(this.metrics.responses.averageTime),
                memoryUsage: Math.round(this.metrics.system.memoryUsage.heapUsed / 1024 / 1024)
            }
        });
    }
    /**
     * Crea una nueva alerta
     */
    createAlert(type, service, message, metadata) {
        if (!this.config.enableAlerts)
            return;
        // Verificar si ya existe una alerta similar no resuelta
        const existingAlert = this.alerts.find(alert => !alert.resolved &&
            alert.service === service &&
            alert.type === type &&
            alert.message === message);
        if (existingAlert)
            return; // No crear alertas duplicadas
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            service,
            message,
            timestamp: new Date(),
            resolved: false,
            metadata
        };
        this.alerts.push(alert);
        this.emit('alert', alert);
        logger_1.logger.warn(`Alert created: ${message}`, {
            service: 'monitoring',
            alert: {
                id: alert.id,
                type: alert.type,
                service: alert.service
            }
        });
    }
    /**
     * Resuelve una alerta
     */
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            this.emit('alertResolved', alert);
            logger_1.logger.info(`Alert resolved: ${alert.message}`, {
                service: 'monitoring',
                alertId
            });
            return true;
        }
        return false;
    }
    /**
     * Limpia datos antiguos
     */
    cleanupOldData() {
        const cutoffTime = new Date(Date.now() - this.config.metricsRetentionHours * 60 * 60 * 1000);
        // Limpiar historial de métricas
        this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
        // Limpiar alertas resueltas antiguas
        this.alerts = this.alerts.filter(alert => !alert.resolved || alert.timestamp > cutoffTime);
        // Limpiar datos de tiempo de respuesta
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-500);
        }
        logger_1.logger.debug('Cleanup completed', {
            service: 'monitoring',
            metricsHistorySize: this.metricsHistory.length,
            activeAlerts: this.alerts.filter(a => !a.resolved).length
        });
    }
    /**
     * MÉTODOS PÚBLICOS PARA REGISTRAR EVENTOS
     */
    recordRequest(success) {
        this.metrics.requests.total++;
        if (success) {
            this.metrics.requests.successful++;
        }
        else {
            this.metrics.requests.failed++;
            this.metrics.system.errors++;
        }
    }
    recordResponseTime(time, endpoint) {
        this.responseTimes.push(time);
        // Generar alerta si es muy lento
        if (time > this.config.alertThresholds.responseTime) {
            this.createAlert('warning', 'performance', `Slow response detected: ${time}ms for ${endpoint || 'unknown endpoint'}`, { responseTime: time, endpoint });
        }
    }
    recordFunctionCall(functionName, success, duration) {
        this.metrics.functions.totalCalls++;
        let stats = this.metrics.functions.functionStats.get(functionName);
        if (!stats) {
            stats = { calls: 0, successRate: 0, averageTime: 0 };
            this.metrics.functions.functionStats.set(functionName, stats);
        }
        stats.calls++;
        stats.averageTime = ((stats.averageTime * (stats.calls - 1)) + duration) / stats.calls;
        stats.successRate = success ?
            ((stats.successRate * (stats.calls - 1)) + 1) / stats.calls :
            (stats.successRate * (stats.calls - 1)) / stats.calls;
        // Actualizar métricas globales
        this.metrics.functions.averageTime = Array.from(this.metrics.functions.functionStats.values())
            .reduce((acc, stat) => acc + stat.averageTime, 0) / this.metrics.functions.functionStats.size;
        this.metrics.functions.successRate = Array.from(this.metrics.functions.functionStats.values())
            .reduce((acc, stat) => acc + stat.successRate, 0) / this.metrics.functions.functionStats.size;
    }
    recordConversationStart() {
        this.metrics.conversations.active++;
        this.metrics.conversations.total++;
    }
    recordConversationEnd(duration, completed) {
        this.metrics.conversations.active = Math.max(0, this.metrics.conversations.active - 1);
        if (completed) {
            const currentCompletions = this.metrics.conversations.completionRate * (this.metrics.conversations.total - 1);
            this.metrics.conversations.completionRate = (currentCompletions + 1) / this.metrics.conversations.total;
        }
    }
    /**
     * MÉTODOS PÚBLICOS PARA OBTENER DATOS
     */
    getCurrentHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.runHealthChecks();
        });
    }
    getCurrentMetrics() {
        this.updateMetrics();
        return Object.assign({}, this.metrics);
    }
    getActiveAlerts() {
        return this.alerts.filter(alert => !alert.resolved);
    }
    getAllAlerts() {
        return [...this.alerts];
    }
    getMetricsHistory(hours = 1) {
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    }
    /**
     * Genera dashboard de monitoreo
     */
    generateDashboard() {
        return {
            health: this.getCurrentHealth(),
            metrics: this.getCurrentMetrics(),
            alerts: {
                active: this.getActiveAlerts().length,
                critical: this.alerts.filter(a => !a.resolved && a.type === 'critical').length,
                warnings: this.alerts.filter(a => !a.resolved && a.type === 'warning').length
            },
            uptime: process.uptime(),
            version: process.version,
            memory: {
                usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                limit: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };
    }
    /**
     * Detiene el servicio de monitoreo
     */
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            logger_1.logger.info('Monitoring service stopped', { service: 'monitoring' });
        }
    }
}
exports.MonitoringService = MonitoringService;
// Exportar instancia singleton
exports.monitoringService = new MonitoringService();
