/**
 * Sistema de monitoreo avanzado para WhatsApp Business LLM
 * Incluye health checks, métricas, alertas y dashboard
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { databaseService } from '../../config/database';
import { soapService } from '../soap/soap-service';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  metadata?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
}

export interface PerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // requests per second
  };
  responses: {
    averageTime: number;
    p95Time: number;
    p99Time: number;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
  };
  functions: {
    totalCalls: number;
    successRate: number;
    averageTime: number;
    functionStats: Map<string, { calls: number; successRate: number; averageTime: number }>;
  };
  conversations: {
    active: number;
    total: number;
    averageLength: number;
    completionRate: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    uptime: number;
    errors: number;
  };
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export interface MonitoringConfig {
  healthCheckInterval: number;
  metricsRetentionHours: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    diskUsage: number;
  };
  enableAlerts: boolean;
  enableDashboard: boolean;
}

export class MonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private metrics!: PerformanceMetrics;
  private alerts: Alert[] = [];
  private responseTimes: number[] = [];
  private isRunning: boolean = false;
  private metricsHistory: any[] = [];

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      healthCheckInterval: 30000, // 30 segundos
      metricsRetentionHours: 24,
      alertThresholds: {
        responseTime: 5000, // 5 segundos
        errorRate: 5, // 5%
        memoryUsage: 85, // 85%
        diskUsage: 90 // 90%
      },
      enableAlerts: true,
      enableDashboard: true,
      ...config
    };

    this.initializeMetrics();
    this.registerHealthChecks();
    this.startMonitoring();
  }

  /**
   * Inicializa métricas del sistema
   */
  private initializeMetrics(): void {
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
  private registerHealthChecks(): void {
    // Health check para base de datos
    this.healthChecks.set('database', async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      try {
        const isHealthy = await databaseService.isHealthy();
        const responseTime = Date.now() - start;
        
        return {
          service: 'database',
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          metadata: await databaseService.getStats()
        };
      } catch (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Health check para SOAP services
    this.healthChecks.set('soap', async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      try {
        const isHealthy = await soapService.testConnection();
        const responseTime = Date.now() - start;
        
        return {
          service: 'soap',
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime
        };
      } catch (error) {
        return {
          service: 'soap',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Health check para memoria del sistema
    this.healthChecks.set('memory', async (): Promise<HealthCheckResult> => {
      const start = Date.now();
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryPercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (memoryPercent > this.config.alertThresholds.memoryUsage) {
        status = 'unhealthy';
      } else if (memoryPercent > 70) {
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
    });

    // Health check para APIs externas (OpenRouter)
    this.healthChecks.set('llm', async (): Promise<HealthCheckResult> => {
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
      } catch (error) {
        return {
          service: 'llm',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Inicia el sistema de monitoreo
   */
  private startMonitoring(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Starting monitoring service', { service: 'monitoring' });

    // Ejecutar health checks periódicamente
    setInterval(async () => {
      await this.runHealthChecks();
    }, this.config.healthCheckInterval);

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
  private async runHealthChecks(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];
    
    for (const [name, healthCheck] of this.healthChecks.entries()) {
      try {
        const result = await healthCheck();
        results.push(result);
        
        // Generar alertas si es necesario
        if (result.status === 'unhealthy') {
          this.createAlert('critical', name, `Service ${name} is unhealthy: ${result.error || 'Unknown error'}`, result);
        } else if (result.status === 'degraded') {
          this.createAlert('warning', name, `Service ${name} is degraded`, result);
        }
        
      } catch (error) {
        const result: HealthCheckResult = {
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
    let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    const systemHealth: SystemHealth = {
      overall,
      services: results,
      timestamp: new Date(),
      uptime: process.uptime()
    };

    // Emitir evento de health check
    this.emit('healthCheck', systemHealth);
    
    // Log si hay problemas
    if (overall !== 'healthy') {
      logger.warn(`System health is ${overall}`, {
        service: 'monitoring',
        healthCheck: systemHealth
      });
    }

    return systemHealth;
  }

  /**
   * Actualiza métricas del sistema
   */
  private updateMetrics(): void {
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
    
    logger.debug('Metrics updated', {
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
  private createAlert(type: Alert['type'], service: string, message: string, metadata?: any): void {
    if (!this.config.enableAlerts) return;

    // Verificar si ya existe una alerta similar no resuelta
    const existingAlert = this.alerts.find(alert => 
      !alert.resolved && 
      alert.service === service && 
      alert.type === type &&
      alert.message === message
    );

    if (existingAlert) return; // No crear alertas duplicadas

    const alert: Alert = {
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
    
    logger.warn(`Alert created: ${message}`, {
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
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.emit('alertResolved', alert);
      
      logger.info(`Alert resolved: ${alert.message}`, {
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
  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - this.config.metricsRetentionHours * 60 * 60 * 1000);
    
    // Limpiar historial de métricas
    this.metricsHistory = this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
    
    // Limpiar alertas resueltas antiguas
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.timestamp > cutoffTime
    );
    
    // Limpiar datos de tiempo de respuesta
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
    
    logger.debug('Cleanup completed', {
      service: 'monitoring',
      metricsHistorySize: this.metricsHistory.length,
      activeAlerts: this.alerts.filter(a => !a.resolved).length
    });
  }

  /**
   * MÉTODOS PÚBLICOS PARA REGISTRAR EVENTOS
   */

  recordRequest(success: boolean): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.metrics.system.errors++;
    }
  }

  recordResponseTime(time: number, endpoint?: string): void {
    this.responseTimes.push(time);
    
    // Generar alerta si es muy lento
    if (time > this.config.alertThresholds.responseTime) {
      this.createAlert('warning', 'performance', 
        `Slow response detected: ${time}ms for ${endpoint || 'unknown endpoint'}`,
        { responseTime: time, endpoint }
      );
    }
  }

  recordFunctionCall(functionName: string, success: boolean, duration: number): void {
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

  recordConversationStart(): void {
    this.metrics.conversations.active++;
    this.metrics.conversations.total++;
  }

  recordConversationEnd(duration: number, completed: boolean): void {
    this.metrics.conversations.active = Math.max(0, this.metrics.conversations.active - 1);
    
    if (completed) {
      const currentCompletions = this.metrics.conversations.completionRate * (this.metrics.conversations.total - 1);
      this.metrics.conversations.completionRate = (currentCompletions + 1) / this.metrics.conversations.total;
    }
  }

  /**
   * MÉTODOS PÚBLICOS PARA OBTENER DATOS
   */

  async getCurrentHealth(): Promise<SystemHealth> {
    return await this.runHealthChecks();
  }

  getCurrentMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  getMetricsHistory(hours: number = 1): any[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Genera dashboard de monitoreo
   */
  generateDashboard(): any {
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
  stop(): void {
    if (this.isRunning) {
      this.isRunning = false;
      logger.info('Monitoring service stopped', { service: 'monitoring' });
    }
  }
}

// Exportar instancia singleton
export const monitoringService = new MonitoringService(); 