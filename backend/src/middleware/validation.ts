/**
 * Middleware de validación de requests
 */
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware para ejecutar validaciones y manejar errores
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ejecutar todas las validaciones
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Log de errores de validación
    logger.warn('Validation errors', {
      path: req.path,
      method: req.method,
      errors: errors.array()
    });

    // Formatear errores para respuesta
    const formattedErrors = errors.array().reduce((acc: any, error: any) => {
      const field = error.path || error.param;
      if (!acc[field]) {
        acc[field] = [];
      }
      acc[field].push(error.msg);
      return acc;
    }, {});

    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors
    });
  };
};
