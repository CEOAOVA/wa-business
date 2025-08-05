/**
 * Circuit Breaker Service - Patrón Circuit Breaker para servicios externos
 * Previene cascadas de fallos y mejora la resilencia del sistema
 */

import { StructuredLogger } from '../utils/structured-logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalCalls: number;
  failureRate: number;
}

export class CircuitBreakerService {
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private state: CircuitState = 'CLOSED';
  private totalCalls = 0;
  private config: CircuitBreakerConfig;
  private serviceName: string;

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minuto
      monitoringPeriod: 300000, // 5 minutos
      expectedErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'RATE_LIMIT'],
      ...config
    };

    StructuredLogger.logSystemEvent('circuit_breaker_initialized', {
      serviceName: this.serviceName,
      config: this.config
    });

    // Limpiar estadísticas periódicamente
    setInterval(() => {
      this.resetStats();
    }, this.config.monitoringPeriod);
  }

  /**
   * Ejecutar operación con circuit breaker
   */
  async call<T>(operation: () => Promise<T>): Promise<T> {
    const correlationId = `cb_${this.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    this.totalCalls++;

    // Verificar estado del circuit breaker
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        context.logWhatsApp('circuit_breaker_half_open', {
          serviceName: this.serviceName,
          timeSinceLastFailure: Date.now() - this.lastFailureTime
        });
      } else {
        const error = new Error(`Circuit breaker OPEN for ${this.serviceName}`);
        context.logError('circuit_breaker_rejected', error, {
          serviceName: this.serviceName,
          state: this.state,
          failures: this.failures
        });
        throw error;
      }
    }

    const startTime = Date.now();

    try {
      context.logWhatsApp('circuit_breaker_operation_start', {
        serviceName: this.serviceName,
        state: this.state,
        totalCalls: this.totalCalls
      });

      const result = await operation();
      
      const duration = Date.now() - startTime;
      this.onSuccess();
      
      context.logPerformance('circuit_breaker_operation_success', duration, {
        serviceName: this.serviceName,
        state: this.state,
        successes: this.successes
      });

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const shouldCount = this.shouldCountFailure(error);
      
      if (shouldCount) {
        this.onFailure();
      }

      const errorId = context.logError('circuit_breaker_operation_failed', error, {
        serviceName: this.serviceName,
        state: this.state,
        failures: this.failures,
        duration,
        shouldCount,
        errorType: error.constructor.name
      });

      throw error;
    }
  }

  /**
   * Manejar éxito de operación
   */
  private onSuccess() {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Si estamos en HALF_OPEN y la operación fue exitosa, cerrar el circuit
      this.state = 'CLOSED';
      this.failures = 0; // Reset failures
      
      StructuredLogger.logSystemEvent('circuit_breaker_closed', {
        serviceName: this.serviceName,
        successes: this.successes,
        previousFailures: this.failures
      });
    }
  }

  /**
   * Manejar fallo de operación
   */
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Si estamos en HALF_OPEN y falla, volver a OPEN
      this.state = 'OPEN';
      
      StructuredLogger.logSystemEvent('circuit_breaker_reopened', {
        serviceName: this.serviceName,
        failures: this.failures
      });
      
    } else if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold) {
      // Si estamos CLOSED y alcanzamos el threshold, abrir
      this.state = 'OPEN';
      
      StructuredLogger.logSystemEvent('circuit_breaker_opened', {
        serviceName: this.serviceName,
        failures: this.failures,
        threshold: this.config.failureThreshold,
        failureRate: this.getFailureRate()
      });
    }
  }

  /**
   * Determinar si un error debe contar como fallo
   */
  private shouldCountFailure(error: any): boolean {
    // No contar errores esperados como fallos del circuit breaker
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    const isExpectedError = this.config.expectedErrors?.some(expectedError =>
      errorMessage.includes(expectedError) || errorCode.includes(expectedError)
    );

    // Errores de validación o del cliente no deben abrir el circuit
    const clientErrors = [400, 401, 403, 404, 422];
    const statusCode = error.response?.status || error.status;
    const isClientError = statusCode && clientErrors.includes(statusCode);

    return !isExpectedError && !isClientError;
  }

  /**
   * Calcular tasa de fallos
   */
  private getFailureRate(): number {
    const totalOperations = this.failures + this.successes;
    if (totalOperations === 0) return 0;
    return (this.failures / totalOperations) * 100;
  }

  /**
   * Resetear estadísticas
   */
  private resetStats() {
    const oldStats = this.getStats();
    
    // Solo resetear si ha pasado suficiente tiempo desde el último fallo
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    if (timeSinceLastFailure > this.config.monitoringPeriod) {
      this.failures = 0;
      this.successes = 0;
      this.totalCalls = 0;
      
      StructuredLogger.logSystemEvent('circuit_breaker_stats_reset', {
        serviceName: this.serviceName,
        oldStats,
        timeSinceLastFailure
      });
    }
  }

  /**
   * Obtener estadísticas actuales
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      failureRate: this.getFailureRate()
    };
  }

  /**
   * Forzar estado del circuit breaker (para testing)
   */
  forceState(state: CircuitState) {
    const oldState = this.state;
    this.state = state;
    
    StructuredLogger.logSystemEvent('circuit_breaker_force_state', {
      serviceName: this.serviceName,
      oldState,
      newState: state
    });
  }

  /**
   * Resetear circuit breaker manualmente
   */
  reset() {
    const oldStats = this.getStats();
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    
    StructuredLogger.logSystemEvent('circuit_breaker_manual_reset', {
      serviceName: this.serviceName,
      oldStats
    });
  }

  /**
   * Verificar si el circuit está disponible
   */
  isAvailable(): boolean {
    if (this.state === 'OPEN') {
      return Date.now() - this.lastFailureTime > this.config.recoveryTimeout;
    }
    return true;
  }
}

/**
 * Circuit Breaker Manager - Gestiona múltiples circuit breakers
 */
export class CircuitBreakerManager {
  private static circuits = new Map<string, CircuitBreakerService>();

  /**
   * Obtener o crear circuit breaker para un servicio
   */
  static getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreakerService {
    if (!this.circuits.has(serviceName)) {
      const circuit = new CircuitBreakerService(serviceName, config);
      this.circuits.set(serviceName, circuit);
      
      StructuredLogger.logSystemEvent('circuit_breaker_created', {
        serviceName,
        totalCircuits: this.circuits.size
      });
    }
    
    return this.circuits.get(serviceName)!;
  }

  /**
   * Obtener estadísticas de todos los circuit breakers
   */
  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      stats[serviceName] = circuit.getStats();
    }
    
    return stats;
  }

  /**
   * Resetear todos los circuit breakers
   */
  static resetAll() {
    for (const [serviceName, circuit] of this.circuits.entries()) {
      circuit.reset();
    }
    
    StructuredLogger.logSystemEvent('all_circuit_breakers_reset', {
      totalCircuits: this.circuits.size
    });
  }

  /**
   * Obtener circuit breakers en estado OPEN
   */
  static getOpenCircuits(): string[] {
    const openCircuits: string[] = [];
    
    for (const [serviceName, circuit] of this.circuits.entries()) {
      if (circuit.getStats().state === 'OPEN') {
        openCircuits.push(serviceName);
      }
    }
    
    return openCircuits;
  }

  /**
   * Verificar salud general de todos los circuits
   */
  static getHealthSummary() {
    const stats = this.getAllStats();
    const services = Object.keys(stats);
    
    const summary = {
      totalServices: services.length,
      healthyServices: services.filter(s => stats[s].state === 'CLOSED').length,
      degradedServices: services.filter(s => stats[s].state === 'HALF_OPEN').length,
      failedServices: services.filter(s => stats[s].state === 'OPEN').length,
      overallHealth: 'healthy' as 'healthy' | 'degraded' | 'critical'
    };
    
    if (summary.failedServices > 0) {
      summary.overallHealth = summary.failedServices > summary.healthyServices ? 'critical' : 'degraded';
    } else if (summary.degradedServices > 0) {
      summary.overallHealth = 'degraded';
    }
    
    return summary;
  }
}

// Instancias pre-configuradas para servicios comunes
export const whatsappCircuitBreaker = CircuitBreakerManager.getCircuitBreaker('whatsapp', {
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 segundos
  monitoringPeriod: 180000 // 3 minutos
});

export const databaseCircuitBreaker = CircuitBreakerManager.getCircuitBreaker('database', {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minuto
  monitoringPeriod: 300000 // 5 minutos
});

export const supabaseCircuitBreaker = CircuitBreakerManager.getCircuitBreaker('supabase', {
  failureThreshold: 4,
  recoveryTimeout: 45000, // 45 segundos
  monitoringPeriod: 240000 // 4 minutos
});
