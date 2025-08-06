/**
 * Rutas de autenticación para WhatsApp Business Platform
 * Sistema de acceso restringido solo para usuarios pre-autorizados
 */
import { Router } from 'express';
import { AuthService, CreateUserData, LoginData } from '../services/auth.service';
import { logger } from '../utils/logger';
import { authMiddleware, requireAdmin, optionalAuth, tempAuth } from '../middleware/auth';
import { sessionCleanupService } from '../services/session-cleanup.service';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Autenticar usuario
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password }: LoginData = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    const result = await AuthService.login({ username, password });
    
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: result.user,
        session: result.session
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error de autenticación'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario (solo admins)
 * @access Private (Admin)
 */
router.post('/register', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userData: CreateUserData = req.body;

    // Validaciones básicas
    if (!userData.email || !userData.password || !userData.username || !userData.full_name) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }

    // Validar contraseña (mínimo 8 caracteres)
    if (userData.password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const newUser = await AuthService.createUser(userData);
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear usuario'
    });
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Obtener perfil del usuario actual
 * @access Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // Obtener usuario desde el middleware de autenticación
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const user = await AuthService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const updates = req.body;
    
    // No permitir actualizar campos sensibles
    delete updates.id;
    delete updates.role;
    delete updates.created_at;
    delete updates.updated_at;

    const updatedUser = await AuthService.updateUserProfile(userId, updates);
    
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al actualizar perfil'
    });
  }
});

/**
 * @route GET /api/auth/users
 * @desc Obtener todos los usuarios (solo admins)
 * @access Private (Admin)
 */
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    const users = await AuthService.getAllUsers();
    
    res.json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión
 * @access Private
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // En Supabase, el logout se maneja en el cliente
    // Aquí solo podemos limpiar la sesión del servidor si es necesario
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión'
    });
  }
});

/**
 * @route POST /api/auth/init-admin
 * @desc Crear usuario admin inicial (solo para setup inicial)
 * @access Public (solo para setup)
 */
router.post('/init-admin', async (req, res) => {
  try {
    // Verificar si ya existe un admin
    const users = await AuthService.getAllUsers();
    const adminExists = users.some(user => user.role === 'admin');
    
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario administrador'
      });
    }

    const admin = await AuthService.createInitialAdmin();
    
    res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      data: {
        user: admin
      }
    });
  } catch (error) {
    logger.error('Init admin error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear administrador inicial'
    });
  }
});

/**
 * @route POST /api/auth/clear-sessions
 * @desc Limpiar todas las sesiones del servidor (solo admins)
 * @access Private (Admin)
 */
router.post('/clear-sessions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    console.log('🧹 Limpieza manual de sesiones iniciada por admin:', currentUser.email);
    
    // Importar y limpiar servicios
    const { rateLimiter } = await import('../services/rate-limiter/rate-limiter');
    const { cacheService } = await import('../services/cache/cache-service');
    
    let cleanedServices = [];
    
    // Limpiar rate limiter
    if (rateLimiter) {
      rateLimiter.destroy();
      cleanedServices.push('rate-limiter');
    }
    
    // Limpiar caché
    if (cacheService) {
      cacheService.destroy();
      cleanedServices.push('cache-service');
    }
    
    // Limpiar conversaciones del chatbot
    try {
      const { ChatbotService } = await import('../services/chatbot.service');
      const chatbotService = new ChatbotService();
      if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
        chatbotService['cleanupExpiredSessions']();
        cleanedServices.push('chatbot-sessions');
      }
    } catch (error) {
      logger.warn('Error limpiando chatbot sessions', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // Limpiar conversaciones generales
    try {
      const { ConversationService } = await import('../services/conversation/conversation-service');
      const conversationService = new ConversationService();
      if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
        const removedCount = conversationService['cleanupInactiveSessions'](0);
        cleanedServices.push(`conversation-sessions (${removedCount} removidas)`);
      }
    } catch (error) {
      logger.warn('Error limpiando conversation sessions', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // Limpiar caché de inventario
    try {
      const { InventoryCache } = await import('../services/soap/inventory-cache');
      const inventoryCache = new InventoryCache();
      if (inventoryCache && typeof inventoryCache.clear === 'function') {
        inventoryCache.clear();
        cleanedServices.push('inventory-cache');
      }
    } catch (error) {
      logger.warn('Error limpiando inventory cache', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    logger.info('Sesiones limpiadas manualmente', {
      userId: currentUser.id,
      metadata: { cleanedServices }
    });
    
    res.json({
      success: true,
      message: 'Sesiones limpiadas exitosamente',
      data: {
        cleanedServices,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Clear sessions error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al limpiar sesiones'
    });
  }
});

/**
 * @route DELETE /api/auth/users/:userId
 * @desc Desactivar usuario (solo admins)
 * @access Private (Admin)
 */
router.delete('/users/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const currentUser = req.user;
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }

    const { userId } = req.params;
    
    // No permitir desactivar el propio usuario admin
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    await AuthService.deactivateUser(userId);
    
    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al desactivar usuario'
    });
  }
});

/**
 * @route GET /api/auth/sessions
 * @desc Obtener información de sesiones activas (solo admins)
 * @access Private (Admin)
 */
router.get('/sessions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const sessions = await sessionCleanupService.getActiveSessions();
    
    res.json({
      success: true,
      data: {
        sessions,
        stats: sessionCleanupService.getServiceStats()
      }
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones'
    });
  }
});

/**
 * @route POST /api/auth/sessions/cleanup
 * @desc Limpiar sesiones expiradas (solo admins)
 * @access Private (Admin)
 */
router.post('/sessions/cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await sessionCleanupService.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: 'Limpieza de sesiones completada',
      data: result
    });
  } catch (error) {
    logger.error('Cleanup sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar sesiones'
    });
  }
});

/**
 * @route POST /api/auth/sessions/force-cleanup
 * @desc Forzar limpieza de todas las sesiones (solo admins)
 * @access Private (Admin)
 */
router.post('/sessions/force-cleanup', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await sessionCleanupService.forceCleanupAllSessions();
    
    res.json({
      success: true,
      message: 'Limpieza forzada de sesiones completada',
      data: result
    });
  } catch (error) {
    logger.error('Force cleanup sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al forzar limpieza de sesiones'
    });
  }
});

/**
 * @route DELETE /api/auth/sessions/:userId
 * @desc Limpiar sesión de un usuario específico (solo admins)
 * @access Private (Admin)
 */
router.delete('/sessions/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const success = await sessionCleanupService.cleanupUserSessions(userId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Sesión de usuario limpiada exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error al limpiar sesión de usuario'
      });
    }
  } catch (error) {
    logger.error('Cleanup user session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar sesión de usuario'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar token de autenticación
 * @access Private
 */
router.post('/refresh', tempAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener perfil completo del usuario
    const userProfile = await AuthService.getUserById(req.user.id);
    
    if (!userProfile || !userProfile.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Actualizar último login
    await AuthService.updateUserProfile(req.user.id, {
      last_login: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        user: userProfile
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al refrescar token'
    });
  }
});

/**
 * @route GET /api/auth/status
 * @desc Verificar estado de autenticación
 * @access Private
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Usuario autenticado',
      data: {
        isAuthenticated: true,
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de autenticación'
    });
  }
});

export default router; 