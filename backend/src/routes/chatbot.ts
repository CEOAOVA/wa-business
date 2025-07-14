/**
 * Rutas del Chatbot para WhatsApp
 * Endpoints para generar respuestas con IA y enviarlas por WhatsApp
 */
import express from 'express';
import { chatbotService } from '../services/chatbot.service';
import { whatsappService } from '../services/whatsapp.service';

const router = express.Router();

/**
 * POST /api/chatbot/send-message
 * Generar respuesta con IA y enviarla por WhatsApp
 */
router.post('/send-message', async (req: any, res: any) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber y message son requeridos'
      });
    }

    console.log(`[ChatbotRouter] Procesando mensaje para ${phoneNumber}: ${message.substring(0, 50)}...`);

    // Generar respuesta con IA
    const chatbotResponse = await chatbotService.processWhatsAppMessage(phoneNumber, message);

    if (!chatbotResponse.shouldSend) {
      return res.json({
        success: true,
        message: 'Mensaje procesado pero no enviado',
        response: chatbotResponse.response,
        conversationState: chatbotResponse.conversationState
      });
    }

    // Enviar respuesta por WhatsApp
    const whatsappResult = await whatsappService.sendMessage({
      to: phoneNumber,
      message: chatbotResponse.response
    });

    return res.json({
      success: whatsappResult.success,
      message: whatsappResult.success ? 'Mensaje enviado exitosamente' : 'Error enviando mensaje',
      response: chatbotResponse.response,
      messageId: whatsappResult.messageId,
      conversationState: chatbotResponse.conversationState,
      error: whatsappResult.error || chatbotResponse.error
    });

  } catch (error: any) {
    console.error('[ChatbotRouter] Error en send-message:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/chatbot/process-webhook
 * Procesar mensaje entrante de WhatsApp webhook y generar respuesta automática
 */
router.post('/process-webhook', async (req: any, res: any) => {
  try {
    const { phoneNumber, message, contactName } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber y message son requeridos'
      });
    }

    console.log(`[ChatbotRouter] Procesando webhook para ${phoneNumber}: ${message.substring(0, 50)}...`);

    // Generar respuesta con IA
    const chatbotResponse = await chatbotService.processWhatsAppMessage(phoneNumber, message);

    if (!chatbotResponse.shouldSend) {
      return res.json({
        success: true,
        message: 'Mensaje procesado pero no enviado automáticamente',
        response: chatbotResponse.response,
        conversationState: chatbotResponse.conversationState
      });
    }

    // Enviar respuesta automática por WhatsApp
    const whatsappResult = await whatsappService.sendMessage({
      to: phoneNumber,
      message: chatbotResponse.response
    });

    return res.json({
      success: whatsappResult.success,
      message: whatsappResult.success ? 'Respuesta automática enviada' : 'Error enviando respuesta automática',
      response: chatbotResponse.response,
      messageId: whatsappResult.messageId,
      conversationState: chatbotResponse.conversationState,
      error: whatsappResult.error || chatbotResponse.error
    });

  } catch (error: any) {
    console.error('[ChatbotRouter] Error en process-webhook:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/chatbot/conversation/:phoneNumber
 * Obtener conversación por número de teléfono
 */
router.get('/conversation/:phoneNumber', async (req: any, res: any) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber es requerido'
      });
    }

    const conversation = chatbotService.getConversationByPhone(phoneNumber);

    if (!conversation) {
      return res.json({
        success: true,
        message: 'No se encontró conversación activa',
        conversation: null
      });
    }

    return res.json({
      success: true,
      conversation: {
        id: conversation.conversationId,
        phoneNumber: conversation.phoneNumber,
        status: conversation.status,
        clientInfo: conversation.clientInfo,
        messagesCount: conversation.messages.length,
        createdAt: conversation.createdAt,
        lastActivity: conversation.lastActivity
      }
    });

  } catch (error: any) {
    console.error('[ChatbotRouter] Error obteniendo conversación:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/chatbot/stats
 * Obtener estadísticas del chatbot
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const stats = chatbotService.getStats();

    return res.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date(),
        uptime: process.uptime()
      }
    });

  } catch (error: any) {
    console.error('[ChatbotRouter] Error obteniendo estadísticas:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/chatbot/test-ai
 * Probar respuesta de IA sin enviar por WhatsApp
 */
router.post('/test-ai', async (req: any, res: any) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber y message son requeridos'
      });
    }

    console.log(`[ChatbotRouter] Prueba de IA para ${phoneNumber}: ${message.substring(0, 50)}...`);

    // Generar respuesta con IA sin enviar
    const chatbotResponse = await chatbotService.processWhatsAppMessage(phoneNumber, message);

    return res.json({
      success: true,
      message: 'Respuesta generada exitosamente',
      response: chatbotResponse.response,
      conversationState: chatbotResponse.conversationState,
      error: chatbotResponse.error
    });

  } catch (error: any) {
    console.error('[ChatbotRouter] Error en test-ai:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

export default router; 