"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rutas del dashboard de administrador
 * Proporciona estadísticas y métricas del sistema
 */
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
const supabase_1 = require("../config/supabase");
const router = (0, express_1.Router)();
/**
 * @route GET /api/dashboard/stats
 * @desc Obtener estadísticas generales del sistema
 * @access Private (Admin)
 */
router.get('/stats', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!supabase_1.supabaseAdmin) {
            throw new Error('Servicio de base de datos no disponible');
        }
        // Obtener estadísticas de usuarios
        const users = yield auth_service_1.AuthService.getAllUsers();
        // Obtener estadísticas de conversaciones desde Supabase
        const { data: conversations, error: convError } = yield supabase_1.supabaseAdmin
            .from('conversations')
            .select('*');
        if (convError) {
            logger_1.logger.error('Error fetching conversations:', convError);
        }
        // Obtener estadísticas de mensajes
        const { data: messages, error: msgError } = yield supabase_1.supabaseAdmin
            .from('messages')
            .select('*');
        if (msgError) {
            logger_1.logger.error('Error fetching messages:', msgError);
        }
        // Obtener estadísticas de pedidos
        const { data: orders, error: orderError } = yield supabase_1.supabaseAdmin
            .from('orders')
            .select('*');
        if (orderError) {
            logger_1.logger.error('Error fetching orders:', orderError);
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
                total: (conversations === null || conversations === void 0 ? void 0 : conversations.length) || 0,
                active: (conversations === null || conversations === void 0 ? void 0 : conversations.filter(c => c.status === 'active').length) || 0,
                closed: (conversations === null || conversations === void 0 ? void 0 : conversations.filter(c => c.status === 'closed').length) || 0,
                unread: 0, // Esto se calcularía basado en mensajes no leídos
            },
            messages: {
                total: (messages === null || messages === void 0 ? void 0 : messages.length) || 0,
                today: (messages === null || messages === void 0 ? void 0 : messages.filter(m => {
                    const today = new Date();
                    const messageDate = new Date(m.created_at);
                    return messageDate.toDateString() === today.toDateString();
                }).length) || 0,
                thisWeek: (messages === null || messages === void 0 ? void 0 : messages.filter(m => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const messageDate = new Date(m.created_at);
                    return messageDate >= weekAgo;
                }).length) || 0,
            },
            orders: {
                total: (orders === null || orders === void 0 ? void 0 : orders.length) || 0,
                pending: (orders === null || orders === void 0 ? void 0 : orders.filter(o => o.status === 'pending').length) || 0,
                completed: (orders === null || orders === void 0 ? void 0 : orders.filter(o => o.status === 'completed').length) || 0,
                cancelled: (orders === null || orders === void 0 ? void 0 : orders.filter(o => o.status === 'cancelled').length) || 0,
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del sistema'
        });
    }
}));
/**
 * @route GET /api/dashboard/users
 * @desc Obtener lista detallada de usuarios
 * @access Private (Admin)
 */
router.get('/users', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield auth_service_1.AuthService.getAllUsers();
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
}));
/**
 * @route GET /api/dashboard/conversations
 * @desc Obtener estadísticas de conversaciones
 * @access Private (Admin)
 */
router.get('/conversations', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!supabase_1.supabaseAdmin) {
            throw new Error('Servicio de base de datos no disponible');
        }
        const { data: conversations, error } = yield supabase_1.supabaseAdmin
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener conversaciones'
        });
    }
}));
/**
 * @route GET /api/dashboard/conversations/public
 * @desc Obtener conversaciones para agentes (sin restricción de admin)
 * @access Private (Agentes y Admin)
 */
router.get('/conversations/public', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!supabase_1.supabaseAdmin) {
            throw new Error('Servicio de base de datos no disponible');
        }
        // Obtener conversaciones únicas por número de teléfono
        console.log('🔍 [Dashboard] Consultando tabla conversations...');
        const { data: conversations, error: convError } = yield supabase_1.supabaseAdmin
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false })
            .order('created_at', { ascending: false });
        if (convError) {
            console.error('❌ [Dashboard] Error consultando conversaciones:', convError);
            throw convError;
        }
        console.log('🔍 [Dashboard] Conversaciones encontradas:', (conversations === null || conversations === void 0 ? void 0 : conversations.length) || 0);
        if (conversations && conversations.length > 0) {
            console.log('🔍 [Dashboard] Primera conversación:', conversations[0]);
        }
        // Transformar los datos para que sean compatibles con el frontend
        const transformedConversations = (conversations || []).map(conv => {
            const transformed = {
                id: conv.id,
                contact_phone: conv.contact_phone,
                status: conv.status,
                ai_mode: conv.ai_mode,
                takeover_mode: conv.takeover_mode || 'spectator', // Agregar takeover_mode con valor por defecto
                assigned_agent_id: conv.assigned_agent_id,
                unread_count: conv.unread_count,
                last_message_at: conv.last_message_at,
                created_at: conv.created_at,
                updated_at: conv.updated_at,
                contact: {
                    id: conv.contact_phone, // Usar el número como ID
                    name: conv.contact_phone, // Usar el número como nombre
                    phone: conv.contact_phone
                }
            };
            console.log('🔍 [Dashboard] Conversación transformada:', transformed);
            return transformed;
        });
        console.log('🔍 [Dashboard] Enviando respuesta con', transformedConversations.length, 'conversaciones');
        res.json({
            success: true,
            data: transformedConversations
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching public conversations:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener conversaciones'
        });
    }
}));
/**
 * @route GET /api/dashboard/orders
 * @desc Obtener estadísticas de pedidos
 * @access Private (Admin)
 */
router.get('/orders', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!supabase_1.supabaseAdmin) {
            throw new Error('Servicio de base de datos no disponible');
        }
        const { data: orders, error } = yield supabase_1.supabaseAdmin
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pedidos'
        });
    }
}));
/**
 * @route GET /api/dashboard/system
 * @desc Obtener información del sistema
 * @access Private (Admin)
 */
router.get('/system', auth_1.authMiddleware, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        logger_1.logger.error('Error fetching system info:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información del sistema'
        });
    }
}));
exports.default = router;
