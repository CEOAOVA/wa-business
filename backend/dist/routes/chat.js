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
const unified_database_service_1 = require("../services/unified-database.service");
const whatsapp_utils_1 = require("../utils/whatsapp-utils");
const auth_jwt_1 = require("../middleware/auth-jwt");
const structured_logger_1 = require("../utils/structured-logger");
const bull_queue_service_1 = require("../services/bull-queue.service");
const failed_message_retry_service_1 = require("../services/failed-message-retry.service");
const logger_1 = require("../config/logger");
// authRateLimit removido - ya no se necesita rate limiting
const router = express_1.default.Router();
/**
 * Determinar prioridad del mensaje basado en el contenido del webhook
 */
function determineMessagePriority(webhookData) {
    try {
        const { entry } = webhookData;
        if (!Array.isArray(entry) || entry.length === 0) {
            return 'normal';
        }
        // Verificar si hay mensajes en el webhook
        const hasMessages = entry.some((e) => { var _a; return (_a = e.changes) === null || _a === void 0 ? void 0 : _a.some((c) => { var _a, _b; return ((_b = (_a = c.value) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b.length) > 0; }); });
        if (hasMessages) {
            // Verificar si es un mensaje de texto simple (prioridad normal)
            // vs mensaje con media o interactivo (prioridad alta)
            const hasMedia = entry.some((e) => {
                var _a;
                return (_a = e.changes) === null || _a === void 0 ? void 0 : _a.some((c) => {
                    var _a, _b;
                    return (_b = (_a = c.value) === null || _a === void 0 ? void 0 : _a.messages) === null || _b === void 0 ? void 0 : _b.some((m) => m.type !== 'text' || m.interactive || m.button);
                });
            });
            return hasMedia ? 'high' : 'normal';
        }
        // Status updates o notificaciones tienen prioridad baja
        return 'low';
    }
    catch (error) {
        structured_logger_1.StructuredLogger.logError('determine_message_priority', error, { webhookData });
        return 'normal'; // Default fallback
    }
}
// POST /api/chat/send - Enviar mensaje de texto
router.post('/send', auth_jwt_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(' [ChatRouter] Recibiendo petición de envío:', req.body);
        console.log(' [ChatRouter] Headers:', req.headers);
        console.log(' [ChatRouter] User:', req.user);
        const { to, message, clientId } = req.body; // NUEVO: Incluir clientId
        if (!to || !message) {
            console.log(' [ChatRouter] Campos faltantes:', { to, message });
            return res.status(400).json({
                success: false,
                error: 'Los campos "to" y "message" son requeridos'
            });
        }
        console.log(' [ChatRouter] Validando número:', to);
        const phoneValidation = (0, whatsapp_utils_1.validatePhoneNumber)(to);
        console.log(' [ChatRouter] Resultado validación:', phoneValidation);
        if (!phoneValidation.isValid) {
            console.log(' [ChatRouter] Número inválido:', phoneValidation.error);
            return res.status(400).json({
                success: false,
                error: phoneValidation.error
            });
        }
        console.log(' [ChatRouter] Llamando a whatsappService.sendMessage...');
        const result = yield whatsapp_service_1.whatsappService.sendMessage({
            to: phoneValidation.formatted,
            message: message.toString(),
            clientId: clientId // NUEVO: Pasar clientId
        });
        console.log(' [ChatRouter] Resultado de sendMessage:', result);
        if (result.success) {
            console.log(' [ChatRouter] Mensaje enviado exitosamente');
            res.json({
                success: true,
                message: 'Mensaje enviado exitosamente',
                messageId: result.messageId,
                waMessageId: result.messageId, // NUEVO: Incluir waMessageId en respuesta
                to: phoneValidation.formatted
            });
        }
        else {
            console.error(' [ChatRouter] Error enviando mensaje:', result.error);
            res.status(500).json({
                success: false,
                error: 'Error enviando mensaje',
                details: result.error
            });
        }
    }
    catch (error) {
        console.error(' [ChatRouter] Error interno del servidor:', error);
        console.error(' [ChatRouter] Stack trace:', error.stack);
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
        const phoneValidation = (0, whatsapp_utils_1.validatePhoneNumber)(to);
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
        console.log(` [${requestId}] Webhook verification request from IP: ${clientIp}`);
        console.log(` [${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
        console.log(` [${requestId}] Query params:`, JSON.stringify(req.query, null, 2));
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        console.log(` [${requestId}] Parsed values:`, {
            mode,
            token: token ? `${token.substring(0, 10)}...` : 'undefined',
            challenge: challenge ? `${challenge.substring(0, 20)}...` : 'undefined'
        });
        // Validate required parameters según Meta webhook requirements
        if (!mode || !token || !challenge) {
            console.error(` [${requestId}] Missing required parameters:`, {
                mode: !!mode,
                token: !!token,
                challenge: !!challenge
            });
            return res.status(400).send('Missing required parameters: hub.mode, hub.verify_token, hub.challenge');
        }
        // Verificar modo de suscripción
        if (mode !== 'subscribe') {
            console.error(` [${requestId}] Invalid mode: ${mode}, expected: subscribe`);
            return res.status(403).send('Invalid mode. Expected: subscribe');
        }
        // Verificar token - esto es crítico para la seguridad
        const result = (0, whatsapp_utils_1.verifyWebhook)(mode, token, challenge);
        if (result) {
            console.log(` [${requestId}] Webhook verification successful, returning challenge: ${challenge}`);
            // IMPORTANTE: Responder SOLO con el challenge (como string, no JSON)
            // Meta espera exactamente el challenge string, no un objeto JSON
            res.status(200).send(result);
        }
        else {
            console.error(` [${requestId}] Webhook verification failed - token mismatch`);
            console.error(` [${requestId}] Expected token: ${(0, whatsapp_utils_1.getWebhookDebugInfo)().verifyTokenConfigured ? 'configured' : 'NOT CONFIGURED'}`);
            res.status(403).send('Forbidden: Invalid verify token');
        }
    }
    catch (error) {
        console.error(` [${requestId}] Error in webhook verification:`, error);
        res.status(500).send('Internal server error during webhook verification');
    }
});
// POST /api/chat/webhook - Recibir mensajes (optimizado < 100ms)
router.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // CRITICAL: Responder INMEDIATAMENTE - WhatsApp requiere < 5s, apuntamos a < 100ms
    res.status(200).send('OK');
    // TODO el procesamiento se hace DESPUÉS de responder
    setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const startTime = Date.now();
        const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
        const clientIp = req.ip || ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        try {
            // Validación mínima de estructura
            if (!req.body || typeof req.body !== 'object' || req.body.object !== 'whatsapp_business_account') {
                logger_1.logger.debug(`Webhook ignorado - no es de WhatsApp Business`, { requestId });
                return;
            }
            // Determinar prioridad
            const priority = determineMessagePriority(req.body);
            // Agregar a Bull Queue para procesamiento robusto
            const jobId = yield bull_queue_service_1.bullQueueService.addWebhookToQueue({
                requestId,
                payload: req.body,
                timestamp: new Date().toISOString(),
                priority
            });
            // Log mínimo para performance
            const processingTime = Date.now() - startTime;
            logger_1.logger.debug(`Webhook encolado en ${processingTime}ms`, {
                requestId,
                jobId,
                priority
            });
        }
        catch (error) {
            logger_1.logger.error('Error encolando webhook', {
                requestId,
                error: error.message,
                stack: error.stack
            });
        }
    }));
}));
// ============================================
// RUTAS PARA TAKEOVER Y RESÚMENES
// ============================================
// GET /api/chat/conversations/:id/messages - Obtener historial de mensajes
router.get('/conversations/:id/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: conversationId } = req.params;
        const { limit, offset } = req.query;
        console.log(`📨 [Messages] Obteniendo historial para: ${conversationId} (límite: ${limit || 50})`);
        // Usar el servicio de base de datos con límite optimizado
        const messages = yield unified_database_service_1.unifiedDatabaseService.getConversationMessages(conversationId, parseInt(limit) || 50, parseInt(offset) || 0);
        console.log(`📨 [Messages] ${messages.length} mensajes obtenidos para ${conversationId}`);
        // DEBUG: Contar mensajes por tipo de remitente
        if (messages.length > 0) {
            const userMessages = messages.filter(m => m.sender_type === 'user').length;
            const botMessages = messages.filter(m => m.sender_type === 'bot').length;
            const agentMessages = messages.filter(m => m.sender_type === 'agent').length;
            console.log(`📨 [Messages] Desglose de mensajes: User=${userMessages}, Bot=${botMessages}, Agent=${agentMessages}`);
        }
        res.json({
            success: true,
            data: {
                messages: messages,
                total: messages.length,
                conversationId
            }
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
        const conversations = yield unified_database_service_1.unifiedDatabaseService.getConversations(limit, offset);
        res.json({
            success: true,
            conversations: conversations,
            total: conversations.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo conversaciones',
            details: error.message
        });
    }
}));
// GET /api/chat/messages - Mantener compatibilidad (deprecado)
router.get('/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const conversations = yield unified_database_service_1.unifiedDatabaseService.getConversations(limit, offset);
        // Convertir a formato legacy
        const legacyFormat = {
            success: true,
            messages: conversations.map((conv) => {
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
            }),
            total: conversations.length,
            unread: conversations.filter((conv) => conv.unreadCount > 0).length
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
        const result = yield unified_database_service_1.unifiedDatabaseService.markMessageAsRead(messageId);
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
        const result = yield unified_database_service_1.unifiedDatabaseService.markConversationAsRead(conversationId);
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
        const removedCount = yield unified_database_service_1.unifiedDatabaseService.cleanupOldMessages(hours);
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
        const removedCount = yield unified_database_service_1.unifiedDatabaseService.cleanupOldMessages(0); // 0 días = limpiar todo
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
        const result = (0, whatsapp_utils_1.getStats)();
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
        yield whatsapp_service_1.whatsappService.processWebhookLegacy(simulatedWebhook);
        res.json({
            success: true,
            message: 'Mensaje simulado procesado',
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
        const config = (0, whatsapp_utils_1.getWebhookDebugInfo)();
        res.json({
            success: true,
            webhook: {
                url: config.url,
                path: config.path,
                verifyTokenConfigured: config.verifyTokenConfigured,
                verifyTokenLength: config.verifyTokenLength,
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
        const result = yield (0, whatsapp_utils_1.setWebhookUrl)(callbackUrl);
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
        const config = (0, whatsapp_utils_1.getWebhookDebugInfo)();
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
// ============================================
// RUTAS PARA RETRY DE MENSAJES FALLIDOS
// ============================================
// GET /api/chat/failed-messages - Obtener mensajes fallidos
router.get('/failed-messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const failedMessages = yield failed_message_retry_service_1.failedMessageRetryService.getFailedMessages(limit, offset);
        res.json({
            success: true,
            failedMessages: failedMessages,
            total: failedMessages.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error obteniendo mensajes fallidos',
            details: error.message
        });
    }
}));
// POST /api/chat/failed-messages/:id/retry - Reintentar mensaje fallido
router.post('/failed-messages/:id/retry', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield failed_message_retry_service_1.failedMessageRetryService.retryFailedMessage(id);
        if (result) {
            res.json({
                success: true,
                message: 'Mensaje fallido reintentado',
                messageId: result.messageId,
                whatsappMessageId: result.whatsappMessageId
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Mensaje fallido no encontrado'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error reintentando mensaje fallido',
            details: error.message
        });
    }
}));
// DELETE /api/chat/failed-messages/clear-all - Limpiar TODOS los mensajes fallidos
router.delete('/failed-messages/clear-all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const removedCount = yield failed_message_retry_service_1.failedMessageRetryService.clearAllFailedMessages();
        res.json({
            success: true,
            message: `LIMPIEZA TOTAL: ${removedCount} mensajes fallidos eliminados`,
            removedCount
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error limpiando mensajes fallidos',
            details: error.message
        });
    }
}));
exports.default = router;
