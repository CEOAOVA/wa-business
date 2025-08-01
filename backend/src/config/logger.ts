import winston from 'winston';
import path from 'path';

// Determinar nivel de log basado en ambiente
const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs');

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport con colores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    // Error log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    }),
    // Combined log file
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],
  // No exit on error
  exitOnError: false
});

// Helper methods para logging estructurado
export const logHelper = {
  // Log de inicio de aplicación
  appStart: (port: number) => {
    logger.info('🚀 Aplicación iniciada', { port, environment: process.env.NODE_ENV });
  },

  // Log de conexiones WebSocket
  socketConnection: (socketId: string) => {
    logger.debug('🌐 Cliente conectado', { socketId });
  },

  // Log de desconexiones WebSocket
  socketDisconnection: (socketId: string, reason: string) => {
    logger.debug('❌ Cliente desconectado', { socketId, reason });
  },

  // Log de mensajes WhatsApp
  whatsappMessage: (direction: 'incoming' | 'outgoing', phone: string, messageType: string) => {
    logger.info(`📱 Mensaje WhatsApp ${direction}`, { phone, messageType });
  },

  // Log de errores de API
  apiError: (endpoint: string, error: any) => {
    logger.error('❌ Error de API', { endpoint, error: error.message, stack: error.stack });
  },

  // Log de performance
  performance: (operation: string, duration: number) => {
    if (duration > 1000) {
      logger.warn('⚠️ Operación lenta detectada', { operation, duration: `${duration}ms` });
    } else {
      logger.debug('⚡ Operación completada', { operation, duration: `${duration}ms` });
    }
  },

  // Log de limpieza de memoria
  memoryCleanup: (type: string, count: number) => {
    logger.info('🧹 Limpieza de memoria', { type, count });
  }
};

// Configurar para desarrollo
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger; 