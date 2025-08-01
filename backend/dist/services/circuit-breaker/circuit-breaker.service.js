"use strict";
/**
 * Servicio de Circuit Breaker para prevenir fallos en cascada
 * Implementa el patrón Circuit Breaker con estados CLOSED, OPEN, HALF_OPEN
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
exports.whatsappCircuitBreaker = exports.soapCircuitBreaker = exports.supabaseCircuitBreaker = exports.CircuitBreakerService = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
const DEFAULT_CONFIG = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 segundos
    timeout: 10000 // 10 segundos
};
class CircuitBreakerService {
    constructor(name, config = {}) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        this.lastSuccessTime = 0;
        this.totalRequests = 0;
        this.name = name;
        this.config = Object.assign(Object.assign({}, DEFAULT_CONFIG), config);
    }
    /**
     * Ejecuta una operación con protección de circuit breaker
     */
    execute(operation, fallback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.totalRequests++;
            // Verificar si el circuito está abierto
            if (this.state === 'OPEN') {
                if (this.shouldAttemptReset()) {
                    this.state = 'HALF_OPEN';
                    console.log(`🔄 [CircuitBreaker:${this.name}] Cambiando a HALF_OPEN`);
                }
                else {
                    console.log(`🚫 [CircuitBreaker:${this.name}] Circuito abierto, usando fallback`);
                    if (fallback) {
                        return yield fallback();
                    }
                    throw new Error(`Circuit breaker ${this.name} is OPEN`);
                }
            }
            try {
                // Ejecutar operación con timeout
                const result = yield this.executeWithTimeout(operation);
                // Operación exitosa
                this.onSuccess();
                // Si estaba en HALF_OPEN, cerrar el circuito
                if (this.state === 'HALF_OPEN') {
                    this.state = 'CLOSED';
                    console.log(`✅ [CircuitBreaker:${this.name}] Circuito cerrado exitosamente`);
                }
                return result;
            }
            catch (error) {
                // Operación fallida
                this.onFailure();
                // Intentar fallback si está disponible
                if (fallback) {
                    console.log(`🔄 [CircuitBreaker:${this.name}] Usando fallback después de fallo`);
                    try {
                        return yield fallback();
                    }
                    catch (fallbackError) {
                        console.error(`❌ [CircuitBreaker:${this.name}] Fallback también falló:`, fallbackError);
                        throw error; // Lanzar el error original
                    }
                }
                throw error;
            }
        });
    }
    /**
     * Ejecuta una operación con timeout
     */
    executeWithTimeout(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.timeout) {
                return yield operation();
            }
            return new Promise((resolve, reject) => {
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
        });
    }
    /**
     * Maneja un éxito
     */
    onSuccess() {
        this.successCount++;
        this.lastSuccessTime = Date.now();
        this.failureCount = 0; // Reset failure count on success
        console.log(`✅ [CircuitBreaker:${this.name}] Operación exitosa`);
    }
    /**
     * Maneja un fallo
     */
    onFailure() {
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
    shouldAttemptReset() {
        return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
    }
    /**
     * Obtiene métricas del circuit breaker
     */
    getMetrics() {
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
    forceState(state) {
        this.state = state;
        console.log(`🔧 [CircuitBreaker:${this.name}] Estado forzado a ${state}`);
    }
    /**
     * Resetea el circuit breaker
     */
    reset() {
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
    isHealthy() {
        return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
    }
}
exports.CircuitBreakerService = CircuitBreakerService;
// Instancias globales para diferentes servicios
exports.supabaseCircuitBreaker = new CircuitBreakerService('supabase', {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    timeout: 10000
});
exports.soapCircuitBreaker = new CircuitBreakerService('soap', {
    failureThreshold: 2,
    recoveryTimeout: 60000, // 1 minuto para SOAP
    timeout: 15000
});
exports.whatsappCircuitBreaker = new CircuitBreakerService('whatsapp', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    timeout: 20000
});
// Función helper para crear circuit breakers específicos
function createCircuitBreaker(name, config) {
    return new CircuitBreakerService(name, config);
}
