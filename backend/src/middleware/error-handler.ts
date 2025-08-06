import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Middleware global para manejo de errores
 * Captura todos los errores no manejados y envía respuestas apropiadas
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log del error completo para debugging
  logger.error('Error Handler Triggered:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Determinar el tipo de error y responder apropiadamente
  
  // Errores de Supabase
  if (err.message?.includes('Supabase Error')) {
    const supabaseErrorMatch = err.message.match(/Code: (\w+)/);
    const errorCode = supabaseErrorMatch ? supabaseErrorMatch[1] : 'UNKNOWN';
    
    // Mapear códigos de error de Supabase a mensajes amigables
    let userMessage = 'Error al acceder a la base de datos';
    let statusCode = 500;
    
    switch (errorCode) {
      case 'PGRST116': // No rows found
        userMessage = 'Registro no encontrado';
        statusCode = 404;
        break;
      case '23505': // Unique constraint violation
        userMessage = 'El registro ya existe';
        statusCode = 409;
        break;
      case '23503': // Foreign key violation
        userMessage = 'Referencia a registro inválida';
        statusCode = 400;
        break;
      case '42501': // Insufficient privilege
        userMessage = 'Sin permisos para realizar esta operación';
        statusCode = 403;
        break;
      case 'PGRST301': // JWT expired
        userMessage = 'Sesión expirada, por favor inicie sesión nuevamente';
        statusCode = 401;
        break;
      default:
        if (err.message.includes('RLS')) {
          userMessage = 'Acceso denegado por políticas de seguridad';
          statusCode = 403;
        }
    }
    
    return res.status(statusCode).json({
      success: false,
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: `SUPABASE_${errorCode}`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Errores de WhatsApp API
  if (err.message?.includes('WhatsApp') || err.message?.includes('webhook')) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de WhatsApp temporalmente no disponible',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: 'WHATSAPP_ERROR',
      timestamp: new Date().toISOString()
    });
  }
  
  // Errores de validación
  if (err.message?.includes('validation') || err.message?.includes('required')) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: err.message,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
  
  // Errores de autenticación
  if (err.message?.includes('auth') || err.message?.includes('token')) {
    return res.status(401).json({
      success: false,
      error: 'Error de autenticación',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
  
  // Error genérico
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Error interno del servidor' : err.message,
    details: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : undefined,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware para capturar errores asíncronos
 * Envuelve funciones asíncronas para capturar rechazos de promesas
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('404 - Ruta no encontrada:', {
    path: req.path,
    method: req.method
  });
  
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
};