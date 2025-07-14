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