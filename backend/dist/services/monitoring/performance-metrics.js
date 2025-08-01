"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitor = void 0;
const logger_1 = require("../../config/logger");
const events_1 = require("events");
class PerformanceMonitor extends events_1.EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.thresholds = new Map();
        this.collectionInterval = null;
        this.isMonitoring = false;
        this.maxMetricsPerType = 1000; // Mantener solo los últimos 1000 métricas por tipo
        this.setupDefaultThresholds();
    }
    setupDefaultThresholds() {
        this.thresholds.set('memory_usage', {
            warning: 80,
            critical: 95,
            action: 'alert'
        });
        this.thresholds.set('cpu_usage', {
            warning: 70,
            critical: 90,
            action: 'alert'
        });
        this.thresholds.set('response_time', {
            warning: 2000, // 2 segundos
            critical: 5000, // 5 segundos
            action: 'log'
        });
        this.thresholds.set('websocket_latency', {
            warning: 1000, // 1 segundo
            critical: 3000, // 3 segundos
            action: 'alert'
        });
    }
    startMonitoring(intervalMs = 60000) {
        if (this.isMonitoring) {
            logger_1.logger.warn('Performance monitor ya está ejecutándose');
            return;
        }
        this.isMonitoring = true;
        this.collectionInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, intervalMs);
        logger_1.logger.info('Performance monitor iniciado', { intervalMs });
    }
    stopMonitoring() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        this.isMonitoring = false;
        logger_1.logger.info('Performance monitor detenido');
    }
    collectSystemMetrics() {
        try {
            const metrics = this.getSystemMetrics();
            // Registrar métricas de memoria
            this.recordMetric('memory_usage', metrics.memory.percentage, '%');
            this.recordMetric('memory_used_mb', metrics.memory.used / 1024 / 1024, 'MB');
            // Registrar métricas de CPU
            this.recordMetric('cpu_usage', metrics.cpu.usage, '%');
            this.recordMetric('cpu_load_1min', metrics.cpu.loadAverage[0], 'load');
            this.recordMetric('cpu_load_5min', metrics.cpu.loadAverage[1], 'load');
            this.recordMetric('cpu_load_15min', metrics.cpu.loadAverage[2], 'load');
            // Registrar métricas de red
            this.recordMetric('network_connections', metrics.network.activeConnections, 'connections');
            this.recordMetric('network_requests_per_minute', metrics.network.requestsPerMinute, 'requests/min');
            this.recordMetric('network_response_time', metrics.network.averageResponseTime, 'ms');
            // Registrar métricas de base de datos
            this.recordMetric('database_connections', metrics.database.activeConnections, 'connections');
            this.recordMetric('database_query_time', metrics.database.queryTime, 'ms');
            this.recordMetric('database_cache_hit_rate', metrics.database.cacheHitRate, '%');
            // Registrar métricas de WebSocket
            this.recordMetric('websocket_connections', metrics.websocket.activeConnections, 'connections');
            this.recordMetric('websocket_messages_per_minute', metrics.websocket.messagesPerMinute, 'messages/min');
            this.recordMetric('websocket_latency', metrics.websocket.averageLatency, 'ms');
            // Verificar thresholds
            this.checkThresholds();
        }
        catch (error) {
            logger_1.logger.error('Error recolectando métricas del sistema', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            memory: {
                used: memUsage.heapUsed,
                total: memUsage.heapTotal,
                percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
            },
            cpu: {
                usage: this.calculateCpuUsage(),
                loadAverage: this.getLoadAverage()
            },
            network: {
                activeConnections: this.getActiveConnections(),
                requestsPerMinute: this.getRequestsPerMinute(),
                averageResponseTime: this.getAverageResponseTime()
            },
            database: {
                activeConnections: this.getDatabaseConnections(),
                queryTime: this.getAverageQueryTime(),
                cacheHitRate: this.getCacheHitRate()
            },
            websocket: {
                activeConnections: this.getWebSocketConnections(),
                messagesPerMinute: this.getWebSocketMessagesPerMinute(),
                averageLatency: this.getWebSocketLatency()
            }
        };
    }
    calculateCpuUsage() {
        // Implementación simplificada - en producción usaría un método más preciso
        const startUsage = process.cpuUsage();
        const startTime = process.hrtime.bigint();
        // Simular trabajo para medir CPU
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += Math.random();
        }
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();
        const elapsed = Number(endTime - startTime) / 1000000; // Convertir a milisegundos
        const cpuUsage = (endUsage.user + endUsage.system) / 1000; // Convertir a milisegundos
        return Math.min((cpuUsage / elapsed) * 100, 100);
    }
    getLoadAverage() {
        // En un entorno real, esto vendría del sistema operativo
        // Por ahora, simulamos valores
        return [0.5, 0.3, 0.2];
    }
    getActiveConnections() {
        // En un entorno real, esto vendría del servidor HTTP/WebSocket
        return Math.floor(Math.random() * 50) + 10;
    }
    getRequestsPerMinute() {
        // En un entorno real, esto vendría del contador de requests
        return Math.floor(Math.random() * 100) + 20;
    }
    getAverageResponseTime() {
        // En un entorno real, esto vendría del promedio de response times
        return Math.floor(Math.random() * 500) + 100;
    }
    getDatabaseConnections() {
        // En un entorno real, esto vendría del pool de conexiones
        return Math.floor(Math.random() * 10) + 2;
    }
    getAverageQueryTime() {
        // En un entorno real, esto vendría del promedio de query times
        return Math.floor(Math.random() * 200) + 50;
    }
    getCacheHitRate() {
        // En un entorno real, esto vendría del cache service
        return Math.floor(Math.random() * 30) + 70;
    }
    getWebSocketConnections() {
        // En un entorno real, esto vendría del servidor WebSocket
        return Math.floor(Math.random() * 20) + 5;
    }
    getWebSocketMessagesPerMinute() {
        // En un entorno real, esto vendría del contador de mensajes
        return Math.floor(Math.random() * 200) + 50;
    }
    getWebSocketLatency() {
        // En un entorno real, esto vendría del promedio de latencias
        return Math.floor(Math.random() * 100) + 20;
    }
    recordMetric(name, value, unit, tags) {
        const metric = {
            name,
            value,
            unit,
            timestamp: Date.now(),
            tags
        };
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const metricsList = this.metrics.get(name);
        metricsList.push(metric);
        // Mantener solo los últimos maxMetricsPerType métricas
        if (metricsList.length > this.maxMetricsPerType) {
            metricsList.splice(0, metricsList.length - this.maxMetricsPerType);
        }
        logger_1.logger.debug('Métrica registrada', { name, value, unit, tags });
    }
    checkThresholds() {
        for (const [metricName, threshold] of this.thresholds) {
            const latestMetric = this.getLatestMetric(metricName);
            if (!latestMetric)
                continue;
            if (latestMetric.value >= threshold.critical) {
                this.handleThresholdExceeded(metricName, latestMetric, 'critical', threshold);
            }
            else if (latestMetric.value >= threshold.warning) {
                this.handleThresholdExceeded(metricName, latestMetric, 'warning', threshold);
            }
        }
    }
    handleThresholdExceeded(metricName, metric, level, threshold) {
        const message = `Métrica ${metricName} excedió threshold ${level}: ${metric.value}${metric.unit} (threshold: ${threshold[level]})`;
        if (level === 'critical') {
            logger_1.logger.error(message, { metric, threshold });
            this.emit('critical_threshold_exceeded', { metricName, metric, threshold });
        }
        else {
            logger_1.logger.warn(message, { metric, threshold });
            this.emit('warning_threshold_exceeded', { metricName, metric, threshold });
        }
        // Ejecutar acción según configuración
        if (threshold.action === 'alert') {
            this.emit('alert', { metricName, metric, level, threshold });
        }
        else if (threshold.action === 'restart') {
            logger_1.logger.error('Restart requerido por threshold excedido', { metricName, metric, threshold });
            // En producción, aquí se podría implementar un restart controlado
        }
    }
    getLatestMetric(name) {
        const metrics = this.metrics.get(name);
        return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
    }
    getMetrics(name, limit = 100) {
        const metrics = this.metrics.get(name);
        if (!metrics)
            return [];
        return metrics.slice(-limit);
    }
    getMetricsSummary() {
        const summary = {};
        for (const [name, metrics] of this.metrics) {
            if (metrics.length === 0)
                continue;
            const values = metrics.map(m => m.value);
            summary[name] = {
                latest: values[values.length - 1],
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        }
        return summary;
    }
    setThreshold(name, threshold) {
        this.thresholds.set(name, threshold);
        logger_1.logger.info('Threshold actualizado', { name, threshold });
    }
    getThresholds() {
        return new Map(this.thresholds);
    }
    clearMetrics(name) {
        if (name) {
            this.metrics.delete(name);
            logger_1.logger.info('Métricas limpiadas', { name });
        }
        else {
            this.metrics.clear();
            logger_1.logger.info('Todas las métricas limpiadas');
        }
    }
    destroy() {
        this.stopMonitoring();
        this.metrics.clear();
        this.thresholds.clear();
        this.removeAllListeners();
        logger_1.logger.info('Performance monitor destruido');
    }
}
exports.performanceMonitor = new PerformanceMonitor();
