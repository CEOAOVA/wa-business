/**
 * Rutas de autenticación para WhatsApp Business Platform
 * Sistema de acceso restringido solo para usuarios pre-autorizados
 */
import express from 'express';
import { loginHandler, getUserInfo, authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/auth/login
 * Endpoint de login para usuarios autorizados
 */
router.post('/login', loginHandler);

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 * Requiere autenticación
 */
router.get('/me', authMiddleware, getUserInfo);

/**
 * POST /api/auth/validate
 * Validar token JWT
 * Requiere autenticación
 */
router.post('/validate', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token válido',
    data: {
      valid: true,
      user: (req as any).user
    }
  });
});

/**
 * GET /api/auth/status
 * Estado del sistema de autenticación
 */
router.get('/status', (req, res) => {
  const authorizedUsers = process.env.AUTHORIZED_USERS;
  const jwtSecret = process.env.JWT_SECRET;
  
  res.json({
    success: true,
    data: {
      authSystemActive: true,
      restrictedAccess: true,
      authorizedUsersConfigured: !!authorizedUsers,
      jwtConfigured: !!jwtSecret,
      usersCount: authorizedUsers ? authorizedUsers.split(',').length : 0
    }
  });
});

export default router; 