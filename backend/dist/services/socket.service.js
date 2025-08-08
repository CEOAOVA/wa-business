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
exports.socketService = exports.SocketService = void 0;
/**
 * Servicio centralizado de Socket.IO
 * Unifica todas las implementaciones de WebSocket en un solo lugar
 */
const socket_io_1 = require("socket.io");
const logger_1 = require("../utils/logger");
const token_service_1 = require("./token.service");
const auth_service_1 = require("./auth.service");
// Configuración optimizada de Socket.IO
const SOCKET_CONFIG = {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    // Timeouts optimizados
    pingTimeout: 10000, // 10 segundos
    pingInterval: 5000, // 5 segundos  
    upgradeTimeout: 10000, // 10 segundos
    connectTimeout: 20000, // 20 segundos
    // Rendimiento
    transports: ['websocket', 'polling'],
    allowEIO3: false,
    maxHttpBufferSize: 1e6, // 1MB
    perMessageDeflate: {
        threshold: 1024 // Comprimir mensajes > 1KB
    }
};
/**
 * Servicio singleton para gestión centralizada de Socket.IO
 */
class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map();
        this.userSocketMap = new Map(); // userId -> socketId
        this.metrics = {
            totalConnections: 0,
            activeConnections: 0,
            messagesEmitted: 0,
            eventsReceived: 0
        };
    }
    /**
     * Obtener instancia singleton
     */
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    /**
     * Inicializar Socket.IO con el servidor HTTP
     */
    initialize(httpServer) {
        if (this.io) {
            logger_1.logger.warn('Socket.IO ya está inicializado');
            return this.io;
        }
        this.io = new socket_io_1.Server(httpServer, SOCKET_CONFIG);
        this.setupMiddleware();
        this.setupEventHandlers();
        this.startMetricsReporting();
        logger_1.logger.info('Socket.IO inicializado correctamente');
        return this.io;
    }
    /**
     * Configurar middleware de autenticación
     */
    setupMiddleware() {
        if (!this.io)
            return;
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Obtener token del handshake
                const token = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) ||
                    ((_b = socket.handshake.query) === null || _b === void 0 ? void 0 : _b.token);
                if (!token) {
                    logger_1.logger.debug('Socket.IO: Sin token de autenticación');
                    return next(new Error('No authentication token'));
                }
                // Limpiar token
                const cleanToken = token.replace('Bearer ', '');
                // Verificar token
                const decoded = token_service_1.TokenService.verifyAccessToken(cleanToken);
                if (!decoded) {
                    logger_1.logger.warn('Socket.IO: Token inválido');
                    return next(new Error('Invalid authentication token'));
                }
                // Obtener perfil del usuario
                const userProfile = yield auth_service_1.AuthService.getUserById(decoded.sub);
                if (!userProfile || !userProfile.is_active) {
                    logger_1.logger.warn('Socket.IO: Usuario no encontrado o inactivo');
                    return next(new Error('User not found or inactive'));
                }
                // Adjuntar datos del usuario al socket
                socket.userId = userProfile.id;
                socket.user = userProfile;
                logger_1.logger.info(`Socket.IO: Usuario autenticado: ${userProfile.username}`);
                next();
            }
            catch (error) {
                logger_1.logger.error('Socket.IO: Error de autenticación', error);
                next(new Error('Authentication failed'));
            }
        }));
    }
    /**
     * Configurar manejadores de eventos
     */
    setupEventHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            const user = socket.user;
            const userId = socket.userId;
            // Registrar conexión
            this.handleUserConnection(socket, user);
            // === EVENTOS DE CONVERSACIÓN ===
            socket.on('join_conversation', (conversationId) => {
                this.handleJoinConversation(socket, conversationId);
            });
            socket.on('leave_conversation', (conversationId) => {
                this.handleLeaveConversation(socket, conversationId);
            });
            // === EVENTOS DE MENSAJERÍA ===
            socket.on('send_message', (data) => {
                this.handleSendMessage(socket, data);
            });
            socket.on('message_status', (data) => {
                this.handleMessageStatus(socket, data);
            });
            socket.on('typing', (data) => {
                this.handleTyping(socket, data);
            });
            // === EVENTOS DE SISTEMA ===
            socket.on('ping', (data) => {
                this.handlePing(socket, data);
            });
            socket.on('disconnect', (reason) => {
                this.handleUserDisconnection(socket, reason);
            });
            socket.on('error', (error) => {
                logger_1.logger.error('Socket error', {
                    socketId: socket.id,
                    userId,
                    error: error.message
                });
            });
        });
    }
    /**
     * Manejar conexión de usuario
     */
    handleUserConnection(socket, user) {
        const socketUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            socketId: socket.id
        };
        this.connectedUsers.set(socket.id, socketUser);
        this.userSocketMap.set(user.id, socket.id);
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        logger_1.logger.info('Usuario conectado', {
            socketId: socket.id,
            username: user.username,
            activeConnections: this.metrics.activeConnections
        });
        // Notificar a otros usuarios
        socket.broadcast.emit('user_connected', {
            userId: user.id,
            username: user.username
        });
    }
    /**
     * Manejar desconexión de usuario
     */
    handleUserDisconnection(socket, reason) {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            this.connectedUsers.delete(socket.id);
            this.userSocketMap.delete(user.id);
            this.metrics.activeConnections--;
            logger_1.logger.info('Usuario desconectado', {
                socketId: socket.id,
                username: user.username,
                reason,
                activeConnections: this.metrics.activeConnections
            });
            // Notificar a otros usuarios
            socket.broadcast.emit('user_disconnected', {
                userId: user.id,
                username: user.username
            });
        }
    }
    /**
     * Unirse a una conversación
     */
    handleJoinConversation(socket, conversationId) {
        socket.join(conversationId);
        socket.emit('joined_conversation', { conversationId });
        logger_1.logger.debug('Socket unido a conversación', {
            socketId: socket.id,
            conversationId
        });
    }
    /**
     * Salir de una conversación
     */
    handleLeaveConversation(socket, conversationId) {
        socket.leave(conversationId);
        socket.emit('left_conversation', { conversationId });
        logger_1.logger.debug('Socket salió de conversación', {
            socketId: socket.id,
            conversationId
        });
    }
    /**
     * Manejar envío de mensaje
     */
    handleSendMessage(socket, data) {
        const user = socket.user;
        // Emitir a la conversación
        if (data.conversationId) {
            socket.to(data.conversationId).emit('new_message', Object.assign(Object.assign({}, data), { senderId: user.id, senderName: user.username, timestamp: new Date() }));
            this.metrics.messagesEmitted++;
        }
    }
    /**
     * Manejar actualización de estado de mensaje
     */
    handleMessageStatus(socket, data) {
        if (data.conversationId && data.messageId) {
            socket.to(data.conversationId).emit('message_status_update', data);
        }
    }
    /**
     * Manejar indicador de escritura
     */
    handleTyping(socket, data) {
        const user = socket.user;
        if (data.conversationId) {
            socket.to(data.conversationId).emit('user_typing', {
                conversationId: data.conversationId,
                userId: user.id,
                username: user.username,
                isTyping: data.isTyping
            });
        }
    }
    /**
     * Manejar ping para medición de latencia
     */
    handlePing(socket, data) {
        const now = Date.now();
        const latency = now - data.timestamp;
        if (latency > 2000) {
            logger_1.logger.warn('Latencia alta detectada', {
                latency,
                socketId: socket.id
            });
        }
        socket.emit('pong', { timestamp: now, latency });
    }
    // === MÉTODOS PÚBLICOS ===
    /**
     * Emitir evento global
     */
    emitGlobal(event, data) {
        if (!this.io) {
            logger_1.logger.warn('Socket.IO no inicializado, no se puede emitir evento global');
            return;
        }
        this.io.emit(event, data);
        this.metrics.messagesEmitted++;
    }
    /**
     * Emitir a una conversación específica
     */
    emitToConversation(conversationId, event, data) {
        if (!this.io) {
            logger_1.logger.warn('Socket.IO no inicializado, no se puede emitir a conversación');
            return;
        }
        this.io.to(conversationId).emit(event, data);
        this.metrics.messagesEmitted++;
        logger_1.logger.debug(`Evento '${event}' emitido a conversación ${conversationId}`);
    }
    /**
     * Emitir a un usuario específico
     */
    emitToUser(userId, event, data) {
        const socketId = this.userSocketMap.get(userId);
        if (!socketId || !this.io) {
            logger_1.logger.debug(`Usuario ${userId} no conectado, no se puede emitir evento`);
            return;
        }
        this.io.to(socketId).emit(event, data);
        this.metrics.messagesEmitted++;
    }
    /**
     * Emitir nuevo mensaje a conversación
     */
    emitNewMessage(message, conversationId) {
        this.emitToConversation(conversationId, 'new_message', {
            message,
            timestamp: new Date()
        });
    }
    /**
     * Emitir actualización de estado de mensaje
     */
    emitMessageStatus(conversationId, messageId, status) {
        this.emitToConversation(conversationId, 'message_status_update', {
            messageId,
            status,
            timestamp: new Date()
        });
    }
    /**
     * Obtener métricas del servicio
     */
    getMetrics() {
        return Object.assign(Object.assign({}, this.metrics), { connectedUsers: this.connectedUsers.size, rooms: this.io ? this.io.sockets.adapter.rooms.size : 0 });
    }
    /**
     * Obtener usuarios conectados
     */
    getConnectedUsers() {
        return Array.from(this.connectedUsers.values());
    }
    /**
     * Verificar si un usuario está conectado
     */
    isUserConnected(userId) {
        return this.userSocketMap.has(userId);
    }
    /**
     * Desconectar un usuario específico
     */
    disconnectUser(userId, reason = 'Manual disconnection') {
        const socketId = this.userSocketMap.get(userId);
        if (socketId && this.io) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect(true);
                logger_1.logger.info(`Usuario ${userId} desconectado manualmente: ${reason}`);
            }
        }
    }
    /**
     * Reportar métricas periódicamente
     */
    startMetricsReporting() {
        setInterval(() => {
            logger_1.logger.info('Socket.IO Metrics', this.getMetrics());
        }, 60000); // Cada minuto
    }
    /**
     * Limpiar conexiones inactivas
     */
    cleanupInactiveConnections() {
        if (!this.io)
            return;
        const now = Date.now();
        let cleaned = 0;
        this.io.sockets.sockets.forEach((socket) => {
            const lastActivity = socket.lastActivity || 0;
            const inactiveTime = now - lastActivity;
            if (inactiveTime > 300000) { // 5 minutos de inactividad
                socket.disconnect(true);
                cleaned++;
            }
        });
        if (cleaned > 0) {
            logger_1.logger.info(`Limpiadas ${cleaned} conexiones inactivas`);
        }
    }
    /**
     * Obtener instancia de Socket.IO (para compatibilidad)
     */
    getIO() {
        return this.io;
    }
}
exports.SocketService = SocketService;
// Exportar instancia singleton
exports.socketService = SocketService.getInstance();
