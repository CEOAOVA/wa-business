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
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const result = whatsapp_service_1.whatsappService.verifyWebhook(mode, token, challenge);
        if (result) {
            res.status(200).send(result);
        }
        else {
            res.status(403).send('Token de verificación incorrecto');
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error en verificación de webhook'
        });
    }
});
// POST /api/chat/webhook - Recibir mensajes (con seguridad integrada)
router.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    try {
        console.log(`🔒 [${requestId}] Webhook recibido desde IP: ${clientIp}`);
        // Validación básica de estructura
        if (!req.body || typeof req.body !== 'object') {
            console.warn(`⚠️ [${requestId}] Webhook con payload inválido`);
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid payload structure'
            });
        }
        // Verificar estructura básica de webhook de WhatsApp
        const { object, entry } = req.body;
        if (!object || !Array.isArray(entry)) {
            console.warn(`⚠️ [${requestId}] Estructura de webhook inválida`);
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid WhatsApp webhook structure'
            });
        }
        // Log detallado solo en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`📨 [${requestId}] Webhook mensaje completo:`, JSON.stringify(req.body, null, 2));
        }
        else {
            // En producción, log resumido por seguridad
            console.log(`📊 [${requestId}] Webhook: ${object}, entries: ${entry.length}, UA: ${userAgent.substring(0, 50)}`);
        }
        const result = yield whatsapp_service_1.whatsappService.processWebhook(req.body);
        console.log(`✅ [${requestId}] Webhook procesado exitosamente: ${result.processed} mensajes`);
        res.status(200).json({
            success: true,
            processed: result.processed,
            messages: result.messages.length // Solo enviar count por seguridad
        });
    }
    catch (error) {
        console.error(`❌ [${requestId}] Error procesando webhook:`, error.message);
        // Log de seguridad para errores
        console.log(`⚠️ [${requestId}] Security alert - Error en webhook:`, {
            ip: clientIp,
            userAgent: userAgent.substring(0, 100),
            error: error.message,
            timestamp: new Date().toISOString()
        });
        // Siempre responder 200 a WhatsApp para evitar reenvíos
        res.status(200).json({
            success: false,
            error: 'Internal processing error'
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
exports.default = router;
