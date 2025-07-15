import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chat';
import contactRoutes from './routes/contacts';
import mediaRoutes from './routes/media-upload';
import chatbotRoutes from './routes/chatbot';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import { whatsappConfig } from './config/whatsapp';
import { whatsappService } from './services/whatsapp.service';
import { applySecurity } from './middleware/security';
import { authRateLimit } from './middleware/security';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = whatsappConfig.server.port;

// Aplicar configuración de seguridad ANTES de cualquier otra cosa
applySecurity(app);

// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: whatsappConfig.server.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware para parsing JSON
app.use(express.json());

// Middleware para hacer disponible io en las rutas
app.use((req, res, next) => {
  (req as any).io = io;
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
app.use('/api/auth', authRateLimit, authRoutes);

// Rutas de WhatsApp Chat
app.use('/api/chat', chatRoutes);

// Rutas de gestión de contactos
app.use('/api/contacts', contactRoutes);

// Rutas de multimedia
app.use('/api/media', mediaRoutes);

// Rutas del chatbot con IA
app.use('/api/chatbot', chatbotRoutes);

// Rutas del dashboard
app.use('/api/dashboard', dashboardRoutes);

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

// Función para inicializar la aplicación
async function startServer() {
  try {
    // Inicializar servicios con Socket.IO
    await whatsappService.initialize(io);
    
    // Iniciar servidor
    httpServer.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp API ready at http://localhost:${PORT}/api/chat`);
      console.log(`💾 Base de datos SQLite conectada`);
      console.log(`🔧 Variables de entorno cargadas desde .env`);
      console.log(`🌐 WebSocket server ready for real-time messaging`);
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  httpServer.close();
  process.exit(0);
});

// Exportar io para usar en otros módulos
export { io };

// Iniciar servidor
startServer(); 