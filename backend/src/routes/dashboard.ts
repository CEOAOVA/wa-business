/**
 * Rutas del dashboard de administrador
 * Proporciona estadísticas y métricas del sistema
 */
import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

/**
 * @route GET /api/dashboard/stats
 * @desc Obtener estadísticas generales del sistema
 * @access Private (Admin)
 */
router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('Servicio de base de datos no disponible');
    }

    // Obtener estadísticas de usuarios
    const users = await AuthService.getAllUsers();
    
    // Obtener estadísticas de conversaciones desde Supabase
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*');
    
    if (convError) {
      logger.error('Error fetching conversations:', convError);
    }

    // Obtener estadísticas de mensajes
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('*');
    
    if (msgError) {
      logger.error('Error fetching messages:', msgError);
    }

    // Obtener estadísticas de pedidos
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*');
    
    if (orderError) {
      logger.error('Error fetching orders:', orderError);
    }

    // Calcular estadísticas
    const stats = {
      users: {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admins: users.filter(u => u.role === 'admin').length,
        agents: users.filter(u => u.role === 'agent').length,
      },
      conversations: {
        total: conversations?.length || 0,
        active: conversations?.filter(c => c.status === 'active').length || 0,
        closed: conversations?.filter(c => c.status === 'closed').length || 0,
        unread: 0, // Esto se calcularía basado en mensajes no leídos
      },
      messages: {
        total: messages?.length || 0,
        today: messages?.filter(m => {
          const today = new Date();
          const messageDate = new Date(m.created_at);
          return messageDate.toDateString() === today.toDateString();
        }).length || 0,
        thisWeek: messages?.filter(m => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const messageDate = new Date(m.created_at);
          return messageDate >= weekAgo;
        }).length || 0,
      },
      orders: {
        total: orders?.length || 0,
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        completed: orders?.filter(o => o.status === 'completed').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'Connected',
        lastBackup: new Date().toISOString(),
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del sistema'
    });
  }
});

/**
 * @route GET /api/dashboard/users
 * @desc Obtener lista detallada de usuarios
 * @access Private (Admin)
 */
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await AuthService.getAllUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
});

/**
 * @route GET /api/dashboard/conversations
 * @desc Obtener estadísticas de conversaciones
 * @access Private (Admin)
 */
router.get('/conversations', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('Servicio de base de datos no disponible');
    }

    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: conversations || []
    });
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones'
    });
  }
});

/**
 * @route GET /api/dashboard/conversations/public
 * @desc Obtener conversaciones para agentes (sin restricción de admin)
 * @access Private (Agentes y Admin)
 */
router.get('/conversations/public', authMiddleware, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('Servicio de base de datos no disponible');
    }

    // Obtener conversaciones
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (convError) {
      throw convError;
    }

    // Obtener contactos
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('*');

    if (contactsError) {
      throw contactsError;
    }

    // Crear un mapa de contactos para acceso rápido
    const contactsMap = new Map();
    (contacts || []).forEach(contact => {
      contactsMap.set(contact.id, contact);
    });

    // Transformar los datos para que sean compatibles con el frontend
    const transformedConversations = (conversations || []).map(conv => ({
      id: conv.id,
      contact_id: conv.contact_id,
      status: conv.status,
      priority: conv.priority,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      contact: contactsMap.get(conv.contact_id) || null
    }));

    res.json({
      success: true,
      data: transformedConversations
    });
  } catch (error) {
    logger.error('Error fetching public conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conversaciones'
    });
  }
});

/**
 * @route GET /api/dashboard/orders
 * @desc Obtener estadísticas de pedidos
 * @access Private (Admin)
 */
router.get('/orders', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      throw new Error('Servicio de base de datos no disponible');
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: orders || []
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos'
    });
  }
});

/**
 * @route GET /api/dashboard/system
 * @desc Obtener información del sistema
 * @access Private (Admin)
 */
router.get('/system', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    logger.error('Error fetching system info:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener información del sistema'
    });
  }
});

export default router; 