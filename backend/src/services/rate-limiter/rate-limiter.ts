/**
 * Sistema de Rate Limiting y Circuit Breaker
 * Protección contra sobrecarga y fallos en cascada
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { monitoringService } from '../monitoring/monitoring-service';

export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  keyGenerator: (identifier: string) => string;
  skipOnSuccess?: boolean;
  message?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringWindowMs: number;
  volumeThreshold: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalRequests: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

interface RequestWindow {
  count: number;
  windowStart: number;
  requests: number[];
}

interface ServiceStats {
  totalRequests: number;
  failures: number;
  successes: number;
  averageResponseTime: number;
  lastRequestTime: Date;
}

export class RateLimiter extends EventEmitter {
  private windows = new Map<string, RequestWindow>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private serviceStats = new Map<string, ServiceStats>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startCleanupProcess();
    logger.info('Rate limiter and circuit breaker initialized');
  }

  /**
   * Inicia proceso de limpieza automática
   */
  private startCleanupProcess(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Limpiar cada minuto
  }

  /**
   * Aplica rate limiting
   */
  async checkRateLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const key = config.keyGenerator(identifier);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowSizeMs) * config.windowSizeMs;

    let window = this.windows.get(key);
    
    if (!window || window.windowStart < windowStart) {
      // Nueva ventana
      window = {
        count: 0,
        windowStart,
        requests: []
      };
      this.windows.set(key, window);
    }

    // Contar requests en la ventana actual
    window.requests.push(now);
    window.count++;

    // Limpiar requests fuera de la ventana
    const cutoff = now - config.windowSizeMs;
    window.requests = window.requests.filter(time => time > cutoff);
    window.count = window.requests.length;

    const allowed = window.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - window.count);
    const resetTime = new Date(windowStart + config.windowSizeMs);

    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        service: 'rate-limiter',
        identifier: this.maskIdentifier(identifier),
        requests: window.count,
        limit: config.maxRequests,
        windowSizeMs: config.windowSizeMs
      });

      this.emit('rateLimitExceeded', {
        identifier,
        requests: window.count,
        limit: config.maxRequests
      });

      // Rate limit exceeded
    }

    return {
      allowed,
      remaining,
      resetTime,
      totalRequests: window.count
    };
  }

  /**
   * Registra resultado de operación para circuit breaker
   */
  recordResult(serviceName: string, success: boolean, responseTime?: number): void {
    let stats = this.serviceStats.get(serviceName);
    if (!stats) {
      stats = {
        totalRequests: 0,
        failures: 0,
        successes: 0,
        averageResponseTime: 0,
        lastRequestTime: new Date()
      };
      this.serviceStats.set(serviceName, stats);
    }

    stats.totalRequests++;
    stats.lastRequestTime = new Date();

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    if (responseTime) {
      stats.averageResponseTime = ((stats.averageResponseTime * (stats.totalRequests - 1)) + responseTime) / stats.totalRequests;
    }

    // Actualizar circuit breaker
    this.updateCircuitBreaker(serviceName, success);
  }

  /**
   * Verifica si un servicio está disponible según circuit breaker
   */
  isServiceAvailable(serviceName: string, config: CircuitBreakerConfig): boolean {
    let state = this.circuitBreakers.get(serviceName);
    
    if (!state) {
      state = {
        state: 'CLOSED',
        failures: 0,
        successCount: 0
      };
      this.circuitBreakers.set(serviceName, state);
    }

    const now = Date.now();

    switch (state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (state.nextAttemptTime && now >= state.nextAttemptTime.getTime()) {
          // Tiempo de recuperación alcanzado, cambiar a HALF_OPEN
          state.state = 'HALF_OPEN';
          state.successCount = 0;
          
          logger.info('Circuit breaker transitioning to HALF_OPEN', {
            service: 'circuit-breaker',
            serviceName
          });
          
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return true;
    }
  }

  /**
   * Actualiza estado del circuit breaker
   */
  private updateCircuitBreaker(serviceName: string, success: boolean): void {
    let state = this.circuitBreakers.get(serviceName);
    if (!state) return;

    const stats = this.serviceStats.get(serviceName);
    if (!stats) return;

    const config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      monitoringWindowMs: 300000,
      volumeThreshold: 10
    };

    if (success) {
      if (state.state === 'HALF_OPEN') {
        state.successCount++;
        
        // Si tenemos suficientes éxitos, cerrar el circuit
        if (state.successCount >= 3) {
          state.state = 'CLOSED';
          state.failures = 0;
          state.successCount = 0;
          state.lastFailureTime = undefined;
          state.nextAttemptTime = undefined;
          
          logger.info('Circuit breaker closed after successful recovery', {
            service: 'circuit-breaker',
            serviceName
          });
          
          this.emit('circuitBreakerClosed', { serviceName });
        }
      }
      
      // Reset failure count en estado CLOSED
      if (state.state === 'CLOSED') {
        state.failures = Math.max(0, state.failures - 1);
      }
      
    } else {
      state.failures++;
      state.lastFailureTime = new Date();

      // Verificar si debemos abrir el circuit
      if (state.state === 'CLOSED' && this.shouldOpenCircuit(stats, config)) {
        state.state = 'OPEN';
        state.nextAttemptTime = new Date(Date.now() + config.recoveryTimeoutMs);
        
        logger.error('Circuit breaker opened due to high failure rate', {
          service: 'circuit-breaker',
          serviceName,
          failures: state.failures,
          totalRequests: stats.totalRequests,
          failureRate: (stats.failures / stats.totalRequests) * 100
        });
        
        this.emit('circuitBreakerOpened', {
          serviceName,
          failures: state.failures,
          failureRate: (stats.failures / stats.totalRequests) * 100
        });
        
      } else if (state.state === 'HALF_OPEN') {
        // Fallo en HALF_OPEN, volver a OPEN
        state.state = 'OPEN';
        state.nextAttemptTime = new Date(Date.now() + config.recoveryTimeoutMs);
        state.successCount = 0;
        
        logger.warn('Circuit breaker re-opened after failure in HALF_OPEN state', {
          service: 'circuit-breaker',
          serviceName
        });
      }
    }
  }

  /**
   * Determina si debe abrir el circuit breaker
   */
  private shouldOpenCircuit(stats: ServiceStats, config: CircuitBreakerConfig): boolean {
    // Necesitamos volumen mínimo de requests
    if (stats.totalRequests < config.volumeThreshold) {
      return false;
    }

    // Calcular tasa de fallos
    const failureRate = (stats.failures / stats.totalRequests) * 100;
    
    return failureRate >= config.failureThreshold;
  }

  /**
   * Middleware para Express con rate limiting
   */
  createRateLimitMiddleware(config: RateLimitConfig) {
    return async (req: any, res: any, next: any) => {
      try {
        const identifier = req.ip || req.connection.remoteAddress || 'unknown';
        const result = await this.checkRateLimit(identifier, config);

        // Agregar headers de rate limit
        res.set({
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toISOString()
        });

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: config.message || 'Too many requests, please try again later',
            retryAfter: Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limit middleware error', error);
        next(); // Permitir continuar en caso de error
      }
    };
  }

  /**
   * Middleware para circuit breaker
   */
  createCircuitBreakerMiddleware(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    const fullConfig: CircuitBreakerConfig = {
      failureThreshold: 50, // 50% de fallos
      recoveryTimeoutMs: 60000, // 1 minuto
      monitoringWindowMs: 300000, // 5 minutos
      volumeThreshold: 10, // Mínimo 10 requests
      ...config
    };

    return async (req: any, res: any, next: any) => {
      if (!this.isServiceAvailable(serviceName, fullConfig)) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'The service is currently experiencing issues. Please try again later.',
          serviceName
        });
      }

      const start = Date.now();
      
      // Override res.end para capturar el resultado
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const duration = Date.now() - start;
        const success = res.statusCode < 400;
        
        this.recordResult(serviceName, success, duration);
        // Record response time for monitoring
        
        return originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Configuraciones predefinidas
   */
  static configs = {
    // Rate limiting por IP
    perIP: (maxRequests = 100, windowMinutes = 1): RateLimitConfig => ({
      windowSizeMs: windowMinutes * 60 * 1000,
      maxRequests,
      keyGenerator: (ip: string) => `ip:${ip}`,
      message: 'Too many requests from this IP'
    }),

    // Rate limiting por usuario
    perUser: (maxRequests = 50, windowMinutes = 1): RateLimitConfig => ({
      windowSizeMs: windowMinutes * 60 * 1000,
      maxRequests,
      keyGenerator: (userId: string) => `user:${userId}`,
      message: 'Too many requests from this user'
    }),

    // Rate limiting por teléfono (WhatsApp)
    perPhone: (maxRequests = 30, windowMinutes = 1): RateLimitConfig => ({
      windowSizeMs: windowMinutes * 60 * 1000,
      maxRequests,
      keyGenerator: (phone: string) => `phone:${phone}`,
      message: 'Too many messages from this phone number'
    }),

    // Rate limiting para APIs externas
    externalAPI: (maxRequests = 10, windowMinutes = 1): RateLimitConfig => ({
      windowSizeMs: windowMinutes * 60 * 1000,
      maxRequests,
      keyGenerator: (service: string) => `api:${service}`,
      message: 'External API rate limit exceeded'
    })
  };

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats(): any {
    const rateLimitStats = {
      activeWindows: this.windows.size,
      totalServices: this.serviceStats.size,
      circuitBreakers: {} as Record<string, any>
    };

    // Estadísticas de circuit breakers
    for (const [serviceName, state] of this.circuitBreakers.entries()) {
      const stats = this.serviceStats.get(serviceName);
      rateLimitStats.circuitBreakers[serviceName] = {
        state: state.state,
        failures: state.failures,
        successCount: state.successCount,
        totalRequests: stats?.totalRequests || 0,
        failureRate: stats ? (stats.failures / stats.totalRequests) * 100 : 0,
        averageResponseTime: stats?.averageResponseTime || 0
      };
    }

    return rateLimitStats;
  }

  /**
   * Obtiene estado de un circuit breaker específico
   */
  getCircuitBreakerState(serviceName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(serviceName) || null;
  }

  /**
   * Fuerza abrir un circuit breaker (para testing o mantenimiento)
   */
  forceOpenCircuitBreaker(serviceName: string): void {
    let state = this.circuitBreakers.get(serviceName);
    if (!state) {
      state = {
        state: 'OPEN',
        failures: 0,
        successCount: 0
      };
      this.circuitBreakers.set(serviceName, state);
    }

    state.state = 'OPEN';
    state.nextAttemptTime = new Date(Date.now() + 300000); // 5 minutos

    logger.warn('Circuit breaker manually opened', {
      service: 'circuit-breaker',
      serviceName
    });
  }

  /**
   * Fuerza cerrar un circuit breaker
   */
  forceCloseCircuitBreaker(serviceName: string): void {
    let state = this.circuitBreakers.get(serviceName);
    if (!state) {
      state = {
        state: 'CLOSED',
        failures: 0,
        successCount: 0
      };
      this.circuitBreakers.set(serviceName, state);
    }

    state.state = 'CLOSED';
    state.failures = 0;
    state.successCount = 0;
    state.lastFailureTime = undefined;
    state.nextAttemptTime = undefined;

    logger.info('Circuit breaker manually closed', {
      service: 'circuit-breaker',
      serviceName
    });
  }

  /**
   * Limpia datos antiguos
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedWindows = 0;

    // Limpiar ventanas de rate limiting antiguas
    for (const [key, window] of this.windows.entries()) {
      if (now - window.windowStart > 300000) { // 5 minutos
        this.windows.delete(key);
        cleanedWindows++;
      }
    }

    // Limpiar estadísticas de servicios inactivos
    for (const [serviceName, stats] of this.serviceStats.entries()) {
      if (now - stats.lastRequestTime.getTime() > 3600000) { // 1 hora
        this.serviceStats.delete(serviceName);
        this.circuitBreakers.delete(serviceName);
      }
    }

    if (cleanedWindows > 0) {
      logger.debug('Rate limiter cleanup completed', {
        service: 'rate-limiter',
        cleanedWindows,
        activeWindows: this.windows.size
      });
    }
  }

  /**
   * Enmascara identificadores para logs
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.length <= 6) return identifier;
    return identifier.substring(0, 3) + '***' + identifier.substring(identifier.length - 3);
  }

  /**
   * Destruye el rate limiter
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.windows.clear();
    this.circuitBreakers.clear();
    this.serviceStats.clear();
    
    logger.info('Rate limiter destroyed');
  }
}

// Exportar instancia singleton
export const rateLimiter = new RateLimiter(); 