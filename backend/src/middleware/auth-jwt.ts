/**
 * Middleware de autenticación con JWT manual
 * Valida tokens generados por nuestro sistema, no por Supabase Auth
 */
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import * as jwt from 'jsonwebtoken';

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
 * Middleware de autenticación con JWT manual
 * Valida tokens generados por nuestro sistema, no por Supabase Auth
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 [AuthMiddleware] Iniciando verificación de autenticación (JWT manual)');
    console.log('🔐 [AuthMiddleware] Ruta:', req.path);
    console.log('🔐 [AuthMiddleware] Método:', req.method);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AuthMiddleware] No se encontró header Authorization válido');
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer ' del token
    console.log('🔐 [AuthMiddleware] Token extraído:', token.substring(0, 20) + '...');

    // Verificar token usando TokenService
    const decoded = TokenService.verifyAccessToken(token);
    
    if (!decoded) {
      console.warn('❌ [AuthMiddleware] Token inválido o expirado');
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    console.log('✅ [AuthMiddleware] Token JWT válido, datos decodificados:', {
      sub: decoded.sub,
      username: decoded.username,
      role: decoded.role
    });

    // Obtener perfil del usuario desde la base de datos
    const userProfile = await AuthService.getUserById(decoded.sub);
    
    if (!userProfile) {
      console.warn('❌ [AuthMiddleware] Perfil de usuario no encontrado', { userId: decoded.sub });
      return res.status(401).json({
        success: false,
        message: 'Perfil de usuario no encontrado'
      });
    }

    console.log('✅ [AuthMiddleware] Perfil de usuario obtenido:', {
      userId: userProfile.id,
      username: userProfile.username,
      role: userProfile.role,
      isActive: userProfile.is_active
    });

    // Verificar si el usuario está activo
    if (!userProfile.is_active) {
      console.warn('❌ [AuthMiddleware] Usuario inactivo intentando acceder', { userId: userProfile.id });
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    // Adjuntar usuario al request para usar en las rutas
    (req as any).user = userProfile;

    console.log('✅ [AuthMiddleware] Autenticación exitosa, continuando...');
    next();
  } catch (error) {
    console.error('❌ [AuthMiddleware] Error general en middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware que requiere rol de administrador
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
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }

  next();
};

/**
 * Middleware de autenticación opcional
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No hay token, pero es opcional, continuar sin usuario
      return next();
    }

    const token = authHeader.substring(7);
    
    // Verificar token usando TokenService
    const decoded = TokenService.verifyAccessToken(token);
    
    if (decoded) {
      const userProfile = await AuthService.getUserById(decoded.sub);
      
      if (userProfile && userProfile.is_active) {
        (req as any).user = userProfile;
        (req as any).isAuthenticated = true;
      }
    } else {
      // Token inválido, pero es opcional, continuar sin usuario
      console.log('Token opcional inválido, continuando sin autenticación');
    }

    next();
  } catch (error) {
    // Error en el middleware opcional, continuar sin usuario
    next();
  }
};