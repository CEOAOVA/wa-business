export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  timeout: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryService {
  private static instance: RetryService;
  
  private readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 segundo
    maxDelay: 30000, // 30 segundos
    backoffMultiplier: 2,
    jitterFactor: 0.1, // 10% de jitter
    timeout: 10000 // 10 segundos
  };
  
  private constructor() {}
  
  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }
  
  /**
   * Ejecutar operación con retry y exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        // Crear timeout para la operación
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeout);
        });
        
        // Ejecutar operación con timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
        
      } catch (error) {
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
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError!,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }
  
  /**
   * Ejecutar operación con retry específico para Supabase
   */
  async executeSupabaseWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(operation, {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 15000,
      timeout: 8000
    });
  }
  
  /**
   * Ejecutar operación con retry específico para SOAP
   */
  async executeSoapWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      timeout: 15000
    });
  }
  
  /**
   * Ejecutar operación con retry específico para WhatsApp
   */
  async executeWhatsAppWithRetry<T>(
    operation: () => Promise<T>
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(operation, {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 20000,
      timeout: 12000
    });
  }
  
  /**
   * Calcular delay con exponential backoff y jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
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
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Verificar si un error es retryable
   */
  isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'ECONNABORTED',
      'Operation timeout'
    ];
    
    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || 
      error.name.includes(retryableError)
    );
  }
  
  /**
   * Ejecutar operación con retry solo para errores retryables
   */
  async executeWithRetryOnError<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
        
      } catch (error) {
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
        
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError!,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }
}

// Exportar instancia singleton
export const retryService = RetryService.getInstance(); 