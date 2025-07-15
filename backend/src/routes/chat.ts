import express from 'express';
import { whatsappService } from '../services/whatsapp.service';
import { webhookSecurity, securityLogger, SecureRequest } from '../middleware/webhook-security';

const router = express.Router();

// POST /api/chat/send - Enviar mensaje de texto
router.post('/send', async (req: any, res: any) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "to" y "message" son requeridos'
      });
    }

    const phoneValidation = whatsappService.validatePhoneNumber(to);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error
      });
    }

    const result = await whatsappService.sendMessage({
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
    } else {
      res.status(500).json({
        success: false,
        error: 'Error enviando mensaje',
        details: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// POST /api/chat/template - Enviar template
router.post('/template', async (req: any, res: any) => {
  try {
    const { to, template, language = 'es' } = req.body;
    if (!to || !template) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "to" y "template" son requeridos'
      });
    }

    const phoneValidation = whatsappService.validatePhoneNumber(to);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error
      });
    }

    const result = await whatsappService.sendTemplate({
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
    } else {
      res.status(500).json({
        success: false,
        error: 'Error enviando template',
        details: result.error
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/chat/status - Estado de configuración
router.get('/status', (req: any, res: any) => {
  try {
    const status = whatsappService.getStatus();
    
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
    
    res.json({
      ...status,
      security: securityStatus
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo status'
    });
  }
});

// GET /api/chat/info - Información del número
router.get('/info', async (req: any, res: any) => {
  try {
    const result = await whatsappService.getPhoneNumberInfo();
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error obteniendo información del número'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// POST /api/chat/test - Endpoint de prueba
router.post('/test', async (req: any, res: any) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Los campos "to" y "message" son requeridos'
      });
    }
    const result = await whatsappService.sendMessage({ to, message });
    res.json({
      success: true,
      message: 'Prueba ejecutada',
      testResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error en la prueba'
    });
  }
});

// GET /api/chat/webhook - Verificación del webhook
router.get('/webhook', (req: any, res: any) => {
  try {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const result = whatsappService.verifyWebhook(mode, token, challenge);
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Token de verificación incorrecto');
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error en verificación de webhook'
    });
  }
});

// POST /api/chat/webhook - Recibir mensajes (con seguridad integrada)
router.post('/webhook', async (req: any, res: any) => {
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
    } else {
      // En producción, log resumido por seguridad
      console.log(`📊 [${requestId}] Webhook: ${object}, entries: ${entry.length}, UA: ${userAgent.substring(0, 50)}`);
    }

    const result = await whatsappService.processWebhook(req.body);
    
    console.log(`✅ [${requestId}] Webhook procesado exitosamente: ${result.processed} mensajes`);
    
    res.status(200).json({
      success: true,
      processed: result.processed,
      messages: result.messages.length // Solo enviar count por seguridad
    });
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error procesando webhook:`, error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error processing webhook',
      requestId // Para debugging
    });
  }
});

// ============================================
// NUEVAS RUTAS PARA TAKEOVER Y RESÚMENES
// ============================================

// POST /api/chat/conversations/:id/set-mode - Cambiar modo de IA (takeover)
router.post('/conversations/:id/set-mode', async (req: any, res: any) => {
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

    console.log(`🤖 [Takeover] Cambiando modo IA: ${conversationId} -> ${mode}`, 
      mode === 'inactive' ? `(Agente: ${agentId})` : '');

    // TODO: IMPLEMENTAR CON SUPABASE
    // const result = await databaseService.setConversationAIMode(conversationId, mode, agentId);
    
    // IMPLEMENTACIÓN TEMPORAL CON PRISMA (mientras no hay Supabase)
    // Por ahora simulamos la respuesta exitosa
    const result = { success: true };
    
    if (result.success) {
      // Emitir evento WebSocket para notificar cambio en tiempo real
      whatsappService.emitSocketEvent('conversation_ai_mode_changed', {
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
    } else {
      res.status(500).json({
        success: false,
        error: 'Error actualizando modo IA'
      });
    }
  } catch (error: any) {
    console.error('[Takeover] Error en set-mode:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/chat/conversations/:id/mode - Obtener modo actual de IA
router.get('/conversations/:id/mode', async (req: any, res: any) => {
  try {
    const { id: conversationId } = req.params;

    console.log(`🔍 [Takeover] Consultando modo IA para: ${conversationId}`);

    // TODO: IMPLEMENTAR CON SUPABASE
    // const result = await databaseService.getConversationAIMode(conversationId);
    
    // IMPLEMENTACIÓN TEMPORAL
    const result = {
      aiMode: 'active' as 'active' | 'inactive',
      assignedAgentId: null
    };
    
    if (result) {
      res.json({
        success: true,
        conversationId,
        aiMode: result.aiMode,
        assignedAgentId: result.assignedAgentId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }
  } catch (error: any) {
    console.error('[Takeover] Error obteniendo modo IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /api/chat/conversations/:id/summary - Generar resumen de conversación
router.get('/conversations/:id/summary', async (req: any, res: any) => {
  try {
    const { id: conversationId } = req.params;
    const { forceRegenerate } = req.query;

    console.log(`📝 [Summary] Generando resumen para: ${conversationId}`, 
      forceRegenerate ? '(Forzar regeneración)' : '');

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
    const summary = await chatbotService.generateConversationSummary(conversationId, messages);

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

  } catch (error: any) {
    console.error('[Summary] Error generando resumen:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error generando resumen de conversación'
    });
  }
});

// GET /api/chat/conversations/:id/messages - Obtener historial de mensajes
router.get('/conversations/:id/messages', async (req: any, res: any) => {
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

  } catch (error: any) {
    console.error('[Messages] Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de mensajes'
    });
  }
});

// GET /api/chat/conversations - Obtener conversaciones
router.get('/conversations', async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await whatsappService.getConversations(limit, offset);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo conversaciones',
      details: error.message
    });
  }
});

// GET /api/chat/conversations/:id/messages - Obtener mensajes de una conversación
router.get('/conversations/:id/messages', async (req: any, res: any) => {
  try {
    const conversationId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await whatsappService.getConversationMessages(conversationId, limit, offset);
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes de conversación',
      details: error.message
    });
  }
});

// GET /api/chat/messages - Mantener compatibilidad (deprecado)
router.get('/messages', async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await whatsappService.getConversations(limit, offset);
    
    // Convertir a formato legacy
    const legacyFormat = {
      success: true,
      messages: result.conversations?.map((conv: any) => ({
        id: conv.lastMessage?.id || conv.id,
        from: conv.contactWaId,
        message: conv.lastMessage?.content || '',
        timestamp: conv.lastMessage?.timestamp || conv.updatedAt,
        contact: {
          name: conv.contactName,
          wa_id: conv.contactWaId
        },
        read: conv.unreadCount === 0
      })) || [],
      total: result.total || 0,
      unread: result.unread || 0
    };
    
    res.json(legacyFormat);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo mensajes',
      details: error.message
    });
  }
});

// PUT /api/chat/messages/:messageId/read - Marcar mensaje como leído
router.put('/messages/:messageId/read', async (req: any, res: any) => {
  try {
    const { messageId } = req.params;
    const result = await whatsappService.markMessageAsRead(messageId);
    
    if (result) {
      res.json({
        success: true,
        message: 'Mensaje marcado como leído'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Mensaje no encontrado'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error marcando mensaje como leído',
      details: error.message
    });
  }
});

// PUT /api/chat/conversations/:conversationId/read - Marcar conversación como leída
router.put('/conversations/:conversationId/read', async (req: any, res: any) => {
  try {
    const { conversationId } = req.params;
    const result = await whatsappService.markConversationAsRead(conversationId);
    
    if (result) {
      res.json({
        success: true,
        message: 'Conversación marcada como leída'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error marcando conversación como leída',
      details: error.message
    });
  }
});

// DELETE /api/chat/messages/cleanup - Limpiar mensajes antiguos
router.delete('/messages/cleanup', async (req: any, res: any) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const removedCount = await whatsappService.clearOldMessages(hours);
    
    res.json({
      success: true,
      message: `${removedCount} mensajes eliminados`,
      removedCount
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error limpiando mensajes',
      details: error.message
    });
  }
});

// DELETE /api/chat/messages/clear-all - Limpiar TODOS los mensajes
router.delete('/messages/clear-all', async (req: any, res: any) => {
  try {
    const removedCount = await whatsappService.clearAllMessages();
    
    res.json({
      success: true,
      message: `LIMPIEZA TOTAL: ${removedCount} mensajes eliminados`,
      removedCount
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error limpiando mensajes',
      details: error.message
    });
  }
});

// GET /api/chat/stats - Obtener estadísticas
router.get('/stats', async (req: any, res: any) => {
  try {
    const result = await whatsappService.getStats();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

// POST /api/chat/simulate-message - Simular mensaje entrante (para pruebas)
router.post('/simulate-message', async (req: any, res: any) => {
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
    const result = await whatsappService.processWebhook(simulatedWebhook);
    
    res.json({
      success: true,
      message: 'Mensaje simulado procesado',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error simulando mensaje',
      details: error.message
    });
  }
});

// POST /api/chat/webhook/config - Configurar webhook
router.post('/webhook/config', async (req: any, res: any) => {
  try {
    const { callbackUrl } = req.body;
    if (!callbackUrl) {
      return res.status(400).json({
        success: false,
        error: 'El campo "callbackUrl" es requerido'
      });
    }

    const result = await whatsappService.setWebhookUrl(callbackUrl);
    if (result.success) {
      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        callbackUrl
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error configurando webhook'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router; 