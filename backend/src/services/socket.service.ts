/**
 * Servicio centralizado de Socket.IO
 * Unifica todas las implementaciones de WebSocket en un solo lugar
 */
import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';

// Tipos para eventos de Socket
export interface SocketUser {
  id: string;
  username: string;
  role: string;
  socketId: string;
}

export interface SocketMessage {
  conversationId: string;
  message: any;
  timestamp: Date;
}

// Configuración optimizada de Socket.IO
const SOCKET_CONFIG = {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  // Timeouts optimizados
  pingTimeout: 10000,      // 10 segundos
  pingInterval: 5000,      // 5 segundos  
  upgradeTimeout: 10000,   // 10 segundos
  connectTimeout: 20000,   // 20 segundos
  // Rendimiento
  transports: ['websocket', 'polling'],
  allowEIO3: false,
  maxHttpBufferSize: 1e6,  // 1MB
  perMessageDeflate: {
    threshold: 1024       // Comprimir mensajes > 1KB
  }
};

/**
 * Servicio singleton para gestión centralizada de Socket.IO
 */
export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSocketMap: Map<string, string> = new Map(); // userId -> socketId
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesEmitted: 0,
    eventsReceived: 0
  };

  private constructor() {}

  /**
   * Obtener instancia singleton
   */
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Inicializar Socket.IO con el servidor HTTP
   */
  initialize(httpServer: HttpServer): Server {
    if (this.io) {
      logger.warn('Socket.IO ya está inicializado');
      return this.io;
    }

    this.io = new Server(httpServer, SOCKET_CONFIG as any);
    this.setupMiddleware();
    this.setupEventHandlers();
    this.startMetricsReporting();

    logger.info('Socket.IO inicializado correctamente');
    return this.io;
  }

  /**
   * Configurar middleware de autenticación
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        // Obtener token del handshake
        const token = socket.handshake.auth?.token || 
                     socket.handshake.query?.token as string;
        
        if (!token) {
          logger.debug('Socket.IO: Sin token de autenticación');
          return next(new Error('No authentication token'));
        }
        
        // Limpiar token
        const cleanToken = token.replace('Bearer ', '');
        
        // Verificar token
        const decoded = TokenService.verifyAccessToken(cleanToken);
        if (!decoded) {
          logger.warn('Socket.IO: Token inválido');
          return next(new Error('Invalid authentication token'));
        }
        
        // Obtener perfil del usuario
        const userProfile = await AuthService.getUserById(decoded.sub);
        if (!userProfile || !userProfile.is_active) {
          logger.warn('Socket.IO: Usuario no encontrado o inactivo');
          return next(new Error('User not found or inactive'));
        }
        
        // Adjuntar datos del usuario al socket
        (socket as any).userId = userProfile.id;
        (socket as any).user = userProfile;
        
        logger.info(`Socket.IO: Usuario autenticado: ${userProfile.username}`);
        next();
      } catch (error) {
        logger.error('Socket.IO: Error de autenticación', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Configurar manejadores de eventos
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const user = (socket as any).user;
      const userId = (socket as any).userId;

      // Registrar conexión
      this.handleUserConnection(socket, user);

      // === EVENTOS DE CONVERSACIÓN ===
      socket.on('join_conversation', (conversationId: string) => {
        this.handleJoinConversation(socket, conversationId);
      });

      socket.on('leave_conversation', (conversationId: string) => {
        this.handleLeaveConversation(socket, conversationId);
      });

      // === EVENTOS DE MENSAJERÍA ===
      socket.on('send_message', (data: any) => {
        this.handleSendMessage(socket, data);
      });

      socket.on('message_status', (data: any) => {
        this.handleMessageStatus(socket, data);
      });

      socket.on('typing', (data: any) => {
        this.handleTyping(socket, data);
      });

      // === EVENTOS DE SISTEMA ===
      socket.on('ping', (data: { timestamp: number }) => {
        this.handlePing(socket, data);
      });

      socket.on('disconnect', (reason: string) => {
        this.handleUserDisconnection(socket, reason);
      });

      socket.on('error', (error: Error) => {
        logger.error('Socket error', { 
          socketId: socket.id, 
          userId,
          error: error.message 
        } as any);
      });
    });
  }

  /**
   * Manejar conexión de usuario
   */
  private handleUserConnection(socket: Socket, user: any): void {
    const socketUser: SocketUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      socketId: socket.id
    };

    this.connectedUsers.set(socket.id, socketUser);
    this.userSocketMap.set(user.id, socket.id);
    
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    logger.info('Usuario conectado', {
      socketId: socket.id,
      username: user.username,
      activeConnections: this.metrics.activeConnections
    } as any);

    // Notificar a otros usuarios
    socket.broadcast.emit('user_connected', {
      userId: user.id,
      username: user.username
    });
  }

  /**
   * Manejar desconexión de usuario
   */
  private handleUserDisconnection(socket: Socket, reason: string): void {
    const user = this.connectedUsers.get(socket.id);
    
    if (user) {
      this.connectedUsers.delete(socket.id);
      this.userSocketMap.delete(user.id);
      this.metrics.activeConnections--;

      logger.info('Usuario desconectado', {
        socketId: socket.id,
        username: user.username,
        reason,
        activeConnections: this.metrics.activeConnections
      } as any);

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
  private handleJoinConversation(socket: Socket, conversationId: string): void {
    socket.join(conversationId);
    socket.emit('joined_conversation', { conversationId });
    
    logger.debug('Socket unido a conversación', {
      socketId: socket.id,
      conversationId
    });
  }

  /**
   * Salir de una conversación
   */
  private handleLeaveConversation(socket: Socket, conversationId: string): void {
    socket.leave(conversationId);
    socket.emit('left_conversation', { conversationId });
    
    logger.debug('Socket salió de conversación', {
      socketId: socket.id,
      conversationId
    });
  }

  /**
   * Manejar envío de mensaje
   */
  private handleSendMessage(socket: Socket, data: any): void {
    const user = (socket as any).user;
    
    // Emitir a la conversación
    if (data.conversationId) {
      socket.to(data.conversationId).emit('new_message', {
        ...data,
        senderId: user.id,
        senderName: user.username,
        timestamp: new Date()
      });
      
      this.metrics.messagesEmitted++;
    }
  }

  /**
   * Manejar actualización de estado de mensaje
   */
  private handleMessageStatus(socket: Socket, data: any): void {
    if (data.conversationId && data.messageId) {
      socket.to(data.conversationId).emit('message_status_update', data);
    }
  }

  /**
   * Manejar indicador de escritura
   */
  private handleTyping(socket: Socket, data: any): void {
    const user = (socket as any).user;
    
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
  private handlePing(socket: Socket, data: { timestamp: number }): void {
    const now = Date.now();
    const latency = now - data.timestamp;
    
    if (latency > 2000) {
      logger.warn('Latencia alta detectada', {
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
  emitGlobal(event: string, data: any): void {
    if (!this.io) {
      logger.warn('Socket.IO no inicializado, no se puede emitir evento global');
      return;
    }

    this.io.emit(event, data);
    this.metrics.messagesEmitted++;
  }

  /**
   * Emitir a una conversación específica
   */
  emitToConversation(conversationId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('Socket.IO no inicializado, no se puede emitir a conversación');
      return;
    }

    this.io.to(conversationId).emit(event, data);
    this.metrics.messagesEmitted++;
    
    logger.debug(`Evento '${event}' emitido a conversación ${conversationId}`);
  }

  /**
   * Emitir a un usuario específico
   */
  emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSocketMap.get(userId);
    
    if (!socketId || !this.io) {
      logger.debug(`Usuario ${userId} no conectado, no se puede emitir evento`);
      return;
    }

    this.io.to(socketId).emit(event, data);
    this.metrics.messagesEmitted++;
  }

  /**
   * Emitir nuevo mensaje a conversación
   */
  emitNewMessage(message: any, conversationId: string): void {
    this.emitToConversation(conversationId, 'new_message', {
      message,
      timestamp: new Date()
    });
  }

  /**
   * Emitir actualización de estado de mensaje
   */
  emitMessageStatus(conversationId: string, messageId: string, status: string): void {
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
    return {
      ...this.metrics,
      connectedUsers: this.connectedUsers.size,
      rooms: this.io ? this.io.sockets.adapter.rooms.size : 0
    };
  }

  /**
   * Obtener usuarios conectados
   */
  getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  /**
   * Desconectar un usuario específico
   */
  disconnectUser(userId: string, reason: string = 'Manual disconnection'): void {
    const socketId = this.userSocketMap.get(userId);
    
    if (socketId && this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info(`Usuario ${userId} desconectado manualmente: ${reason}`);
      }
    }
  }

  /**
   * Reportar métricas periódicamente
   */
  private startMetricsReporting(): void {
    setInterval(() => {
      logger.info('Socket.IO Metrics', this.getMetrics() as any);
    }, 60000); // Cada minuto
  }

  /**
   * Limpiar conexiones inactivas
   */
  cleanupInactiveConnections(): void {
    if (!this.io) return;

    const now = Date.now();
    let cleaned = 0;

    this.io.sockets.sockets.forEach((socket) => {
      const lastActivity = (socket as any).lastActivity || 0;
      const inactiveTime = now - lastActivity;
      
      if (inactiveTime > 300000) { // 5 minutos de inactividad
        socket.disconnect(true);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(`Limpiadas ${cleaned} conexiones inactivas`);
    }
  }

  /**
   * Obtener instancia de Socket.IO (para compatibilidad)
   */
  getIO(): Server | null {
    return this.io;
  }
}

// Exportar instancia singleton
export const socketService = SocketService.getInstance();
