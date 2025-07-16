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
const express_1 = __importDefault(require("express"));
const whatsapp_service_1 = require("../services/whatsapp.service");
const router = express_1.default.Router();
// POST /api/chat/send - Enviar mensaje de texto
router.post('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Los campos "to" y "message" son requeridos'
            });
        }
        const phoneValidation = whatsapp_service_1.whatsappService.validatePhoneNumber(to);
        if (!phoneValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: phoneValidation.error
            });
        }
        const result = yield whatsapp_service_1.whatsappService.sendMessage({
            to: phoneValidation.formatted,
            message: message.toString()
        });
        if (result.success) {
            res.json({
                success: true,
                message: 'Mensaje enviado exitosamente',
                messageId: result.messageId,
                to: phoneValidation.formatted
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error enviando mensaje',
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
// POST /api/chat/template - Enviar template
router.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, template, language = 'es' } = req.body;
        if (!to || !template) {
            return res.status(400).json({
                success: false,
                error: 'Los campos "to" y "template" son requeridos'
            });
        }
        const phoneValidation = whatsapp_service_1.whatsappService.validatePhoneNumber(to);
        if (!phoneValidation.isValid) {
            return res.status(400).json({
                success: false,
                error: phoneValidation.error
            });
        }
        const result = yield whatsapp_service_1.whatsappService.sendTemplate({
            to: phoneValidation.formatted,
            template,
            language
        });
        if (result.success) {
            res.json({
                success: true,
                message: 'Template enviado exitosamente',
                messageId: result.messageId
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error enviando template',
                details: result.error
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
// GET /api/chat/status - Estado de configuración
router.get('/status', (req, res) => {
    try {
        const status = whatsapp_service_1.whatsappService.getStatus();
        // Agregar información de seguridad
        const securityStatus = {
            webhookSecurity: {
                signatureVerificationEnabled: !!process.env.WHATSAPP_APP_SECRET &&
                    (process.env.NODE_ENV === 'production' || process.env.ENABLE_WEBHOOK_SIGNATURE === 'true'),
                rateLimitingEnabled: true,
                detailedLoggingEnabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_DETAILED_LOGS === 'true'
            },
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        };
        res.json(Object.assign(Object.assign({}, status), { security: securityStatus }));
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo status'
        });
    }
});
// GET /api/chat/info - Información del número
router.get('/info', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield whatsapp_service_1.whatsappService.getPhoneNumberInfo();
        if (result.success) {
            res.json({ success: true, data: result.data });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error obteniendo información del número'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
// POST /api/chat/test - Endpoint de prueba
router.post('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'Los campos "to" y "message" son requeridos'
            });
        }
        const result = yield whatsapp_service_1.whatsappService.sendMessage({ to, message });
        res.json({
            success: true,
            message: 'Prueba ejecutada',
            testResult: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error en la prueba'
        });
    }
}));
// GET /api/chat/webhook - Verificación del webhook
router.get('/webhook', (req, res) => {
    const requestId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    try {
        console.log(`🔐 [${requestId}] Webhook verification request from IP: ${clientIp}`);
        console.log(`🔐 [${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
        console.log(`🔐 [${requestId}] Query params:`, JSON.stringify(req.query, null, 2));
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        console.log(`🔐 [${requestId}] Parsed values:`, {
            mode,
            token: token ? `${token.substring(0, 10)}...` : 'undefined',
            challenge: challenge ? `${challenge.substring(0, 20)}...` : 'undefined'
        });
        // Validate required parameters según Meta webhook requirements
        if (!mode || !token || !challenge) {
            console.error(`❌ [${requestId}] Missing required parameters:`, {
                mode: !!mode,
                token: !!token,
                challenge: !!challenge
            });
            return res.status(400).send('Missing required parameters: hub.mode, hub.verify_token, hub.challenge');
        }
        // Verificar modo de suscripción
        if (mode !== 'subscribe') {
            console.error(`❌ [${requestId}] Invalid mode: ${mode}, expected: subscribe`);
            return res.status(403).send('Invalid mode. Expected: subscribe');
        }
        // Verificar token - esto es crítico para la seguridad
        const result = whatsapp_service_1.whatsappService.verifyWebhook(mode, token, challenge);
        if (result) {
            console.log(`✅ [${requestId}] Webhook verification successful, returning challenge: ${challenge}`);
            // 🚀 IMPORTANTE: Responder SOLO con el challenge (como string, no JSON)
            // Meta espera exactamente el challenge string, no un objeto JSON
            res.status(200).send(result);
        }
        else {
            console.error(`❌ [${requestId}] Webhook verification failed - token mismatch`);
            console.error(`❌ [${requestId}] Expected token: ${whatsapp_service_1.whatsappService.getWebhookDebugInfo().verifyTokenConfigured ? 'configured' : 'NOT CONFIGURED'}`);
            res.status(403).send('Forbidden: Invalid verify token');
        }
    }
    catch (error) {
        console.error(`❌ [${requestId}] Error in webhook verification:`, error);
        res.status(500).send('Internal server error during webhook verification');
    }
});
// POST /api/chat/webhook - Recibir mensajes (con seguridad integrada)
router.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    // 🚀 RESPONDER INMEDIATAMENTE CON 200 para evitar reenvíos de WhatsApp
    // Según las mejores prácticas, WhatsApp reenvía si no recibe 200 rápidamente
    res.status(200).json({
        success: true,
        message: 'received'
    });
    try {
        console.log(`🔒 [${requestId}] Webhook recibido desde IP: ${clientIp}`);
        // Validación básica de estructura
        if (!req.body || typeof req.body !== 'object') {
            console.warn(`⚠️ [${requestId}] Webhook con payload inválido`);
            return; // Ya respondimos con 200, solo loggeamos
        }
        // Verificar estructura básica de webhook de WhatsApp
        const { object, entry } = req.body;
        if (!object || !Array.isArray(entry)) {
            console.warn(`⚠️ [${requestId}] Estructura de webhook inválida`);
            return; // Ya respondimos con 200, solo loggeamos
        }
        // Verificar que es de WhatsApp Business
        if (object !== 'whatsapp_business_account') {
            console.warn(`⚠️ [${requestId}] Objeto de webhook no es whatsapp_business_account: ${object}`);
            return; // Ya respondimos con 200, solo loggeamos
        }
        // Log detallado solo en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`📨 [${requestId}] Webhook mensaje completo:`, JSON.stringify(req.body, null, 2));
        }
        else {
            // En producción, log resumido por seguridad
            console.log(`📊 [${requestId}] Webhook: ${object}, entries: ${entry.length}, UA: ${userAgent.substring(0, 50)}`);
        }
        // Procesar webhook de forma asíncrona (no bloqueante)
        setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const result = yield whatsapp_service_1.whatsappService.processWebhook(req.body);
                console.log(`✅ [${requestId}] Webhook procesado exitosamente: ${result.processed} mensajes`);
                // Opcional: Notificar via Socket.IO a clientes conectados
                if (result.messages.length > 0) {
                    // TODO: Implementar notificación en tiempo real si es necesario
                    console.log(`📢 [${requestId}] ${result.messages.length} nuevos mensajes procesados`);
                }
            }
            catch (error) {
                console.error(`❌ [${requestId}] Error procesando webhook asincrónicamente:`, error);
                // No podemos responder al webhook aquí, pero loggeamos para debugging
            }
        }));
    }
    catch (error) {
        console.error(`❌ [${requestId}] Error inicial en webhook:`, error);
        // Ya respondimos con 200, así que solo loggeamos
    }
}));
// ============================================
// NUEVAS RUTAS PARA TAKEOVER Y RESÚMENES
// ============================================
// POST /api/chat/conversations/:id/set-mode - Cambiar modo de IA (takeover)
router.post('/conversations/:id/set-mode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: conversationId } = req.params;
        const { mode, agentId } = req.body;
        // Validación
        if (!mode || !['active', 'inactive'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: 'El campo "mode" es requerido y debe ser "active" o "inactive"'
            });
        }
        if (mode === 'inactive' && !agentId) {
            return res.status(400).json({
                success: false,
                error: 'El campo "agentId" es requerido cuando se desactiva la IA'
            });
        }
        console.log(`🤖 [Takeover] Cambiando modo IA: ${conversationId} -> ${mode}`, mode === 'inactive' ? `(Agente: ${agentId})` : '');
        // TODO: IMPLEMENTAR CON SUPABASE
        // const result = await databaseService.setConversationAIMode(conversationId, mode, agentId);
        // IMPLEMENTACIÓN TEMPORAL CON PRISMA (mientras no hay Supabase)
        // Por ahora simulamos la respuesta exitosa
        const result = { success: true };
        if (result.success) {
            // Emitir evento WebSocket para notificar cambio en tiempo real
            whatsapp_service_1.whatsappService.emitSocketEvent('conversation_ai_mode_changed', {
                conversationId,
                aiMode: mode,
                assignedAgentId: mode === 'inactive' ? agentId : null,
                timestamp: new Date().toISOString()
            });
            res.json({
                success: true,
                message: `Modo IA ${mode === 'active' ? 'activado' : 'desactivado'} exitosamente`,
                conversationId,
                aiMode: mode,
                assignedAgentId: mode === 'inactive' ? agentId : null
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error actualizando modo IA'
            });
        }
    }
    catch (error) {
        console.error('[Takeover] Error en set-mode:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
// GET /api/chat/conversations/:id/mode - Obtener modo actual de IA
router.get('/conversations/:id/mode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: conversationId } = req.params;
        console.log(`🔍 [Takeover] Consultando modo IA para: ${conversationId}`);
        // TODO: IMPLEMENTAR CON SUPABASE
        // const result = await databaseService.getConversationAIMode(conversationId);
        // IMPLEMENTACIÓN TEMPORAL
        const result = {
            aiMode: 'active',
            assignedAgentId: null
        };
        if (result) {
            res.json({
                success: true,
                conversationId,
                aiMode: result.aiMode,
                assignedAgentId: result.assignedAgentId
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Conversación no encontrada'
            });
        }
    }
    catch (error) {
        console.error('[Takeover] Error obteniendo modo IA:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
// GET /api/chat/conversations/:id/summary - Generar resumen de conversación
router.get('/conversations/:id/summary', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: conversationId } = req.params;
        const { forceRegenerate } = req.query;
        console.log(`📝 [Summary] Generando resumen para: ${conversationId}`, forceRegenerate ? '(Forzar regeneración)' : '');
        // 1. Verificar caché si no se fuerza regeneración
        if (!forceRegenerate) {
            // TODO: IMPLEMENTAR CON SUPABASE
            // const cachedSummary = await databaseService.getConversationSummary(conversationId);
            // if (cachedSummary) {
            //   return res.json({
            //     success: true,
            //     summary: cachedSummary.summary,
            //     keyPoints: cachedSummary.keyPoints,
            //     isFromCache: cachedSummary.isFromCache,
            //     conversationId
            //   });
            // }
        }
        // 2. Obtener historial de mensajes
        // TODO: IMPLEMENTAR CON SUPABASE
        // const messages = await databaseService.getConversationHistory(conversationId);
        // IMPLEMENTACIÓN TEMPORAL - Simular algunos mensajes
        const messages = [
            { role: 'user', content: 'Necesito pastillas de freno para mi Toyota Corolla 2018', timestamp: new Date() },
            { role: 'assistant', content: 'Te ayudo a encontrar pastillas de freno. Para tu Toyota Corolla 2018, ¿qué tipo de motor tiene?', timestamp: new Date() },
            { role: 'user', content: 'Es 1.8L', timestamp: new Date() },
            { role: 'assistant', content: 'Perfecto. Tenemos pastillas de freno para Toyota Corolla 2018 1.8L. Mi nombre es María, ¿cuál es tu nombre?', timestamp: new Date() },
            { role: 'user', content: 'Me llamo Carlos y vivo en 06100', timestamp: new Date() }
        ];
        if (messages.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron mensajes para esta conversación'
            });
        }
        // 3. Generar resumen con IA
        const chatbotService = require('../services/chatbot.service').chatbotService;
        const summary = yield chatbotService.generateConversationSummary(conversationId, messages);
        // 4. Guardar en caché
        // TODO: IMPLEMENTAR CON SUPABASE
        // await databaseService.saveConversationSummary(
        //   conversationId, 
        //   summary.text, 
        //   summary.keyPoints, 
        //   messages.length
        // );
        console.log(`✅ [Summary] Resumen generado exitosamente para: ${conversationId}`);
        res.json({
            success: true,
            summary: summary.text,
            keyPoints: summary.keyPoints,
            isFromCache: false,
            conversationId,
            messageCount: messages.length,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Summary] Error generando resumen:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error generando resumen de conversación'
        });
    }
}));
// GET /api/chat/conversations/:id/messages - Obtener historial de mensajes
router.get('/conversations/:id/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: conversationId } = req.params;
        const { limit, offset } = req.query;
        console.log(`📨 [Messages] Obteniendo historial para: ${conversationId}`);
        // TODO: IMPLEMENTAR CON SUPABASE
        // const messages = await databaseService.getConversationHistory(conversationId);
        // IMPLEMENTACIÓN TEMPORAL
        const messages = [
            {
                id: '1',
                role: 'user',
                content: 'Necesito pastillas de freno para mi Toyota Corolla 2018',
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                metadata: {}
            },
            {
                id: '2',
                role: 'assistant',
                content: 'Te ayudo a encontrar pastillas de freno. Para tu Toyota Corolla 2018, ¿qué tipo de motor tiene?',
                timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
                metadata: { function_called: 'buscarYConsultarInventario' }
            },
            {
                id: '3',
                role: 'user',
                content: 'Es 1.8L',
                timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
                metadata: {}
            },
            {
                id: '4',
                role: 'assistant',
                content: 'Perfecto. Tenemos pastillas de freno para Toyota Corolla 2018 1.8L. Mi nombre es María, ¿cuál es tu nombre?',
                timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                metadata: { function_called: 'recopilarDatosUsuario' }
            },
            {
                id: '5',
                role: 'user',
                content: 'Me llamo Carlos y vivo en 06100',
                timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
                metadata: {}
            }
        ];
        // Aplicar paginación si se especifica
        let paginatedMessages = messages;
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset) || 0;
            paginatedMessages = messages.slice(offsetNum, offsetNum + limitNum);
        }
        res.json({
            success: true,
            messages: paginatedMessages,
            total: messages.length,
            conversationId
        });
    }
    catch (error) {
        console.error('[Messages] Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo historial de mensajes'
        });
    }
}));
// GET /api/chat/conversations - Obtener conversaciones
router.get('/conversations', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = yield whatsapp_service_1.whatsappService.getConversations(limit, offset);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo conversaciones',
            details: error.message
        });
    }
}));
// GET /api/chat/conversations/:id/messages - Obtener mensajes de una conversación
router.get('/conversations/:id/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conversationId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = yield whatsapp_service_1.whatsappService.getConversationMessages(conversationId, limit, offset);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo mensajes de conversación',
            details: error.message
        });
    }
}));
// GET /api/chat/messages - Mantener compatibilidad (deprecado)
router.get('/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = yield whatsapp_service_1.whatsappService.getConversations(limit, offset);
        // Convertir a formato legacy
        const legacyFormat = {
            success: true,
            messages: ((_a = result.conversations) === null || _a === void 0 ? void 0 : _a.map((conv) => {
                var _a, _b, _c;
                return ({
                    id: ((_a = conv.lastMessage) === null || _a === void 0 ? void 0 : _a.id) || conv.id,
                    from: conv.contactWaId,
                    message: ((_b = conv.lastMessage) === null || _b === void 0 ? void 0 : _b.content) || '',
                    timestamp: ((_c = conv.lastMessage) === null || _c === void 0 ? void 0 : _c.timestamp) || conv.updatedAt,
                    contact: {
                        name: conv.contactName,
                        wa_id: conv.contactWaId
                    },
                    read: conv.unreadCount === 0
                });
            })) || [],
            total: result.total || 0,
            unread: result.unread || 0
        };
        res.json(legacyFormat);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo mensajes',
            details: error.message
        });
    }
}));
// PUT /api/chat/messages/:messageId/read - Marcar mensaje como leído
router.put('/messages/:messageId/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId } = req.params;
        const result = yield whatsapp_service_1.whatsappService.markMessageAsRead(messageId);
        if (result) {
            res.json({
                success: true,
                message: 'Mensaje marcado como leído'
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Mensaje no encontrado'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error marcando mensaje como leído',
            details: error.message
        });
    }
}));
// PUT /api/chat/conversations/:conversationId/read - Marcar conversación como leída
router.put('/conversations/:conversationId/read', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        const result = yield whatsapp_service_1.whatsappService.markConversationAsRead(conversationId);
        if (result) {
            res.json({
                success: true,
                message: 'Conversación marcada como leída'
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Conversación no encontrada'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error marcando conversación como leída',
            details: error.message
        });
    }
}));
// DELETE /api/chat/messages/cleanup - Limpiar mensajes antiguos
router.delete('/messages/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const removedCount = yield whatsapp_service_1.whatsappService.clearOldMessages(hours);
        res.json({
            success: true,
            message: `${removedCount} mensajes eliminados`,
            removedCount
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error limpiando mensajes',
            details: error.message
        });
    }
}));
// DELETE /api/chat/messages/clear-all - Limpiar TODOS los mensajes
router.delete('/messages/clear-all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const removedCount = yield whatsapp_service_1.whatsappService.clearAllMessages();
        res.json({
            success: true,
            message: `LIMPIEZA TOTAL: ${removedCount} mensajes eliminados`,
            removedCount
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error limpiando mensajes',
            details: error.message
        });
    }
}));
// GET /api/chat/stats - Obtener estadísticas
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield whatsapp_service_1.whatsappService.getStats();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas',
            details: error.message
        });
    }
}));
// POST /api/chat/simulate-message - Simular mensaje entrante (para pruebas)
router.post('/simulate-message', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from = '525549679734', message = 'Hola, este es un mensaje de prueba desde WhatsApp', name = 'Cliente Test' } = req.body;
        // Simular estructura de webhook de WhatsApp
        const simulatedWebhook = {
            object: 'whatsapp_business_account',
            entry: [
                {
                    id: 'entry-1',
                    changes: [
                        {
                            field: 'messages',
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '525549679734',
                                    phone_number_id: '748017128384316'
                                },
                                contacts: [
                                    {
                                        profile: {
                                            name: name
                                        },
                                        wa_id: from
                                    }
                                ],
                                messages: [
                                    {
                                        from: from,
                                        id: `sim-msg-${Date.now()}`,
                                        timestamp: Math.floor(Date.now() / 1000).toString(),
                                        text: {
                                            body: message
                                        },
                                        type: 'text'
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        };
        console.log('🧪 Simulando mensaje entrante:', simulatedWebhook);
        const result = yield whatsapp_service_1.whatsappService.processWebhook(simulatedWebhook);
        res.json({
            success: true,
            message: 'Mensaje simulado procesado',
            result: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error simulando mensaje',
            details: error.message
        });
    }
}));
// GET /api/chat/webhook/debug - Debug información del webhook
router.get('/webhook/debug', (req, res) => {
    try {
        console.log('🔍 Debug webhook configuration requested');
        const config = whatsapp_service_1.whatsappService.getWebhookDebugInfo();
        res.json({
            success: true,
            webhook: {
                url: config.url,
                path: config.path,
                verifyTokenConfigured: config.verifyTokenConfigured,
                verifyTokenLength: config.verifyTokenLength,
                appSecretConfigured: config.appSecretConfigured,
                signatureVerificationEnabled: config.signatureVerificationEnabled
            },
            whatsapp: {
                accessTokenConfigured: config.accessTokenConfigured,
                phoneNumberIdConfigured: config.phoneNumberIdConfigured,
                apiVersion: config.apiVersion
            },
            server: {
                nodeEnv: process.env.NODE_ENV,
                port: process.env.PORT,
                timestamp: new Date().toISOString()
            },
            tests: {
                verificationUrl: `https://dev-apiwaprueba.aova.mx/api/chat/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=YOUR_TOKEN`,
                instructions: "Reemplaza YOUR_TOKEN con tu WEBHOOK_VERIFY_TOKEN real para probar"
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo información de debug'
        });
    }
});
// POST /api/chat/webhook/config - Configurar webhook
router.post('/webhook/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { callbackUrl } = req.body;
        if (!callbackUrl) {
            return res.status(400).json({
                success: false,
                error: 'El campo "callbackUrl" es requerido'
            });
        }
        const result = yield whatsapp_service_1.whatsappService.setWebhookUrl(callbackUrl);
        if (result.success) {
            res.json({
                success: true,
                message: 'Webhook configurado exitosamente',
                callbackUrl
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Error configurando webhook'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
// GET /api/chat/webhook/health - Verificar salud del webhook (para debugging)
router.get('/webhook/health', (req, res) => {
    try {
        const config = whatsapp_service_1.whatsappService.getWebhookDebugInfo();
        const timestamp = new Date().toISOString();
        // Verificar configuración crítica
        const issues = [];
        if (!config.verifyTokenConfigured)
            issues.push('WEBHOOK_VERIFY_TOKEN no configurado');
        if (!config.accessTokenConfigured)
            issues.push('WHATSAPP_ACCESS_TOKEN no configurado');
        if (!config.phoneNumberIdConfigured)
            issues.push('WHATSAPP_PHONE_NUMBER_ID no configurado');
        const isHealthy = issues.length === 0;
        res.status(isHealthy ? 200 : 500).json({
            healthy: isHealthy,
            timestamp,
            webhook: {
                url: config.url,
                path: config.path,
                verifyTokenConfigured: config.verifyTokenConfigured,
                verifyTokenLength: config.verifyTokenLength,
                signatureVerificationEnabled: config.signatureVerificationEnabled,
                getEndpoint: `${req.protocol}://${req.get('host')}/api/chat/webhook`,
                postEndpoint: `${req.protocol}://${req.get('host')}/api/chat/webhook`
            },
            whatsapp: {
                accessTokenConfigured: config.accessTokenConfigured,
                phoneNumberIdConfigured: config.phoneNumberIdConfigured,
                apiVersion: config.apiVersion
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                port: process.env.PORT,
                timestamp
            },
            issues: issues.length > 0 ? issues : null,
            tests: {
                verificationUrl: `${req.protocol}://${req.get('host')}/api/chat/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=YOUR_TOKEN`,
                instructions: [
                    "1. Reemplaza YOUR_TOKEN con tu WEBHOOK_VERIFY_TOKEN real",
                    "2. Usa esta URL en el webhook de Meta para verificar",
                    "3. El webhook debe responder con 'test123' si está configurado correctamente"
                ]
            }
        });
    }
    catch (error) {
        res.status(500).json({
            healthy: false,
            error: 'Error obteniendo información de salud del webhook',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
