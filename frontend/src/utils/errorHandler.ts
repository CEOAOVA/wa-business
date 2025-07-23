/**
 * Sistema de manejo de errores centralizado
 * Proporciona logging, notificaciones y recuperación automática
 */

export interface ErrorInfo {
  id: string;
  message: string;
  type: 'network' | 'validation' | 'auth' | 'api' | 'websocket' | 'cache' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: any;
  stack?: string;
  userAction?: string;
  retryable: boolean;
  retryCount: number;
}

export interface ErrorHandlerConfig {
  enableNotifications: boolean;
  enableLogging: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  logToConsole: boolean;
  logToStorage: boolean;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableNotifications: true,
  enableLogging: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  logToConsole: true,
  logToStorage: true,
};

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorLog: ErrorInfo[] = [];
  private notificationCallback?: (error: ErrorInfo) => void;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadErrorLog();
  }

  /**
   * Registrar callback para notificaciones
   */
  setNotificationCallback(callback: (error: ErrorInfo) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * Manejar error
   */
  handleError(
    error: Error | string,
    context?: any,
    options?: {
      type?: ErrorInfo['type'];
      severity?: ErrorInfo['severity'];
      retryable?: boolean;
      userAction?: string;
    }
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      message: typeof error === 'string' ? error : error.message,
      type: options?.type || this.categorizeError(error),
      severity: options?.severity || this.calculateSeverity(error),
      timestamp: new Date(),
      context,
      stack: error instanceof Error ? error.stack : undefined,
      userAction: options?.userAction,
      retryable: options?.retryable ?? this.isRetryable(error),
      retryCount: 0,
    };

    // Logging
    if (this.config.enableLogging) {
      this.logError(errorInfo);
    }

    // Notificaciones
    if (this.config.enableNotifications && this.notificationCallback) {
      this.notificationCallback(errorInfo);
    }

    // Almacenar en log
    this.errorLog.push(errorInfo);
    this.saveErrorLog();

    return errorInfo;
  }

  /**
   * Manejar error con retry automático
   */
  async handleErrorWithRetry<T>(
    operation: () => Promise<T>,
    context?: any,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number) => void;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    const retryDelay = options?.retryDelay ?? this.config.retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt) {
          this.handleError(error as Error, context, {
            type: 'api',
            severity: 'high',
            retryable: false,
            userAction: 'Reintentar manualmente',
          });
          throw error;
        }

        // Notificar intento de retry
        if (options?.onRetry) {
          options.onRetry(attempt + 1);
        }

        // Esperar antes del siguiente intento
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    throw new Error('Máximo número de reintentos alcanzado');
  }

  /**
   * Categorizar error
   */
  private categorizeError(error: Error | string): ErrorInfo['type'] {
    const message = typeof error === 'string' ? error : error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'auth';
    }
    if (message.includes('websocket') || message.includes('socket')) {
      return 'websocket';
    }
    if (message.includes('cache') || message.includes('storage')) {
      return 'cache';
    }
    if (message.includes('api') || message.includes('server')) {
      return 'api';
    }
    
    return 'unknown';
  }

  /**
   * Calcular severidad del error
   */
  private calculateSeverity(error: Error | string): ErrorInfo['severity'] {
    const message = typeof error === 'string' ? error : error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('error') || message.includes('failed')) {
      return 'high';
    }
    if (message.includes('warning') || message.includes('retry')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Determinar si el error es reintentable
   */
  private isRetryable(error: Error | string): boolean {
    const message = typeof error === 'string' ? error : error.message.toLowerCase();
    
    // Errores que NO son reintentables
    const nonRetryablePatterns = [
      'unauthorized',
      'forbidden',
      'validation',
      'invalid',
      'not found',
      'syntax error',
    ];

    return !nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Generar ID único para error
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging de errores
   */
  private logError(errorInfo: ErrorInfo): void {
    const logMessage = `[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`;
    
    if (this.config.logToConsole) {
      switch (errorInfo.severity) {
        case 'critical':
        case 'high':
          console.error(logMessage, errorInfo);
          break;
        case 'medium':
          console.warn(logMessage, errorInfo);
          break;
        case 'low':
          console.info(logMessage, errorInfo);
          break;
      }
    }
  }

  /**
   * Guardar log de errores en localStorage
   */
  private saveErrorLog(): void {
    if (!this.config.logToStorage) return;

    try {
      // Mantener solo los últimos 100 errores
      const recentErrors = this.errorLog.slice(-100);
      localStorage.setItem('error_log', JSON.stringify(recentErrors));
    } catch (error) {
      console.error('Error guardando log de errores:', error);
    }
  }

  /**
   * Cargar log de errores desde localStorage
   */
  private loadErrorLog(): void {
    if (!this.config.logToStorage) return;

    try {
      const stored = localStorage.getItem('error_log');
      if (stored) {
        this.errorLog = JSON.parse(stored).map((error: any) => ({
          ...error,
          timestamp: new Date(error.timestamp),
        }));
      }
    } catch (error) {
      console.error('Error cargando log de errores:', error);
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtener errores recientes
   */
  getRecentErrors(limit: number = 10): ErrorInfo[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Obtener errores por tipo
   */
  getErrorsByType(type: ErrorInfo['type']): ErrorInfo[] {
    return this.errorLog.filter(error => error.type === type);
  }

  /**
   * Obtener errores por severidad
   */
  getErrorsBySeverity(severity: ErrorInfo['severity']): ErrorInfo[] {
    return this.errorLog.filter(error => error.severity === severity);
  }

  /**
   * Limpiar log de errores
   */
  clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('error_log');
  }

  /**
   * Obtener estadísticas de errores
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    this.errorLog.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(error => error.timestamp > oneHourAgo).length;

    return {
      total: this.errorLog.length,
      byType,
      bySeverity,
      recentErrors,
    };
  }

  /**
   * Crear error personalizado
   */
  createError(
    message: string,
    type: ErrorInfo['type'] = 'unknown',
    severity: ErrorInfo['severity'] = 'medium'
  ): ErrorInfo {
    return this.handleError(message, undefined, { type, severity });
  }

  /**
   * Manejar errores de red
   */
  handleNetworkError(error: Error, context?: any): ErrorInfo {
    return this.handleError(error, context, {
      type: 'network',
      severity: 'high',
      retryable: true,
      userAction: 'Verificar conexión a internet',
    });
  }

  /**
   * Manejar errores de autenticación
   */
  handleAuthError(error: Error, context?: any): ErrorInfo {
    return this.handleError(error, context, {
      type: 'auth',
      severity: 'high',
      retryable: false,
      userAction: 'Iniciar sesión nuevamente',
    });
  }

  /**
   * Manejar errores de validación
   */
  handleValidationError(error: Error, context?: any): ErrorInfo {
    return this.handleError(error, context, {
      type: 'validation',
      severity: 'medium',
      retryable: false,
      userAction: 'Verificar datos ingresados',
    });
  }

  /**
   * Manejar errores de WebSocket
   */
  handleWebSocketError(error: Error, context?: any): ErrorInfo {
    return this.handleError(error, context, {
      type: 'websocket',
      severity: 'high',
      retryable: true,
      userAction: 'Reconectar manualmente',
    });
  }
}

// Instancia singleton
export const errorHandler = new ErrorHandler();

// Hook para usar el error handler en componentes
export const useErrorHandler = () => {
  return {
    handleError: errorHandler.handleError.bind(errorHandler),
    handleErrorWithRetry: errorHandler.handleErrorWithRetry.bind(errorHandler),
    createError: errorHandler.createError.bind(errorHandler),
    handleNetworkError: errorHandler.handleNetworkError.bind(errorHandler),
    handleAuthError: errorHandler.handleAuthError.bind(errorHandler),
    handleValidationError: errorHandler.handleValidationError.bind(errorHandler),
    handleWebSocketError: errorHandler.handleWebSocketError.bind(errorHandler),
    getRecentErrors: errorHandler.getRecentErrors.bind(errorHandler),
    getErrorStats: errorHandler.getErrorStats.bind(errorHandler),
    clearErrorLog: errorHandler.clearErrorLog.bind(errorHandler),
    setNotificationCallback: errorHandler.setNotificationCallback.bind(errorHandler),
  };
};

// ErrorBoundary se encuentra en src/components/ErrorBoundary.tsx 