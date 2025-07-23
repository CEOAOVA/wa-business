/**
 * Middleware de autenticación restringida para WhatsApp Business Platform
 * Solo permite acceso a usuarios pre-autorizados definidos en variables de entorno
 */
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { AuthService } from '../services/auth.service';

// Extender la interfaz Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        full_name: string;
        email: string;
        role: 'admin' | 'agent' | 'supervisor';
        whatsapp_id?: string;
        is_active: boolean;
      };
    }
  }
}

/**
 * Middleware de autenticación con Supabase
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer ' del token

    // Verificar token con Supabase
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Servicio de autenticación no disponible'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Obtener perfil del usuario
    const userProfile = await AuthService.getUserById(user.id);
    
    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'Perfil de usuario no encontrado'
      });
    }

    if (!userProfile.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta de usuario desactivada'
      });
    }

    // Agregar usuario a la request
    req.user = userProfile;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};

/**
 * Middleware para verificar permisos específicos
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const hasPermission = await AuthService.hasPermission(req.user.id, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes'
        });
      }

      next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
};

/**
 * Middleware para verificar rol de administrador
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador'
    });
  }

  next();
};

/**
 * Middleware para verificar rol de agente, supervisor o admin
 */
export const requireAgentOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'agent' && req.user.role !== 'supervisor') {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de agente, supervisor o administrador'
    });
  }

  next();
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continuar sin usuario
    }

    const token = authHeader.substring(7);

    if (!supabase) {
      return next(); // Continuar sin usuario
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const userProfile = await AuthService.getUserById(user.id);
      if (userProfile && userProfile.is_active) {
        req.user = userProfile;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continuar sin usuario en caso de error
  }
}; 