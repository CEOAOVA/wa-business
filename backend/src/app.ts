import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { logger, logHelper } from './config/logger';
import { memoryMonitor } from './services/monitoring/memory-monitor';
import { performanceMonitor } from './services/monitoring/performance-metrics';
import { loadEnvWithUnicodeSupport } from './config/env-loader';
import { whatsappConfig } from './config/whatsapp';
import { applySecurity } from './config/security';
import { authRateLimit, whatsappRateLimit } from './config/rate-limits';
import { whatsappService } from './services/whatsapp.service';
import { sessionCleanupService } from './services/session-cleanup.service';
import { failedMessageRetryService } from './services/failed-message-retry.service';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Importar rutas
import chatRoutes from './routes/chat';
import contactRoutes from './routes/contacts';
import mediaRoutes from './routes/media';
import chatbotRoutes from './routes/chatbot';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import monitoringRoutes from './routes/monitoring';
import healthRoutes from './routes/health';
import queueRoutes from './routes/queue'; // ✅ AGREGADO: Rutas de cola

// Cargar variables de entorno con soporte Unicode
loadEnvWithUnicodeSupport();

// Debug de variables de entorno
logger.debug('Estado de variables de entorno');

const app = express();
const httpServer = createServer(app);
const PORT = whatsappConfig.server.port;

// Configurar trust proxy para Docker/Coolify (ANTES de seguridad)
app.set('trust proxy', true);

// Aplicar configuración de seguridad ANTES de cualquier otra cosa
applySecurity(app);

// ✅ CONFIGURACIÓN OPTIMIZADA DE SOCKET.IO - IMPLEMENTADO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  // 🚀 OPTIMIZACIONES DE RENDIMIENTO - APLICADAS
  transports: ['websocket', 'polling'], // Polling habilitado como fallback
  allowEIO3: false, // Deshabilitar versión antigua
  pingTimeout: 10000, // ⚡ OPTIMIZADO: 10 segundos (era 30)
  pingInterval: 5000, // ⚡ OPTIMIZADO: 5 segundos (era 25)
  upgradeTimeout: 10000, // ⚡ OPTIMIZADO: 10 segundos
  maxHttpBufferSize: 1e6, // ⚡ OPTIMIZADO: 1MB
  connectTimeout: 20000, // ⚡ OPTIMIZADO: 20 segundos (era 45)
  // 📊 Configuración de compresión
  perMessageDeflate: {
    threshold: 1024 // Comprimir mensajes > 1KB
  },
  // Validación rápida de token
  allowRequest: (req, callback) => {
    const token = req.headers.authorization || (req as any)._query?.token;
    const isValid = token && token.length > 50;
    callback(null, isValid);
  }
});

// Middleware de autenticación para Socket.IO con JWT manual
io.use(async (socket, next) => {
  try {
    // Obtener token del handshake
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token as string;
    
    console.log('🔍 [Socket.IO Auth] Verificando conexión con JWT manual...');
    
    if (!token) {
      console.log('❌ Socket.IO: Sin token de autenticación');
      return next(new Error('No authentication token'));
    }
    
    console.log('🔐 Token recibido (primeros 30 chars):', token.substring(0, 30) + '...');
    
    // Limpiar token (remover "Bearer " si existe)
    const cleanToken = token.replace('Bearer ', '');
    
    // Validar JWT token generado por nuestro sistema
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const { AuthService } = require('./services/auth.service');
    
    try {
      // Verificar y decodificar el token JWT
      const decoded = jwt.verify(cleanToken, jwtSecret);
      console.log('✅ [Socket.IO] Token JWT válido, datos decodificados:', {
        sub: decoded.sub,
        username: decoded.username,
        role: decoded.role
      });

      // Obtener perfil del usuario desde la base de datos
      const userProfile = await AuthService.getUserById(decoded.sub);
      
      if (!userProfile) {
        console.log('❌ Socket.IO: Perfil de usuario no encontrado:', decoded.sub);
        return next(new Error('User profile not found'));
      }

      if (!userProfile.is_active) {
        console.log('❌ Socket.IO: Usuario inactivo:', userProfile.username);
        return next(new Error('Inactive user'));
      }
      
      console.log('✅ Socket.IO: Usuario autenticado:', userProfile.username);
      
      // Adjuntar usuario al socket
      (socket as any).userId = userProfile.id;
      (socket as any).userEmail = userProfile.email;
      (socket as any).userName = userProfile.username;
      (socket as any).userRole = userProfile.role;
      
      next();
    } catch (jwtError: any) {
      console.log('❌ Socket.IO: Token JWT inválido:', jwtError.message);
      return next(new Error('Invalid or expired JWT token'));
    }
    
  } catch (error) {
    console.error('❌ Socket.IO: Error general en autenticación:', error);
    next(new Error('Authentication error'));
  }
});

