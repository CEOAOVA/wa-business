/**
 * Servicio de Circuit Breaker para prevenir fallos en cascada
 * Implementa el patrón Circuit Breaker con estados CLOSED, OPEN, HALF_OPEN
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Número de fallos antes de abrir el circuito
  recoveryTimeout: number; // Tiempo en ms antes de intentar cerrar el circuito
  expectedValue?: any; // Valor esperado para validar respuestas
  timeout?: number; // Timeout para operaciones individuales
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  failureRate: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 segundos
  timeout: 10000 // 10 segundos
};

export class CircuitBreakerService {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private totalRequests: number = 0;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Ejecuta una operación con protección de circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    // Verificar si el circuito está abierto
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        console.log(`🔄 [CircuitBreaker:${this.name}] Cambiando a HALF_OPEN`);
      } else {
        console.log(`🚫 [CircuitBreaker:${this.name}] Circuito abierto, usando fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      // Ejecutar operación con timeout
      const result = await this.executeWithTimeout(operation);
      
      // Operación exitosa
      this.onSuccess();
      
      // Si estaba en HALF_OPEN, cerrar el circuito
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        console.log(`✅ [CircuitBreaker:${this.name}] Circuito cerrado exitosamente`);
      }
      
      return result;
      
    } catch (error) {
      // Operación fallida
      this.onFailure();
      
      // Intentar fallback si está disponible
      if (fallback) {
        console.log(`🔄 [CircuitBreaker:${this.name}] Usando fallback después de fallo`);
        try {
          return await fallback();
        } catch (fallbackError) {
          console.error(`❌ [CircuitBreaker:${this.name}] Fallback también falló:`, fallbackError);
          throw error; // Lanzar el error original
        }
      }
      
      throw error;
    }
  }

  /**
   * Ejecuta una operación con timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.timeout) {
      return await operation();
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Maneja un éxito
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.failureCount = 0; // Reset failure count on success
    
    console.log(`✅ [CircuitBreaker:${this.name}] Operación exitosa`);
  }

  /**
   * Maneja un fallo
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.log(`❌ [CircuitBreaker:${this.name}] Operación fallida (${this.failureCount}/${this.config.failureThreshold})`);
    
    // Verificar si debemos abrir el circuito
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🚫 [CircuitBreaker:${this.name}] Circuito abierto después de ${this.failureCount} fallos`);
    }
  }

  /**
   * Determina si debemos intentar resetear el circuito
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  /**
   * Obtiene métricas del circuit breaker
   */
  getMetrics(): CircuitBreakerMetrics {
    const failureRate = this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      failureRate
    };
  }

  /**
   * Fuerza el estado del circuit breaker (útil para testing)
   */
  forceState(state: CircuitBreakerState): void {
    this.state = state;
    console.log(`🔧 [CircuitBreaker:${this.name}] Estado forzado a ${state}`);
  }

  /**
   * Resetea el circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.totalRequests = 0;
    console.log(`🔄 [CircuitBreaker:${this.name}] Reseteado`);
  }

  /**
   * Verifica si el circuit breaker está saludable
   */
  isHealthy(): boolean {
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }
}

// Instancias globales para diferentes servicios
export const supabaseCircuitBreaker = new CircuitBreakerService('supabase', {
  failureThreshold: 3,
  recoveryTimeout: 30000,
  timeout: 10000
});

export const soapCircuitBreaker = new CircuitBreakerService('soap', {
  failureThreshold: 2,
  recoveryTimeout: 60000, // 1 minuto para SOAP
  timeout: 15000
});

export const whatsappCircuitBreaker = new CircuitBreakerService('whatsapp', {
  failureThreshold: 5,
  recoveryTimeout: 30000,
  timeout: 20000
});

// Función helper para crear circuit breakers específicos
export function createCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreakerService {
  return new CircuitBreakerService(name, config);
} 