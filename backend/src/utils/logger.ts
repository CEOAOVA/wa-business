/**
 * Sistema de logging estructurado con Winston
 * Logging escalable para WhatsApp Business LLM
 */

import winston from 'winston';
import { getConfig } from '../config';

export interface LogContext {
  conversationId?: string;
  userId?: string;
  phoneNumber?: string;
  pointOfSaleId?: string;
  functionName?: string;
  intent?: string;
  responseTime?: number;
  error?: any;
  metadata?: any;
  service?: string;
  outcome?: string;
  model?: string;
  endpoint?: string;
  operation?: string;
  securityEvent?: string;
  method?: string;
  path?: string;
  // Añadidos para compatibilidad de logs
  remainingPoints?: number;
  retryAfter?: number;
  config?: any;
  key?: string;
  pattern?: string;
  evictedCount?: number;
  cleanedCount?: number;
  healthCheck?: any;
  metrics?: any;
  alert?: any;
  alertId?: string;
  metricsHistorySize?: number;
  identifier?: string;
  serviceName?: string;
  cleanedWindows?: number;
  duration?: number;
  tokens?: number;
  table?: string;
  details?: any;
  threshold?: number;
  url?: string;
  ttl?: number;
  invalidatedCount?: number;
  freedSpace?: number;
  activeAlerts?: number;
  requests?: number;
  activeWindows?: number;
  windowSizeMs?: number;
  limit?: number;
  ip?: string;
  statusCode?: number;
  requiredSize?: number;
  remainingItems?: number;
  userAgent?: string;
  // Extras usados por middlewares
  requestId?: string;
  username?: string;
  headers?: any;
  query?: any;
  body?: any;
  params?: any;
  ips?: string[];
  protocol?: string;
  secure?: boolean;
  xhr?: boolean;
  latency?: number;
  jobId?: string | number;
  priority?: string | number;
  before?: any;
  after?: any;
  cursor?: any;
  responseSize?: number;
  // Identificadores adicionales utilizados en servicios
  messageId?: string;
  socketId?: string;
  webhookCleaned?: number;
  messageCleaned?: number;
  // Agrupación de errores de validación
  errors?: any;
}

export interface SystemMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  requestCount: number;
  errorCount: number;
  responseTime: number;
}

export class Logger {
  private winston!: winston.Logger;
  private config: any;
  private metrics!: SystemMetrics;
  private requestCounter: number = 0;
  private errorCounter: number = 0;
  private responseTimes: number[] = [];

  constructor() {
    this.config = getConfig();
    this.initializeLogger();
    this.initializeMetrics();
    this.setupPeriodicMetrics();
  }

  /**
   * Inicializa Winston logger
   */
  private initializeLogger(): void {
    const logLevel = this.config.system.logLevel || 'info';
    const isDevelopment = this.config.nodeEnv === 'development';

    // Formato personalizado para logs estructurados
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    // Formato para consola en desarrollo
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
      }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        
        if (service) {
          logMessage += ` [${service}]`;
        }
        
        logMessage += ` ${message}`;
        
        // Agregar contexto si existe
        const contextKeys = ['conversationId', 'functionName', 'intent', 'phoneNumber'];
        const context = contextKeys
          .filter(key => meta[key])
          .map(key => `${key}=${meta[key]}`)
          .join(' ');
          
        if (context) {
          logMessage += ` {${context}}`;
        }
        
        // Agregar error si existe
        if (meta.error) {
          const error = meta.error as any;
          logMessage += `\n  Error: ${error.message || error}`;
          if (error.stack && isDevelopment) {
            logMessage += `\n  Stack: ${error.stack}`;
          }
        }
        
