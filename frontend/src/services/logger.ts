/**
 * Servicio de logging para el frontend
 * Controla los niveles de log y evita logs excesivos
 */

interface LogData {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  component?: string;
}

class LoggerService {
  private isDevelopment = import.meta.env.DEV;
  private logLevel = import.meta.env.VITE_LOG_LEVEL || 'warn';
  private logBuffer: LogData[] = [];
  private maxBufferSize = 100;
  private flushInterval!: NodeJS.Timeout;

  constructor() {
    // Flush logs cada 30 segundos en producción
    if (!this.isDevelopment) {
      this.flushInterval = setInterval(() => {
        this.flushLogs();
      }, 30000);
    }
  }

  /**
   * Log principal con control de niveles
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any, component?: string) {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const logData: LogData = {
        timestamp,
        level,
        message,
        data,
        component: component || this.getComponentName()
      };
      
      if (this.isDevelopment) {
        // En desarrollo, mostrar en consola inmediatamente
        this.logToConsole(logData);
      } else {
        // En producción, buffer logs
        this.addToBuffer(logData);
      }
    }
  }

  /**
   * Verificar si debe loggear basado en nivel
   */
  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel as keyof typeof levels] || 2;
    const messageLevel = levels[level as keyof typeof levels] || 0;
    return messageLevel >= currentLevel;
  }

  /**
   * Obtener nombre del componente actual
   */
  private getComponentName(): string {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        for (const line of lines) {
          if (line.includes('frontend/src/') && !line.includes('logger.ts')) {
            const match = line.match(/frontend\/src\/([^:]+)/);
            return match ? match[1] : 'unknown';
          }
        }
      }
    } catch (error) {
      // Ignorar errores al obtener nombre del componente
    }
    return 'unknown';
  }

  /**
   * Log a consola en desarrollo
   */
  private logToConsole(logData: LogData): void {
    const { level, message, data, component } = logData;
    const prefix = component ? `[${component}]` : '';
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data);
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data);
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data);
        break;
    }
  }

  /**
   * Agregar log al buffer en producción
   */
  private addToBuffer(logData: LogData): void {
    this.logBuffer.push(logData);
    
    // Si el buffer está lleno, flush inmediatamente
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flushLogs();
    }
  }

  /**
   * Enviar logs al servidor
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToSend = [...this.logBuffer];
      this.logBuffer = [];

      // Enviar logs al endpoint de logging del backend (usar URL absoluta si está configurada)
      const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
      await fetch(`${baseUrl}/api/logging/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logsToSend)
      });
    } catch (error) {
      // En caso de error, restaurar logs al buffer
      this.logBuffer.unshift(...this.logBuffer);
      console.warn('Error enviando logs al servidor:', error);
    }
  }

  /**
   * Métodos de conveniencia
   */
  debug(message: string, data?: any, component?: string): void {
    this.log('debug', message, data, component);
  }

  info(message: string, data?: any, component?: string): void {
    this.log('info', message, data, component);
  }

  warn(message: string, data?: any, component?: string): void {
    this.log('warn', message, data, component);
  }

  error(message: string, data?: any, component?: string): void {
    this.log('error', message, data, component);
  }

  /**
   * Log de performance
   */
  performance(operation: string, duration: number, component?: string): void {
    if (duration > 1000) {
      this.warn(`Operación lenta: ${operation}`, { duration: `${duration}ms` }, component);
    } else {
      this.debug(`Operación completada: ${operation}`, { duration: `${duration}ms` }, component);
    }
  }

  /**
   * Log de errores de API
   */
  apiError(endpoint: string, error: any, component?: string): void {
    this.error(`Error de API: ${endpoint}`, { 
      message: error.message, 
      status: error.status,
      url: endpoint 
    }, component);
  }

  /**
   * Log de WebSocket
   */
  websocket(event: string, data?: any, component?: string): void {
    this.debug(`WebSocket: ${event}`, data, component);
  }

  /**
   * Cleanup al destruir
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushLogs();
  }
}

// Instancia singleton
export const logger = new LoggerService();

// Cleanup al cerrar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.destroy();
  });
}

export default logger; 