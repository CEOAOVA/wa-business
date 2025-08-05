/**
 * WhatsApp Resilience Service - Retry logic y manejo de fallos para WhatsApp API
 * Mejora la confiabilidad de las llamadas a la API de WhatsApp
 */

import { StructuredLogger } from '../utils/structured-logger';
import { whatsappService } from './whatsapp.service';

export interface RetryConfig {
  maxRetries: number;
  retryDelays: number[];
  retryableErrors: string[];
  exponentialBackoff: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalDuration: number;
}

export class WhatsAppResilienceService {
  private static defaultConfig: RetryConfig = {
    maxRetries: 3,
    retryDelays: [1000, 2000, 4000], // 1s, 2s, 4s
    retryableErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'NETWORK_ERROR',
      'RATE_LIMIT',
      'TEMPORARY_FAILURE'
    ],
    exponentialBackoff: true
  };

  /**
   * Enviar mensaje con retry logic
   */
  static async sendMessageWithRetry(
    payload: any, 
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<any>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const correlationId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    let lastError: any;
    const startTime = Date.now();
    
    context.logWhatsApp('send_message_retry_start', {
      payload: { to: payload.to, hasMessage: !!payload.message },
      config: finalConfig
    });

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        context.logWhatsApp('send_message_attempt', {
          attempt: attempt + 1,
          totalAttempts: finalConfig.maxRetries + 1
        });

        const result = await whatsappService.sendMessage(payload);
        
        if (result.success) {
          const attemptDuration = Date.now() - attemptStartTime;
          const totalDuration = Date.now() - startTime;
          
          context.logPerformance('send_message_success', totalDuration, {
            attempt: attempt + 1,
            attemptDuration,
            messageId: result.messageId
          });

          return {
            success: true,
            data: result,
            attempts: attempt + 1,
            totalDuration
          };
        }
        
        throw new Error(result.error || 'Unknown WhatsApp API error');
        
      } catch (error: any) {
        lastError = error;
        const attemptDuration = Date.now() - attemptStartTime;
        
        const errorId = context.logError('send_message_attempt_failed', error, {
          attempt: attempt + 1,
          attemptDuration,
          isRetryable: this.isRetryableError(error, finalConfig)
        });

        // Si no es retryable o es el último intento, fallar inmediatamente
        if (!this.isRetryableError(error, finalConfig) || attempt === finalConfig.maxRetries) {
          const totalDuration = Date.now() - startTime;
          
          context.logError('send_message_final_failure', error, {
            totalAttempts: attempt + 1,
            totalDuration,
            errorId
          });

          return {
            success: false,
            error: error.message,
            attempts: attempt + 1,
            totalDuration
          };
        }

        // Calcular delay para el siguiente intento
        const delay = this.calculateDelay(attempt, finalConfig);
        
        context.logWhatsApp('send_message_retry_scheduled', {
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          delay,
          errorId
        });

        await this.delay(delay);
      }
    }

    // Esto no debería ejecutarse nunca, pero por seguridad
    const totalDuration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: finalConfig.maxRetries + 1,
      totalDuration
    };
  }

  /**
   * Obtener información del número de teléfono con retry
   */
  static async getPhoneNumberInfoWithRetry(
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<any>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const correlationId = `phone_info_retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    let lastError: any;
    const startTime = Date.now();
    
    context.logWhatsApp('get_phone_info_retry_start', { config: finalConfig });

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        context.logWhatsApp('get_phone_info_attempt', {
          attempt: attempt + 1,
          totalAttempts: finalConfig.maxRetries + 1
        });

        const result = await whatsappService.getPhoneNumberInfo();
        
        if (result.success) {
          const attemptDuration = Date.now() - attemptStartTime;
          const totalDuration = Date.now() - startTime;
          
          context.logPerformance('get_phone_info_success', totalDuration, {
            attempt: attempt + 1,
            attemptDuration
          });

          return {
            success: true,
            data: result,
            attempts: attempt + 1,
            totalDuration
          };
        }
        
        throw new Error(result.error || 'Unknown WhatsApp API error');
        
      } catch (error) {
        lastError = error;
        const attemptDuration = Date.now() - attemptStartTime;
        
        const errorId = context.logError('get_phone_info_attempt_failed', error, {
          attempt: attempt + 1,
          attemptDuration,
          isRetryable: this.isRetryableError(error, finalConfig)
        });

        if (!this.isRetryableError(error, finalConfig) || attempt === finalConfig.maxRetries) {
          const totalDuration = Date.now() - startTime;
          
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt + 1,
            totalDuration
          };
        }

        const delay = this.calculateDelay(attempt, finalConfig);
        context.logWhatsApp('get_phone_info_retry_scheduled', {
          attempt: attempt + 1,
          delay,
          errorId
        });

        await this.delay(delay);
      }
    }

    const totalDuration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: finalConfig.maxRetries + 1,
      totalDuration
    };
  }

  /**
   * Verificar si un error es retryable
   */
  private static isRetryableError(error: any, config: RetryConfig): boolean {
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    // Verificar códigos de error específicos
    const isRetryableCode = config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError) || errorCode.includes(retryableError)
    );

    // Verificar códigos de estado HTTP retryables
    const statusCode = error.response?.status || error.status;
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const isRetryableStatus = statusCode && retryableStatusCodes.includes(statusCode);

    // Verificar errores de red comunes
    const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'];
    const isNetworkError = networkErrors.some(netError => 
      errorCode === netError || errorMessage.includes(netError)
    );

    const isRetryable = isRetryableCode || isRetryableStatus || isNetworkError;
    
    StructuredLogger.logSystemEvent('error_retry_evaluation', {
      errorMessage: errorMessage.substring(0, 100), // Limitar longitud
      errorCode,
      statusCode,
      isRetryable,
      matchedRetryableError: config.retryableErrors.find(re => 
        errorMessage.includes(re) || errorCode.includes(re)
      )
    });

    return isRetryable;
  }

  /**
   * Calcular delay para el siguiente intento
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    if (config.exponentialBackoff) {
      // Backoff exponencial con jitter
      const baseDelay = config.retryDelays[attempt] || config.retryDelays[config.retryDelays.length - 1];
      const jitter = Math.random() * 0.1 * baseDelay; // 10% de jitter
      return Math.floor(baseDelay + jitter);
    } else {
      // Delay fijo
      return config.retryDelays[attempt] || config.retryDelays[config.retryDelays.length - 1];
    }
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecutar cualquier función con retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const correlationId = `generic_retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    let lastError: any;
    const startTime = Date.now();
    
    context.logWhatsApp(`${operationName}_retry_start`, { config: finalConfig });

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        context.logWhatsApp(`${operationName}_attempt`, {
          attempt: attempt + 1,
          totalAttempts: finalConfig.maxRetries + 1
        });

        const result = await operation();
        
        const attemptDuration = Date.now() - attemptStartTime;
        const totalDuration = Date.now() - startTime;
        
        context.logPerformance(`${operationName}_success`, totalDuration, {
          attempt: attempt + 1,
          attemptDuration
        });

        return {
          success: true,
          data: result,
          attempts: attempt + 1,
          totalDuration
        };
        
      } catch (error) {
        lastError = error;
        const attemptDuration = Date.now() - attemptStartTime;
        
        const errorId = context.logError(`${operationName}_attempt_failed`, error, {
          attempt: attempt + 1,
          attemptDuration,
          isRetryable: this.isRetryableError(error, finalConfig)
        });

        if (!this.isRetryableError(error, finalConfig) || attempt === finalConfig.maxRetries) {
          const totalDuration = Date.now() - startTime;
          
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt + 1,
            totalDuration
          };
        }

        const delay = this.calculateDelay(attempt, finalConfig);
        context.logWhatsApp(`${operationName}_retry_scheduled`, {
          attempt: attempt + 1,
          delay,
          errorId
        });

        await this.delay(delay);
      }
    }

    const totalDuration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: finalConfig.maxRetries + 1,
      totalDuration
    };
  }

  /**
   * Obtener estadísticas de reintentos
   */
  static getRetryStats() {
    return {
      defaultConfig: this.defaultConfig,
      retryableErrorTypes: this.defaultConfig.retryableErrors.length,
      maxRetries: this.defaultConfig.maxRetries,
      totalMaxDelay: this.defaultConfig.retryDelays.reduce((sum, delay) => sum + delay, 0)
    };
  }
}
