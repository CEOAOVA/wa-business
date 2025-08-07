/**
 * Middleware de autenticación unificado
 * Consolida la autenticación JWT y Supabase en un solo middleware eficiente
 */
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { logger } from '../utils/logger';

// Cache de perfiles de usuario para reducir consultas a BD
const userProfileCache = new Map<string, { profile: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Limpiar caché de usuarios expirados
 */
function cleanupUserCache() {
  const now = Date.now();
  for (const [userId, cached] of userProfileCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      userProfileCache.delete(userId);
    }
  }
}

// Limpiar caché cada 10 minutos
setInterval(cleanupUserCache, 10 * 60 * 1000);

/**
 * Obtener perfil de usuario con caché
 */
async function getUserProfileCached(userId: string) {
  const cached = userProfileCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    logger.debug(`User profile served from cache: ${userId}`);
    return cached.profile;
  }
  
  const profile = await AuthService.getUserById(userId);
  
  if (profile) {
    userProfileCache.set(userId, { profile, timestamp: now });
  }
  
  return profile;
}

/**
 * Middleware de autenticación principal
 * Verifica y valida tokens de acceso
 */
export const authenticate = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const startTime = Date.now();
  
  try {
    // Extraer token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('No authorization header found');
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);
    
    // Verificar token usando TokenService
    const decoded = TokenService.verifyAccessToken(token);
    
    if (!decoded) {
      logger.debug('Invalid or expired token');
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'TOKEN_INVALID'
      });
    }

    // Obtener perfil del usuario (con caché)
    const userProfile = await getUserProfileCached(decoded.sub);
    
    if (!userProfile) {
      logger.warn(`User profile not found for ID: ${decoded.sub}`);
      userProfileCache.delete(decoded.sub); // Limpiar caché inválido
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el usuario está activo
    if (!userProfile.is_active) {
      logger.warn(`Inactive user attempted access: ${userProfile.username}`);
      userProfileCache.delete(decoded.sub); // Limpiar caché
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Adjuntar usuario al request
    req.user = userProfile;
    req.isAuthenticated = true;

    // Log de performance en desarrollo
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - startTime;
      logger.debug(`Auth middleware completed in ${duration}ms for user: ${userProfile.username}`);
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware de autenticación opcional
 * No bloquea si no hay token, pero adjunta usuario si es válido
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, continuar sin autenticación
      req.isAuthenticated = false;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = TokenService.verifyAccessToken(token);
    
    if (decoded) {
      const userProfile = await getUserProfileCached(decoded.sub);
      
      if (userProfile && userProfile.is_active) {
        req.user = userProfile;
        req.isAuthenticated = true;
      } else {
        req.isAuthenticated = false;
      }
    } else {
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    // En caso de error, continuar sin autenticación
    logger.debug('Optional auth error, continuing without auth:', error);
    req.isAuthenticated = false;
    next();
  }
};

/**
 * Middleware que requiere rol específico
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.username} with role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Permisos insuficientes.',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Middleware que requiere rol de administrador
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware que requiere rol de supervisor o superior
 */
export const requireSupervisor = requireRole('admin', 'supervisor');

/**
 * Middleware para verificar permisos específicos
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasPermission = await AuthService.hasPermission(
      req.user.id,
      resource,
      action
    );

    if (!hasPermission) {
      logger.warn(`Permission denied for user ${req.user.username}: ${resource}.${action}`);
      return res.status(403).json({
        success: false,
        message: 'Permiso denegado para esta acción',
        code: 'PERMISSION_DENIED'
      });
    }

    next();
  };
};

/**
 * Invalidar caché de un usuario específico
 */
export function invalidateUserCache(userId: string) {
  userProfileCache.delete(userId);
  logger.debug(`User cache invalidated for: ${userId}`);
}

/**
 * Limpiar todo el caché de usuarios
 */
export function clearUserCache() {
  userProfileCache.clear();
  logger.info('User profile cache cleared');
}

// Alias para compatibilidad con código existente
export const authMiddleware = authenticate;
