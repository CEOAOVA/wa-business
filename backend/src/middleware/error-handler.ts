/**
 * Middleware de manejo global de errores
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Tipos de errores personalizados
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    if (errors) {
      (this as any).errors = errors;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto con el estado actual') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    if (retryAfter) {
      (this as any).retryAfter = retryAfter;
    }
  }
}

/**
 * Middleware de manejo global de errores
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si la respuesta ya fue enviada, delegar a Express
  if (res.headersSent) {
    return next(err);
  }

  // Determinar si es un error operacional
  const isOperational = (err as AppError).isOperational || false;
  const statusCode = (err as AppError).statusCode || 500;
  const code = (err as AppError).code || 'INTERNAL_ERROR';
  
  // Log del error
  const errorInfo = {
    message: err.message,
    code,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    requestId: (req as any).requestId
  };

  if (!isOperational || statusCode >= 500) {
    logger.error('Unhandled error', errorInfo);
  } else {
    logger.warn('Operational error', errorInfo);
  }

  // Preparar respuesta
  const response: any = {
    success: false,
    message: err.message || 'Error interno del servidor',
    code
  };

  // Incluir información adicional según el tipo de error
  if ((err as any).errors) {
    response.errors = (err as any).errors;
  }

  if ((err as any).retryAfter) {
    response.retryAfter = (err as any).retryAfter;
    res.set('Retry-After', (err as any).retryAfter.toString());
  }

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development' && !isOperational) {
    response.stack = err.stack;
  }

  // Enviar respuesta
  res.status(statusCode).json(response);
};

/**
 * Middleware para capturar errores asíncronos
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: error.message,
    code: error.code
  });
};