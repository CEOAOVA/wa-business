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
exports.retryService = exports.RetryService = void 0;
class RetryService {
    constructor() {
        this.DEFAULT_CONFIG = {
            maxAttempts: 3,
            baseDelay: 1000, // 1 segundo
            maxDelay: 30000, // 30 segundos
            backoffMultiplier: 2,
            jitterFactor: 0.1, // 10% de jitter
            timeout: 10000 // 10 segundos
        };
    }
    static getInstance() {
        if (!RetryService.instance) {
            RetryService.instance = new RetryService();
        }
        return RetryService.instance;
    }
    /**
     * Ejecutar operación con retry y exponential backoff
     */
    executeWithRetry(operation, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalConfig = Object.assign(Object.assign({}, this.DEFAULT_CONFIG), config);
            const startTime = Date.now();
            let lastError;
            for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
                try {
                    // Crear timeout para la operación
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeout);
                    });
                    // Ejecutar operación con timeout
                    const result = yield Promise.race([operation(), timeoutPromise]);
                    return {
                        success: true,
                        data: result,
                        attempts: attempt,
                        totalTime: Date.now() - startTime
                    };
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    // Si es el último intento, fallar
                    if (attempt === finalConfig.maxAttempts) {
                        return {
                            success: false,
                            error: lastError,
                            attempts: attempt,
                            totalTime: Date.now() - startTime
                        };
                    }
                    // Calcular delay con exponential backoff y jitter
                    const delay = this.calculateDelay(attempt, finalConfig);
                    console.log(`🔄 [RetryService] Intento ${attempt} falló, reintentando en ${delay}ms: ${lastError.message}`);
                    // Esperar antes del siguiente intento
                    yield this.sleep(delay);
                }
            }
            return {
                success: false,
                error: lastError,
                attempts: finalConfig.maxAttempts,
                totalTime: Date.now() - startTime
            };
        });
    }
    /**
     * Ejecutar operación con retry específico para Supabase
     */
    executeSupabaseWithRetry(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWithRetry(operation, {
                maxAttempts: 5,
                baseDelay: 500,
                maxDelay: 15000,
                timeout: 8000
            });
        });
    }
    /**
     * Ejecutar operación con retry específico para SOAP
     */
    executeSoapWithRetry(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWithRetry(operation, {
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                timeout: 15000
            });
        });
    }
    /**
     * Ejecutar operación con retry específico para WhatsApp
     */
    executeWhatsAppWithRetry(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWithRetry(operation, {
                maxAttempts: 3,
                baseDelay: 2000,
                maxDelay: 20000,
                timeout: 12000
            });
        });
    }
    /**
     * Calcular delay con exponential backoff y jitter
     */
    calculateDelay(attempt, config) {
        // Exponential backoff
        const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        // Aplicar límite máximo
        const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
        // Agregar jitter para evitar thundering herd
        const jitter = cappedDelay * config.jitterFactor * (Math.random() - 0.5);
        return Math.max(0, cappedDelay + jitter);
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Verificar si un error es retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ENETUNREACH',
            'ECONNABORTED',
            'Operation timeout'
        ];
        return retryableErrors.some(retryableError => error.message.includes(retryableError) ||
            error.name.includes(retryableError));
    }
    /**
     * Ejecutar operación con retry solo para errores retryables
     */
    executeWithRetryOnError(operation, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const finalConfig = Object.assign(Object.assign({}, this.DEFAULT_CONFIG), config);
            const startTime = Date.now();
            let lastError;
            for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
                try {
                    const result = yield operation();
                    return {
                        success: true,
                        data: result,
                        attempts: attempt,
                        totalTime: Date.now() - startTime
                    };
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    // Verificar si el error es retryable
                    if (!this.isRetryableError(lastError)) {
                        return {
                            success: false,
                            error: lastError,
                            attempts: attempt,
                            totalTime: Date.now() - startTime
                        };
                    }
                    // Si es el último intento, fallar
                    if (attempt === finalConfig.maxAttempts) {
                        return {
                            success: false,
                            error: lastError,
                            attempts: attempt,
                            totalTime: Date.now() - startTime
                        };
                    }
                    const delay = this.calculateDelay(attempt, finalConfig);
                    console.log(`🔄 [RetryService] Error retryable en intento ${attempt}, reintentando en ${delay}ms: ${lastError.message}`);
                    yield this.sleep(delay);
                }
            }
            return {
                success: false,
                error: lastError,
                attempts: finalConfig.maxAttempts,
                totalTime: Date.now() - startTime
            };
        });
    }
}
exports.RetryService = RetryService;
// Exportar instancia singleton
exports.retryService = RetryService.getInstance();
