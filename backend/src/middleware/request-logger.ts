/**
 * Middleware de logging de requests
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Generar ID único para cada request
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware de logging de requests HTTP
 */
export const requestLogger = (req: LoggedRequest, res: Response, next: NextFunction) => {
  // Asignar ID único al request
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  // Skip logging para rutas de salud y WebSocket
  const skipPaths = ['/health', '/api/health', '/socket.io/'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Log de entrada
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    username: req.user?.username
  });

  // Log de salida cuando termine la respuesta
  res.on('finish', () => {
    const duration = Date.now() - req.startTime!;
    
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      username: req.user?.username
    };

    // Usar nivel de log según código de respuesta
    if (res.statusCode >= 500) {
      logger.error('Request completed with error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData);
    } else {
      logger.info('Request completed successfully', logData);
    }
  });

  next();
};

/**
 * Middleware de logging detallado (para debugging)
 */
export const detailedRequestLogger = (req: LoggedRequest, res: Response, next: NextFunction) => {
  req.requestId = generateRequestId();
  req.startTime = Date.now();

  // Log detallado de entrada
  logger.debug('Detailed request info', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
    params: req.params,
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    xhr: req.xhr
  });

  // Interceptar respuesta
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;
    
    const duration = Date.now() - req.startTime!;
    
    logger.debug('Detailed response info', {
      requestId: req.requestId,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      duration: `${duration}ms`,
      responseSize: data ? JSON.stringify(data).length : 0
    });
    
    return res.send(data);
  };

  next();
};