        return logMessage;
      })
    );

    // Configurar transportes
    const transports: winston.transport[] = [
      // Consola
      new winston.transports.Console({
        level: logLevel,
        format: isDevelopment ? consoleFormat : customFormat,
        handleExceptions: true,
        handleRejections: true
      }),
      
      // Archivo de logs generales
      new winston.transports.File({
        filename: 'logs/combined.log',
        level: 'info',
        format: customFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5
      }),
      
      // Archivo de errores
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: customFormat,
        maxsize: 25 * 1024 * 1024, // 25MB
        maxFiles: 3
      }),
      
      // Archivo de logs de aplicación
      new winston.transports.File({
        filename: 'logs/application.log',
        level: 'debug',
        format: customFormat,
        maxsize: 100 * 1024 * 1024, // 100MB
        maxFiles: 10
      })
    ];

    // En producción, agregar transporte para servicios de logging externos
    if (!isDevelopment) {
      // TODO: Agregar integración con LogDNA, Datadog, etc.
    }

    this.winston = winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false,
      silent: false
    });

    // Manejar excepciones no capturadas
    this.winston.exceptions.handle(
      new winston.transports.File({ 
        filename: 'logs/exceptions.log',
        format: customFormat
      })
    );

    // Manejar promesas rechazadas
    this.winston.rejections.handle(
      new winston.transports.File({ 
        filename: 'logs/rejections.log',
        format: customFormat
      })
    );

    console.log(`[Logger] ✅ Sistema de logging inicializado (nivel: ${logLevel})`);
  }

  /**
   * Inicializa métricas del sistema
   */
  private initializeMetrics(): void {
    this.metrics = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: 0,
      requestCount: 0,
      errorCount: 0,
      responseTime: 0
    };
  }

  /**
   * Configura métricas periódicas
   */
  private setupPeriodicMetrics(): void {
    // Actualizar métricas cada 30 segundos (SIN LOG para reducir ruido)
    setInterval(() => {
      this.updateSystemMetrics();
      // this.logSystemMetrics(); // DESHABILITADO: logs muy verbosos que saturan los logs importantes
    }, 30000);

    // Limpiar estadísticas cada hora
    setInterval(() => {
      this.resetCounters();
    }, 3600000);
  }

  /**
   * Actualiza métricas del sistema
   */
  private updateSystemMetrics(): void {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.uptime = process.uptime();
    this.metrics.requestCount = this.requestCounter;
    this.metrics.errorCount = this.errorCounter;
    
    if (this.responseTimes.length > 0) {
      this.metrics.responseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }
  }

  /**
   * Registra métricas del sistema
   */
  private logSystemMetrics(): void {
    this.winston.info('System metrics', {
      service: 'system',
      metrics: {
        memory: {
          rss: Math.round(this.metrics.memoryUsage.rss / 1024 / 1024),
          heapUsed: Math.round(this.metrics.memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(this.metrics.memoryUsage.heapTotal / 1024 / 1024)
        },
        uptime: Math.round(this.metrics.uptime),
        requests: this.metrics.requestCount,
        errors: this.metrics.errorCount,
        avgResponseTime: Math.round(this.metrics.responseTime)
      }
    });
  }

  /**
   * Resetea contadores
   */
  private resetCounters(): void {
    this.requestCounter = 0;
    this.errorCounter = 0;
    this.responseTimes = [];
  }

  /**
   * MÉTODOS DE LOGGING PÚBLICOS
   */

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, {
      service: 'whatsapp-llm',
      ...context
    });
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, {
      service: 'whatsapp-llm',
      ...context
    });
    this.requestCounter++;
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, {
      service: 'whatsapp-llm',
      ...context
    });
  }

  error(message: string, error?: any, context?: LogContext): void {
    this.winston.error(message, {
      service: 'whatsapp-llm',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      ...context
    });
    this.errorCounter++;
  }

  /**
   * MÉTODOS ESPECIALIZADOS
   */

  logConversationStart(conversationId: string, phoneNumber: string, pointOfSaleId: string): void {
    this.info('Conversation started', {
      conversationId,
      phoneNumber: this.maskPhoneNumber(phoneNumber),
      pointOfSaleId
    });
  }

  logConversationEnd(conversationId: string, outcome: string, duration: number): void {
    this.info('Conversation ended', {
      conversationId,
      outcome,
      duration,
      responseTime: duration
    });
    this.responseTimes.push(duration);
  }

  logFunctionCall(functionName: string, success: boolean, duration: number, context?: LogContext): void {
    const message = `Function ${functionName} ${success ? 'completed' : 'failed'}`;
    
    if (success) {
      this.info(message, {
        functionName,
        responseTime: duration,
        ...context
      });
    } else {
      this.error(message, undefined, {
        functionName,
        responseTime: duration,
        ...context
      });
    }
    
    this.responseTimes.push(duration);
  }

  logLLMRequest(model: string, tokens: number, duration: number, context?: LogContext): void {
    this.info('LLM request completed', {
      model,
      tokens,
      responseTime: duration,
      ...context
    });
    this.responseTimes.push(duration);
  }

  logSOAPRequest(endpoint: string, success: boolean, duration: number, context?: LogContext): void {
    const message = `SOAP request to ${endpoint} ${success ? 'completed' : 'failed'}`;
    
    if (success) {
      this.info(message, {
        endpoint,
        responseTime: duration,
        ...context
      });
    } else {
      this.error(message, undefined, {
        endpoint,
        responseTime: duration,
        ...context
      });
    }
    
    this.responseTimes.push(duration);
  }

  logDatabaseOperation(operation: string, table: string, success: boolean, duration: number, context?: LogContext): void {
    const message = `Database ${operation} on ${table} ${success ? 'completed' : 'failed'}`;
    
    if (success) {
      this.debug(message, {
        operation,
        table,
        responseTime: duration,
        ...context
      });
    } else {
      this.error(message, undefined, {
        operation,
        table,
        responseTime: duration,
        ...context
      });
    }
  }

  logSecurityEvent(event: string, phoneNumber?: string, details?: any): void {
    this.warn(`Security event: ${event}`, {
      phoneNumber: phoneNumber ? this.maskPhoneNumber(phoneNumber) : undefined,
      securityEvent: event,
      details
    });
  }

  logPerformanceWarning(operation: string, duration: number, threshold: number, context?: LogContext): void {
    this.warn(`Performance warning: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
      operation,
      responseTime: duration,
      threshold,
      ...context
    });
  }

  /**
   * UTILIDADES
   */

  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return phoneNumber;
    return phoneNumber.slice(0, 2) + '*'.repeat(phoneNumber.length - 4) + phoneNumber.slice(-2);
  }

  /**
   * Middleware para Express
   */
  createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const duration = Date.now() - start;
        
        logger.info(`${req.method} ${req.originalUrl}`, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime: duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Obtiene métricas actuales
   */
  getMetrics(): SystemMetrics {
    this.updateSystemMetrics();
    return { ...this.metrics };
  }

  /**
   * Obtiene estadísticas de logs
   */
  getLogStats(): any {
    return {
      requestCount: this.requestCounter,
      errorCount: this.errorCounter,
      errorRate: this.requestCounter > 0 ? (this.errorCounter / this.requestCounter) * 100 : 0,
      averageResponseTime: this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0,
      recentResponseTimes: this.responseTimes.slice(-10)
    };
  }

  /**
   * Flush logs (útil antes de shutdown)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }
}

// Exportar instancia singleton
export const logger = new Logger();

// Exportar métodos directos para conveniencia
export const { debug, info, warn, error } = logger; 