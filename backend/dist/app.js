"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const chat_1 = __importDefault(require("./routes/chat"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const media_upload_1 = __importDefault(require("./routes/media-upload"));
const chatbot_1 = __importDefault(require("./routes/chatbot"));
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const env_loader_1 = require("./config/env-loader");
const whatsapp_1 = require("./config/whatsapp");
const whatsapp_service_1 = require("./services/whatsapp.service");
const security_1 = require("./middleware/security");
const security_2 = require("./middleware/security");
const session_cleanup_service_1 = require("./services/session-cleanup.service");
// Cargar variables de entorno con soporte Unicode
(0, env_loader_1.loadEnvWithUnicodeSupport)();
// Debug de variables de entorno
console.log('🔍 Estado de variables de entorno:', (0, env_loader_1.getEnvDebugInfo)());
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = whatsapp_1.whatsappConfig.server.port;
// Configurar trust proxy para Docker/Coolify (ANTES de seguridad)
app.set('trust proxy', true);
// Aplicar configuración de seguridad ANTES de cualquier otra cosa
(0, security_1.applySecurity)(app);
// Configurar Socket.IO con CORS
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: whatsapp_1.whatsappConfig.server.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});
exports.io = io;
// Middleware para parsing JSON
app.use(express_1.default.json());
// Middleware para hacer disponible io en las rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`👤 Cliente conectado: ${socket.id}`);
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`📨 Cliente ${socket.id} se unió a conversación ${conversationId}`);
    });
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`📤 Cliente ${socket.id} salió de conversación ${conversationId}`);
    });
    socket.on('disconnect', () => {
        console.log(`👋 Cliente desconectado: ${socket.id}`);
    });
});
// Rutas principales
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Rutas de autenticación (con rate limiting específico)
app.use('/api/auth', security_2.authRateLimit, auth_1.default);
// Rutas de WhatsApp Chat
app.use('/api/chat', chat_1.default);
// Rutas de gestión de contactos
app.use('/api/contacts', contacts_1.default);
// Rutas de multimedia
app.use('/api/media', media_upload_1.default);
// Rutas del chatbot con IA
app.use('/api/chatbot', chatbot_1.default);
// Rutas del dashboard
app.use('/api/dashboard', dashboard_1.default);
// Información de la API
app.get('/api', (_req, res) => {
    res.json({
        name: 'WhatsApp Business API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            whatsapp: {
                send: '/api/chat/send',
                template: '/api/chat/template',
                status: '/api/chat/status',
                info: '/api/chat/info',
                test: '/api/chat/test',
                webhook: '/api/chat/webhook',
                conversations: '/api/chat/conversations',
                messages: '/api/chat/messages'
            },
            contacts: {
                list: '/api/contacts',
                search: '/api/contacts/search',
                get: '/api/contacts/:id',
                update: '/api/contacts/:id',
                delete: '/api/contacts/:id',
                block: '/api/contacts/:id/block',
                favorite: '/api/contacts/:id/favorite',
                tags: '/api/contacts/tags/all',
                createTag: '/api/contacts/tags',
                tagContacts: '/api/contacts/tags/:tagId/contacts'
            },
            media: {
                upload: '/api/media/upload',
                uploadAndSend: '/api/media/upload-and-send',
                download: '/api/media/download/:mediaId',
                send: '/api/media/send',
                file: '/api/media/file/:filename',
                thumbnail: '/api/media/thumbnail/:filename',
                stats: '/api/media/stats',
                cleanup: '/api/media/cleanup',
                types: '/api/media/types'
            },
            chatbot: {
                sendMessage: '/api/chatbot/send-message',
                processWebhook: '/api/chatbot/process-webhook',
                conversation: '/api/chatbot/conversation/:phoneNumber',
                stats: '/api/chatbot/stats',
                testAI: '/api/chatbot/test-ai'
            },
            dashboard: {
                stats: '/api/dashboard/stats',
                conversations: '/api/dashboard/conversations',
                popularProducts: '/api/dashboard/products/popular',
                analytics: '/api/dashboard/analytics/summary',
                health: '/api/dashboard/system/health',
                testChatbot: '/api/dashboard/test/chatbot'
            }
        },
        websocket: {
            enabled: true,
            events: ['new_message', 'message_status', 'conversation_updated', 'media_uploaded', 'media_downloaded']
        }
    });
});
// Función para limpiar sesiones al inicio
function cleanupSessionsOnStartup() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🧹 Iniciando limpieza de sesiones al arranque...');
            // Importar servicios que necesitan limpieza
            const { rateLimiter } = yield Promise.resolve().then(() => __importStar(require('./services/rate-limiter/rate-limiter')));
            const { cacheService } = yield Promise.resolve().then(() => __importStar(require('./services/cache/cache-service')));
            // Limpiar rate limiter
            if (rateLimiter) {
                rateLimiter.destroy();
                console.log('✅ Rate limiter limpiado');
            }
            // Limpiar caché
            if (cacheService) {
                cacheService.destroy();
                console.log('✅ Cache service limpiado');
            }
            // Limpiar conversaciones del chatbot
            const { ChatbotService } = yield Promise.resolve().then(() => __importStar(require('./services/chatbot.service')));
            const chatbotService = new ChatbotService();
            if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
                chatbotService['cleanupExpiredSessions']();
                console.log('✅ Chatbot sessions limpiadas');
            }
            // Limpiar conversaciones generales
            const { ConversationService } = yield Promise.resolve().then(() => __importStar(require('./services/conversation/conversation-service')));
            const conversationService = new ConversationService();
            if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
                const removedCount = conversationService['cleanupInactiveSessions'](0); // Limpiar todas las sesiones
                console.log(`✅ ${removedCount} conversaciones inactivas limpiadas`);
            }
            // Limpiar caché de inventario
            const { InventoryCache } = yield Promise.resolve().then(() => __importStar(require('./services/soap/inventory-cache')));
            const inventoryCache = new InventoryCache();
            if (inventoryCache && typeof inventoryCache.clear === 'function') {
                inventoryCache.clear();
                console.log('✅ Inventory cache limpiado');
            }
            console.log('🎉 Limpieza de sesiones completada al arranque');
        }
        catch (error) {
            console.error('⚠️ Error durante la limpieza de sesiones:', error);
            // No fallar el arranque por errores de limpieza
        }
    });
}
// Función para inicializar la aplicación
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Limpiar sesiones al inicio
            yield cleanupSessionsOnStartup();
            // Inicializar servicios con Socket.IO
            yield whatsapp_service_1.whatsappService.initialize(io);
            // Inicializar servicios al arrancar la aplicación
            console.log('🚀 Inicializando servicios...');
            // Inicializar servicio de limpieza de sesiones
            try {
                const stats = session_cleanup_service_1.sessionCleanupService.getServiceStats();
                console.log('✅ Servicio de limpieza de sesiones inicializado:', {
                    isRunning: stats.isRunning,
                    intervalMinutes: stats.interval / 1000 / 60,
                    timeoutHours: stats.timeout / 1000 / 60 / 60
                });
            }
            catch (error) {
                console.error('❌ Error inicializando servicio de limpieza de sesiones:', error);
            }
            // Iniciar servidor
            httpServer.listen(PORT, () => {
                console.log(`🚀 Backend running on http://localhost:${PORT}`);
                console.log(`📱 WhatsApp API ready at http://localhost:${PORT}/api/chat`);
                console.log(`💾 Base de datos SQLite conectada`);
                console.log(`🔧 Variables de entorno cargadas desde .env`);
                console.log(`🌐 WebSocket server ready for real-time messaging`);
                console.log(`🧹 Sesiones limpiadas automáticamente al arranque`);
            });
        }
        catch (error) {
            console.error('❌ Error iniciando el servidor:', error);
            process.exit(1);
        }
    });
}
// Manejar cierre graceful
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Cerrando servidor...');
    httpServer.close();
    process.exit(0);
}));
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🛑 Cerrando servidor...');
    httpServer.close();
    process.exit(0);
}));
// Iniciar servidor
startServer();
