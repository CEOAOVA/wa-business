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
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const chatbot_service_1 = require("../services/chatbot.service");
const product_service_1 = require("../services/product.service");
const router = (0, express_1.Router)();
/**
 * GET /api/dashboard/stats
 * Obtener estadísticas generales del sistema
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[Dashboard] Obteniendo estadísticas generales...');
        // Obtener estadísticas del chatbot
        const chatbotStats = yield database_service_1.databaseService.getChatbotStats();
        // Obtener estadísticas del chatbot en memoria
        const memoryStats = chatbot_service_1.chatbotService.getStats();
        // Combinar estadísticas
        const stats = {
            conversations: {
                total: chatbotStats.totalConversations,
                active: chatbotStats.activeConversations,
                inMemory: memoryStats.activeConversations
            },
            messages: {
                total: chatbotStats.totalMessages,
                averagePerConversation: chatbotStats.totalConversations > 0
                    ? Math.round(chatbotStats.totalMessages / chatbotStats.totalConversations)
                    : 0
            },
            orders: {
                total: chatbotStats.totalOrders,
                pending: chatbotStats.totalOrders // Placeholder - en el futuro se puede filtrar por status
            },
            system: {
                supabaseEnabled: process.env.USE_SUPABASE === 'true',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }
        };
        console.log('[Dashboard] Estadísticas obtenidas exitosamente');
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[Dashboard] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
/**
 * GET /api/dashboard/conversations
 * Obtener lista de conversaciones recientes
 */
router.get('/conversations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        console.log(`[Dashboard] Obteniendo conversaciones (limit: ${limit}, offset: ${offset})`);
        // Obtener conversaciones desde la base de datos
        const conversations = yield database_service_1.databaseService.getConversations(limit, offset);
        // Obtener conversaciones en memoria del chatbot (simuladas)
        const memoryConversations = [];
        res.json({
            success: true,
            data: {
                database: conversations,
                memory: memoryConversations.slice(offset, offset + limit),
                pagination: {
                    limit,
                    offset,
                    total: conversations.length
                }
            }
        });
    }
    catch (error) {
        console.error('[Dashboard] Error obteniendo conversaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
/**
 * GET /api/dashboard/products/popular
 * Obtener productos más populares o buscados
 */
router.get('/products/popular', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 5;
        console.log(`[Dashboard] Obteniendo productos populares (limit: ${limit})`);
        const popularProducts = yield product_service_1.productService.getPopularProducts(limit);
        res.json({
            success: true,
            data: {
                products: popularProducts,
                count: popularProducts.length
            }
        });
    }
    catch (error) {
        console.error('[Dashboard] Error obteniendo productos populares:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
/**
 * GET /api/dashboard/analytics/summary
 * Obtener resumen de analíticas para el período especificado
 */
router.get('/analytics/summary', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const period = req.query.period || 'today'; // today, week, month
        console.log(`[Dashboard] Obteniendo resumen analítico para: ${period}`);
        // Para esta implementación inicial, retornamos datos simulados
        // En el futuro, esto se calculará basado en datos reales y el período
        const analytics = {
            period,
            metrics: {
                totalInteractions: 47,
                successfulQuotes: 12,
                conversionRate: 25.5, // porcentaje
                averageResponseTime: 2.3, // segundos
                customerSatisfaction: 4.2 // de 5
            },
            trends: {
                interactions: {
                    current: 47,
                    previous: 35,
                    change: +34.3 // porcentaje de cambio
                },
                quotes: {
                    current: 12,
                    previous: 8,
                    change: +50.0
                }
            },
            topProducts: yield product_service_1.productService.getPopularProducts(3),
            busyHours: [
                { hour: '09:00', interactions: 8 },
                { hour: '14:00', interactions: 12 },
                { hour: '16:00', interactions: 15 },
                { hour: '18:00', interactions: 9 }
            ]
        };
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('[Dashboard] Error obteniendo resumen analítico:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
/**
 * GET /api/dashboard/system/health
 * Obtener estado de salud del sistema
 */
router.get('/system/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[Dashboard] Verificando salud del sistema...');
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: {
                    status: 'connected',
                    type: process.env.USE_SUPABASE === 'true' ? 'supabase' : 'sqlite'
                },
                chatbot: {
                    status: 'active',
                    activeConversations: chatbot_service_1.chatbotService.getStats().activeConversations,
                    memoryUsage: process.memoryUsage()
                },
                productService: {
                    status: 'active'
                }
            },
            metrics: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };
        res.json({
            success: true,
            data: health
        });
    }
    catch (error) {
        console.error('[Dashboard] Error verificando salud del sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
/**
 * POST /api/dashboard/test/chatbot
 * Endpoint para probar el chatbot desde el dashboard
 */
router.post('/test/chatbot', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }
        console.log(`[Dashboard] Test del chatbot: ${phoneNumber} -> "${message}"`);
        const result = yield chatbot_service_1.chatbotService.processWhatsAppMessage(phoneNumber, message);
        res.json({
            success: true,
            data: {
                response: result.response,
                shouldSend: result.shouldSend,
                conversationState: result.conversationState ? {
                    status: result.conversationState.status,
                    clientInfo: result.conversationState.clientInfo,
                    messageCount: result.conversationState.messages.length
                } : null,
                error: result.error
            }
        });
    }
    catch (error) {
        console.error('[Dashboard] Error en test del chatbot:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
}));
exports.default = router;
