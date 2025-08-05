/**
 * Structured Logger - Logging consistente y estructurado para toda la aplicación
 * Mejora la capacidad de diagnóstico y monitoreo
 */

import { logger } from '../config/logger';

export class StructuredLogger {
  /**
   * Generar ID de correlación único para seguimiento de requests
   */
  private static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log eventos de WhatsApp con estructura consistente
   */
  static logWhatsAppEvent(event: string, data: any, correlationId?: string) {
    logger.info(`WhatsApp: ${event}`, {
      event,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data,
      service: 'whatsapp'
    });
  }

  /**
   * Log operaciones de base de datos
   */
  static logDatabaseEvent(operation: string, table: string, data: any, correlationId?: string) {
    logger.info(`Database: ${operation}`, {
      operation,
      table,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data,
      service: 'database'
    });
  }

  /**
   * Log errores de manera estructurada
   */
  static logError(context: string, error: any, additionalData?: any, correlationId?: string) {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.error(`Error in ${context}`, {
      errorId,
      context,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      additionalData,
      service: context.split(':')[0] || 'unknown'
    });

    return errorId;
  }

  /**
   * Log eventos de autenticación
   */
  static logAuthEvent(event: string, userId?: string, additionalData?: any, correlationId?: string) {
    logger.info(`Auth: ${event}`, {
      event,
      userId,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data: additionalData,
      service: 'auth'
    });
  }

  /**
   * Log eventos de webhook
   */
  static logWebhookEvent(event: string, webhookData: any, correlationId?: string) {
    logger.info(`Webhook: ${event}`, {
      event,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data: {
        from: webhookData.from,
        messageId: webhookData.messageId,
        type: webhookData.type,
        // No logear contenido completo por privacidad
        hasContent: !!webhookData.content
      },
      service: 'webhook'
    });
  }

  /**
   * Log métricas de performance
   */
  static logPerformanceMetric(operation: string, duration: number, additionalData?: any, correlationId?: string) {
    logger.info(`Performance: ${operation}`, {
      operation,
      duration,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data: additionalData,
      service: 'performance'
    });
  }

  /**
   * Log eventos de Socket.IO
   */
  static logSocketEvent(event: string, socketId: string, additionalData?: any, correlationId?: string) {
    logger.info(`Socket: ${event}`, {
      event,
      socketId,
      correlationId: correlationId || this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      data: additionalData,
      service: 'socket'
    });
  }

  /**
   * Log eventos del sistema (startup, shutdown, etc.)
   */
  static logSystemEvent(event: string, additionalData?: any) {
    logger.info(`System: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      data: additionalData,
      service: 'system'
    });
  }

  /**
   * Crear un contexto de logging con correlationId persistente
   */
  static createContext(correlationId?: string) {
    const contextId = correlationId || this.generateCorrelationId();
    
    return {
      correlationId: contextId,
      logWhatsApp: (event: string, data: any) => this.logWhatsAppEvent(event, data, contextId),
      logDatabase: (operation: string, table: string, data: any) => this.logDatabaseEvent(operation, table, data, contextId),
      logError: (context: string, error: any, additionalData?: any) => this.logError(context, error, additionalData, contextId),
      logAuth: (event: string, userId?: string, additionalData?: any) => this.logAuthEvent(event, userId, additionalData, contextId),
      logWebhook: (event: string, webhookData: any) => this.logWebhookEvent(event, webhookData, contextId),
      logPerformance: (operation: string, duration: number, additionalData?: any) => this.logPerformanceMetric(operation, duration, additionalData, contextId),
      logSocket: (event: string, socketId: string, additionalData?: any) => this.logSocketEvent(event, socketId, additionalData, contextId)
    };
  }
}

/**
 * Middleware para agregar correlationId a requests HTTP
 */
export function correlationMiddleware(req: any, res: any, next: any) {
  req.correlationId = req.headers['x-correlation-id'] || StructuredLogger['generateCorrelationId']();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

/**
 * Decorator para logging automático de métodos
 */
export function LogMethod(context: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const correlationId = StructuredLogger['generateCorrelationId']();
      
      StructuredLogger.logPerformanceMetric(`${context}:${propertyName}:start`, 0, { args: args.length }, correlationId);
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        StructuredLogger.logPerformanceMetric(`${context}:${propertyName}:success`, duration, { 
          hasResult: !!result 
        }, correlationId);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        StructuredLogger.logError(`${context}:${propertyName}`, error, { 
          duration,
          args: args.length 
        }, correlationId);
        
        throw error;
      }
    };
  };
}