// Middleware para parsing JSON
app.use(express.json());

// Middleware para hacer disponible io en las rutas
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Configurar eventos de Socket.IO optimizados para tiempo real
io.on('connection', (socket) => {
  logHelper.socketConnection(socket.id);

  // Unirse a una conversación específica
  socket.on('join_conversation', (conversationId: string) => {
    logger.debug('Cliente uniéndose a conversación', { socketId: socket.id, conversationId });
    socket.join(conversationId);
    socket.emit('joined_conversation', { conversationId });
  });

  // Salir de una conversación
  socket.on('leave_conversation', (conversationId: string) => {
    logger.debug('Cliente saliendo de conversación', { socketId: socket.id, conversationId });
    socket.leave(conversationId);
    socket.emit('left_conversation', { conversationId });
  });

  // Heartbeat optimizado con métricas de latencia
  socket.on('ping', (data: { timestamp: number }) => {
    const now = Date.now();
    const latency = now - data.timestamp;
    
    // SOLO log si latencia es alta (> 2 segundos)
    if (latency > 2000) {
      logger.warn('Latencia alta detectada', { latency: `${latency}ms`, socketId: socket.id });
    }
    
    // Emitir respuesta con timestamp actual
    socket.emit('pong', { timestamp: now });
  });

  // Manejar desconexión
  socket.on('disconnect', (reason) => {
    logHelper.socketDisconnection(socket.id, reason);
  });

  // Manejar errores de socket
  socket.on('error', (error) => {
    logger.error('Error en socket', { socketId: socket.id, error: error.message });
  });
});

// NUEVO: Limpieza periódica de conexiones inactivas
setInterval(() => {
  const rooms = io.sockets.adapter.rooms;
  let inactiveCount = 0;
  
  rooms.forEach((room, roomId) => {
    if (room.size === 0) {
      io.in(roomId).disconnectSockets();
      inactiveCount++;
    }
  });
  
  if (inactiveCount > 0) {
    logHelper.memoryCleanup('socket_rooms', inactiveCount);
  }
}, 300000); // Cada 5 minutos

// Rutas principales
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de autenticación (con rate limiting específico)
app.use('/api/auth', authRateLimit, authRoutes);

// Rutas de WhatsApp Chat
app.use('/api/chat', whatsappRateLimit, chatRoutes);

// Rutas de gestión de contactos
app.use('/api/contacts', contactRoutes);

// Rutas de multimedia
app.use('/api/media', mediaRoutes);

// Rutas del chatbot con IA
app.use('/api/chatbot', chatbotRoutes);

// Rutas del dashboard
app.use('/api/dashboard', dashboardRoutes);

// Rutas de monitoreo
app.use('/api/monitoring', monitoringRoutes);

// Rutas de colas (Bull Queue) ✅ AGREGADO
app.use('/api/queue', queueRoutes);

// Rutas de health check
app.use('/api', healthRoutes);

// NUEVO: Rutas de logging para el frontend con structured logging
app.post('/api/logging/batch', (req, res) => {
  try {
    const logs = req.body;
    if (Array.isArray(logs)) {
      logs.forEach(log => {
        logger.info('Frontend Log', {
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          data: log.data,
          source: 'frontend'
        });
      });
    }
    res.json({ success: true, message: 'Logs received', count: logs.length });
  } catch (error) {
    logger.error('Error processing frontend logs:', error);
    res.status(500).json({ success: false, error: 'Failed to process logs' });
  }
});

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

// Middleware para manejar rutas no encontradas (debe ir antes del error handler)
app.use(notFoundHandler);

// Middleware global de manejo de errores (debe ser el último middleware)
app.use(errorHandler);

