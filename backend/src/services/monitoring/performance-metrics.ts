import { logger } from '../../config/logger';
import { EventEmitter } from 'events';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  network: {
    activeConnections: number;
    requestsPerMinute: number;
    averageResponseTime: number;
  };
  database: {
    activeConnections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  websocket: {
    activeConnections: number;
    messagesPerMinute: number;
    averageLatency: number;
  };
}

export interface MetricThreshold {
  warning: number;
  critical: number;
  action: 'log' | 'alert' | 'restart';
}

class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: Map<string, MetricThreshold> = new Map();
  private collectionInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private maxMetricsPerType = 1000; // Mantener solo los últimos 1000 métricas por tipo

  constructor() {
    super();
    this.setupDefaultThresholds();
  }

  private setupDefaultThresholds(): void {
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

  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      logger.warn('Performance monitor ya está ejecutándose');
      return;
    }

    this.isMonitoring = true;
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    logger.info('Performance monitor iniciado', { intervalMs });
  }

  stopMonitoring(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Performance monitor detenido');
  }

  private collectSystemMetrics(): void {
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
      
    } catch (error) {
      logger.error('Error recolectando métricas del sistema', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  private getSystemMetrics(): SystemMetrics {
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

  private calculateCpuUsage(): number {
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

  private getLoadAverage(): number[] {
    // En un entorno real, esto vendría del sistema operativo
    // Por ahora, simulamos valores
    return [0.5, 0.3, 0.2];
  }

  private getActiveConnections(): number {
    // En un entorno real, esto vendría del servidor HTTP/WebSocket
    return Math.floor(Math.random() * 50) + 10;
  }

  private getRequestsPerMinute(): number {
    // En un entorno real, esto vendría del contador de requests
    return Math.floor(Math.random() * 100) + 20;
  }

  private getAverageResponseTime(): number {
    // En un entorno real, esto vendría del promedio de response times
    return Math.floor(Math.random() * 500) + 100;
  }

  private getDatabaseConnections(): number {
    // En un entorno real, esto vendría del pool de conexiones
    return Math.floor(Math.random() * 10) + 2;
  }

  private getAverageQueryTime(): number {
    // En un entorno real, esto vendría del promedio de query times
    return Math.floor(Math.random() * 200) + 50;
  }

  private getCacheHitRate(): number {
    // En un entorno real, esto vendría del cache service
    return Math.floor(Math.random() * 30) + 70;
  }

  private getWebSocketConnections(): number {
    // En un entorno real, esto vendría del servidor WebSocket
    return Math.floor(Math.random() * 20) + 5;
  }

  private getWebSocketMessagesPerMinute(): number {
    // En un entorno real, esto vendría del contador de mensajes
    return Math.floor(Math.random() * 200) + 50;
  }

  private getWebSocketLatency(): number {
    // En un entorno real, esto vendría del promedio de latencias
    return Math.floor(Math.random() * 100) + 20;
  }

  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    // Mantener solo los últimos maxMetricsPerType métricas
    if (metricsList.length > this.maxMetricsPerType) {
      metricsList.splice(0, metricsList.length - this.maxMetricsPerType);
    }

    logger.debug('Métrica registrada', { name, value, unit, tags });
  }

  private checkThresholds(): void {
    for (const [metricName, threshold] of this.thresholds) {
      const latestMetric = this.getLatestMetric(metricName);
      if (!latestMetric) continue;

      if (latestMetric.value >= threshold.critical) {
        this.handleThresholdExceeded(metricName, latestMetric, 'critical', threshold);
      } else if (latestMetric.value >= threshold.warning) {
        this.handleThresholdExceeded(metricName, latestMetric, 'warning', threshold);
      }
    }
  }

  private handleThresholdExceeded(
    metricName: string, 
    metric: PerformanceMetric, 
    level: 'warning' | 'critical',
    threshold: MetricThreshold
  ): void {
    const message = `Métrica ${metricName} excedió threshold ${level}: ${metric.value}${metric.unit} (threshold: ${threshold[level]})`;
    
    if (level === 'critical') {
      logger.error(message, { metric, threshold });
      this.emit('critical_threshold_exceeded', { metricName, metric, threshold });
    } else {
      logger.warn(message, { metric, threshold });
      this.emit('warning_threshold_exceeded', { metricName, metric, threshold });
    }

    // Ejecutar acción según configuración
    if (threshold.action === 'alert') {
      this.emit('alert', { metricName, metric, level, threshold });
    } else if (threshold.action === 'restart') {
      logger.error('Restart requerido por threshold excedido', { metricName, metric, threshold });
      // En producción, aquí se podría implementar un restart controlado
    }
  }

  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  getMetrics(name: string, limit: number = 100): PerformanceMetric[] {
    const metrics = this.metrics.get(name);
    if (!metrics) return [];
    
    return metrics.slice(-limit);
  }

  getMetricsSummary(): Record<string, { latest: number; average: number; min: number; max: number }> {
    const summary: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics) {
      if (metrics.length === 0) continue;
      
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

  setThreshold(name: string, threshold: MetricThreshold): void {
    this.thresholds.set(name, threshold);
    logger.info('Threshold actualizado', { name, threshold });
  }

  getThresholds(): Map<string, MetricThreshold> {
    return new Map(this.thresholds);
  }

  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
      logger.info('Métricas limpiadas', { name });
    } else {
      this.metrics.clear();
      logger.info('Todas las métricas limpiadas');
    }
  }

  destroy(): void {
    this.stopMonitoring();
    this.metrics.clear();
    this.thresholds.clear();
    this.removeAllListeners();
    logger.info('Performance monitor destruido');
  }
}

export const performanceMonitor = new PerformanceMonitor(); 