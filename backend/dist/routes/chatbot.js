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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rutas del Chatbot para WhatsApp
 * Endpoints para generar respuestas con IA y enviarlas por WhatsApp
 */
const express_1 = __importDefault(require("express"));
const chatbot_service_1 = require("../services/chatbot.service");
const whatsapp_service_1 = require("../services/whatsapp.service");
const database_service_1 = require("../services/database.service");
const router = express_1.default.Router();
/**
 * POST /api/chatbot/send-message
 * Generar respuesta con IA y enviarla por WhatsApp
 */
router.post('/send-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }
        console.log(`[ChatbotRouter] Procesando mensaje para ${phoneNumber}: ${message.substring(0, 50)}...`);
        // Generar respuesta con IA
        const chatbotResponse = yield chatbot_service_1.chatbotService.processWhatsAppMessage(phoneNumber, message);
        if (!chatbotResponse.shouldSend) {
            return res.json({
                success: true,
                message: 'Mensaje procesado pero no enviado',
                response: chatbotResponse.response,
                conversationState: chatbotResponse.conversationState
            });
        }
        // Enviar respuesta por WhatsApp
        const whatsappResult = yield whatsapp_service_1.whatsappService.sendMessage({
            to: phoneNumber,
            message: chatbotResponse.response
        });
        return res.json({
            success: whatsappResult.success,
            message: whatsappResult.success ? 'Mensaje enviado exitosamente' : 'Error enviando mensaje',
            response: chatbotResponse.response,
            messageId: whatsappResult.messageId,
            conversationState: chatbotResponse.conversationState,
            error: whatsappResult.error || chatbotResponse.error
        });
    }
    catch (error) {
        console.error('[ChatbotRouter] Error en send-message:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * POST /api/chatbot/process-webhook
 * Procesar mensaje entrante de WhatsApp webhook y generar respuesta automática
 */
router.post('/process-webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, message, contactName } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }
        console.log(`[ChatbotRouter] Procesando webhook para ${phoneNumber}: ${message.substring(0, 50)}...`);
        // Generar respuesta con IA
        const chatbotResponse = yield chatbot_service_1.chatbotService.processWhatsAppMessage(phoneNumber, message);
        if (!chatbotResponse.shouldSend) {
            return res.json({
                success: true,
                message: 'Mensaje procesado pero no enviado automáticamente',
                response: chatbotResponse.response,
                conversationState: chatbotResponse.conversationState
            });
        }
        // Enviar respuesta automática por WhatsApp
        const whatsappResult = yield whatsapp_service_1.whatsappService.sendMessage({
            to: phoneNumber,
            message: chatbotResponse.response
        });
        return res.json({
            success: whatsappResult.success,
            message: whatsappResult.success ? 'Respuesta automática enviada' : 'Error enviando respuesta automática',
            response: chatbotResponse.response,
            messageId: whatsappResult.messageId,
            conversationState: chatbotResponse.conversationState,
            error: whatsappResult.error || chatbotResponse.error
        });
    }
    catch (error) {
        console.error('[ChatbotRouter] Error en process-webhook:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * GET /api/chatbot/conversation/:phoneNumber
 * Obtener conversación por número de teléfono
 */
router.get('/conversation/:phoneNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber } = req.params;
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber es requerido'
            });
        }
        const conversation = chatbot_service_1.chatbotService.getConversationByPhone(phoneNumber);
        if (!conversation) {
            return res.json({
                success: true,
                message: 'No se encontró conversación activa',
                conversation: null
            });
        }
        return res.json({
            success: true,
            conversation: {
                id: conversation.conversationId,
                phoneNumber: conversation.phoneNumber,
                status: conversation.status,
                clientInfo: conversation.clientInfo,
                messagesCount: conversation.messages.length,
                createdAt: conversation.createdAt,
                lastActivity: conversation.lastActivity
            }
        });
    }
    catch (error) {
        console.error('[ChatbotRouter] Error obteniendo conversación:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * GET /api/chatbot/stats
 * Obtener estadísticas del chatbot
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = chatbot_service_1.chatbotService.getStats();
        return res.json({
            success: true,
            stats: Object.assign(Object.assign({}, stats), { timestamp: new Date(), uptime: process.uptime() })
        });
    }
    catch (error) {
        console.error('[ChatbotRouter] Error obteniendo estadísticas:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
/**
 * POST /api/chatbot/test-ai
 * Probar respuesta de IA sin enviar por WhatsApp
 */
router.post('/test-ai', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }
        console.log(`[ChatbotRouter] Prueba de IA para ${phoneNumber}: ${message.substring(0, 50)}...`);
        // Generar respuesta con IA sin enviar
        const chatbotResponse = yield chatbot_service_1.chatbotService.processWhatsAppMessage(phoneNumber, message);
        return res.json({
            success: true,
            message: 'Respuesta generada exitosamente',
            response: chatbotResponse.response,
            conversationState: chatbotResponse.conversationState,
            error: chatbotResponse.error
        });
    }
    catch (error) {
        console.error('[ChatbotRouter] Error en test-ai:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
}));
// POST /api/chatbot/takeover - Cambiar modo takeover
router.post('/takeover', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId, mode, agentId, reason } = req.body;
        if (!conversationId || !mode) {
            return res.status(400).json({
                success: false,
                error: 'Los campos "conversationId" y "mode" son requeridos'
            });
        }
        if (!['spectator', 'takeover', 'ai_only'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: 'Modo inválido. Debe ser: spectator, takeover, o ai_only'
            });
        }
        const result = yield database_service_1.databaseService.setConversationTakeoverMode(conversationId, mode, agentId, reason);
        if (result.success) {
            res.json({
                success: true,
                message: `Modo takeover actualizado a: ${mode}`,
                data: {
                    conversationId,
                    takeoverMode: mode,
                    assignedAgentId: agentId,
                    reason
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error actualizando modo takeover',
                details: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}));
// GET /api/chatbot/takeover/:conversationId - Obtener modo takeover
router.get('/takeover/:conversationId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const mode = yield database_service_1.databaseService.getConversationTakeoverMode(conversationId);
        res.json({
            success: true,
            data: {
                conversationId,
                takeoverMode: mode || 'spectator'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}));
// GET /api/chatbot/conversations/spectator - Obtener conversaciones en espectador
router.get('/conversations/spectator', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conversations = yield database_service_1.databaseService.getSpectatorConversations();
        res.json({
            success: true,
            data: {
                conversations,
                count: conversations.length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}));
// GET /api/chatbot/conversations/takeover - Obtener conversaciones en takeover
router.get('/conversations/takeover', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conversations = yield database_service_1.databaseService.getTakeoverConversations();
        res.json({
            success: true,
            data: {
                conversations,
                count: conversations.length
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
}));
exports.default = router;