// Función para limpiar sesiones al inicio
async function cleanupSessionsOnStartup() {
  try {
    logger.info('Iniciando limpieza de sesiones al arranque');
    
    // Importar servicios que necesitan limpieza
    const { rateLimiter } = await import('./services/rate-limiter/rate-limiter');
    const { cacheService } = await import('./services/cache/cache-service');
    
    // Limpiar rate limiter
    if (rateLimiter) {
      rateLimiter.destroy();
      logger.info('Rate limiter limpiado');
    }
    
    // Limpiar caché
    if (cacheService) {
      cacheService.destroy();
      logger.info('Cache service limpiado');
    }
    
    // Limpiar conversaciones del chatbot
    const { ChatbotService } = await import('./services/chatbot.service');
    const chatbotService = new ChatbotService();
    if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
      chatbotService['cleanupExpiredSessions']();
      logger.info('Chatbot sessions limpiadas');
    }
    
    // Limpiar conversaciones generales
    const { ConversationService } = await import('./services/conversation/conversation-service');
    const conversationService = new ConversationService();
    if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
      const removedCount = conversationService['cleanupInactiveSessions'](0); // Limpiar todas las sesiones
      logger.info(`${removedCount} conversaciones inactivas limpiadas`);
    }
    
    // Limpiar caché de inventario
    const { InventoryCache } = await import('./services/soap/inventory-cache');
    const inventoryCache = new InventoryCache();
    if (inventoryCache && typeof inventoryCache.clear === 'function') {
      inventoryCache.clear();
      logger.info('Inventory cache limpiado');
    }
    
    logger.info('Limpieza de sesiones completada al arranque');
  } catch (error) {
    logger.error('Error durante la limpieza de sesiones', { error: String(error) });
    // No fallar el arranque por errores de limpieza
  }
}

// Función para inicializar la aplicación
async function startServer() {
  try {
    // Limpiar sesiones al inicio
    await cleanupSessionsOnStartup();
    
    // Inicializar servicios con Socket.IO
    await whatsappService.initialize(io);

    // Inicializar servicios al arrancar la aplicación
    logger.info('Inicializando servicios');

    // Inicializar servicio de limpieza de sesiones
    try {
      const stats = sessionCleanupService.getServiceStats();
      logger.info('Servicio de limpieza de sesiones inicializado', {
        isRunning: stats.isRunning
      });
    } catch (error) {
      logger.error('Error inicializando servicio de limpieza de sesiones', { error: String(error) });
    }

    // Inicializar performance monitor
    try {
      performanceMonitor.startMonitoring(parseInt(process.env.PERFORMANCE_MONITOR_INTERVAL || '60000'));
      
      // Configurar event listeners para alerts
      performanceMonitor.on('critical_threshold_exceeded', (data) => {
        logger.error('🚨 CRÍTICO: Threshold excedido', data);
        // Aquí se podría implementar notificaciones urgentes
      });
      
      performanceMonitor.on('warning_threshold_exceeded', (data) => {
        logger.warn('⚠️ ADVERTENCIA: Threshold excedido', data);
      });
      
      performanceMonitor.on('alert', (data) => {
        logger.warn('🚨 ALERTA: Métrica crítica', data);
        // Aquí se podría implementar notificaciones
      });
      
      logger.info('Performance monitor inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando performance monitor', { error: String(error) });
    }

    // Inicializar memory monitor
    try {
      const memoryStats = memoryMonitor.getMemoryStats();
      logger.info('Memory monitor inicializado', {
        isMonitoring: memoryStats.isMonitoring,
        warningThreshold: `${memoryStats.warningThreshold}%`,
        criticalThreshold: `${memoryStats.criticalThreshold}%`
      });
    } catch (error) {
      logger.error('Error inicializando memory monitor', { error: String(error) });
    }

    // FASE 3: Inicializar servicio de retry de mensajes fallidos
    try {
      failedMessageRetryService.startAutoRetry();
      logger.info('🔄 Servicio de retry de mensajes fallidos inicializado');
    } catch (error) {
      logger.error('Error inicializando servicio de retry', { error: String(error) });
    }
    
    // Iniciar servidor
    httpServer.listen(PORT, () => {
      logHelper.appStart(PORT);
      logger.info('Backend iniciado correctamente', { 
        port: PORT,
        environment: process.env.NODE_ENV,
        memoryMonitoring: memoryMonitor.getMemoryStats().isMonitoring
      });
    });
  } catch (error) {
    logger.error('Error iniciando el servidor', { error: String(error) });
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  logger.info('Cerrando servidor (SIGINT)');
  try {
    performanceMonitor.destroy();
    memoryMonitor.destroy();
    failedMessageRetryService.destroy();
    httpServer.close();
  } catch (error) {
    logger.error('Error durante cleanup', { error: String(error) });
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Cerrando servidor (SIGTERM)');
  try {
    performanceMonitor.destroy();
    memoryMonitor.destroy();
    failedMessageRetryService.destroy();
    httpServer.close();
  } catch (error) {
    logger.error('Error durante cleanup', { error: String(error) });
  }
  process.exit(0);
});

// Exportar io para usar en otros módulos
export { io };

// Iniciar servidor
startServer(); 