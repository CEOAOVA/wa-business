/**
 * Middleware de autenticación simplificado para WhatsApp Business Platform
 * Sistema de autenticación flexible con opciones para diferentes niveles de seguridad
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
      isAuthenticated?: boolean;
    }
  }
}

/**
 * Middleware de autenticación simplificado con Supabase
 * Menos restrictivo y más eficiente
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

    // Verificar token con Supabase de forma más simple
    if (!supabase) {
      logger.warn('Supabase client no disponible');
      return res.status(500).json({
        success: false,
        message: 'Servicio de autenticación no disponible'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Token inválido o expirado', { error: error?.message || 'No user data' });
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Obtener perfil del usuario de forma más eficiente
    try {
      const userProfile = await AuthService.getUserById(user.id);
      
      if (!userProfile) {
        logger.warn('Perfil de usuario no encontrado', { userId: user.id });
        return res.status(401).json({
          success: false,
          message: 'Perfil de usuario no encontrado'
        });
      }

      // Verificación más flexible de estado activo
      if (!userProfile.is_active) {
        logger.warn('Usuario inactivo intentando acceder', { userId: userProfile.id });
        return res.status(401).json({
          success: false,
          message: 'Cuenta de usuario desactivada'
        });
      }

      // Agregar usuario a la request
      req.user = userProfile;
      req.isAuthenticated = true;
      next();
    } catch (profileError) {
      logger.error('Error obteniendo perfil de usuario:', profileError);
      return res.status(401).json({
        success: false,
        message: 'Error al verificar perfil de usuario'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};

/**
 * Middleware de autenticación opcional (no falla si no hay token)
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.isAuthenticated = false;
      return next(); // Continuar sin usuario
    }

    const token = authHeader.substring(7);

    if (!supabase) {
      req.isAuthenticated = false;
      return next(); // Continuar sin usuario
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      try {
        const userProfile = await AuthService.getUserById(user.id);
        if (userProfile && userProfile.is_active) {
          req.user = userProfile;
          req.isAuthenticated = true;
        } else {
          req.isAuthenticated = false;
        }
             } catch (profileError) {
         logger.warn('Error obteniendo perfil en auth opcional', { error: profileError instanceof Error ? profileError.message : 'Unknown error' });
         req.isAuthenticated = false;
       }
    } else {
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    req.isAuthenticated = false;
    next(); // Continuar sin usuario en caso de error
  }
};

/**
 * Middleware de autenticación temporal (para operaciones de corta duración)
 * Permite acceso temporal sin verificar estado completo del usuario
 */
export const tempAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.substring(7);

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

    // Para autenticación temporal, solo verificamos que el token sea válido
    // No verificamos el estado completo del usuario en la base de datos
    req.user = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
      full_name: user.user_metadata?.full_name || user.email || 'Usuario',
      email: user.email || '',
      role: user.user_metadata?.role || 'agent',
      is_active: true
    };
    req.isAuthenticated = true;
    next();
  } catch (error) {
    logger.error('Temp auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación temporal'
    });
  }
};

/**
 * Middleware para verificar permisos específicos (simplificado)
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
 * Middleware para verificar rol de administrador (simplificado)
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
 * Middleware para verificar rol de agente, supervisor o admin (simplificado)
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
 * Middleware para verificar si el usuario está autenticado (sin verificar permisos)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  next();
}; 