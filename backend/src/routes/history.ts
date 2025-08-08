/**
 * Rutas para historial de mensajes con paginación optimizada
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-jwt';
import { databaseService } from '../services/database.service';
import { logger } from '../utils/logger';
import { param, query, validationResult } from 'express-validator';

const router = Router();

// Constantes para paginación
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/history/conversations/:conversationId/messages
 * Obtener historial paginado de mensajes de una conversación
 */
router.get('/conversations/:conversationId/messages',
  authMiddleware,
  ([
    param('conversationId').isUUID().withMessage('ID de conversación inválido'),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    query('before').optional().isISO8601().withMessage('Formato de fecha inválido'),
    query('after').optional().isISO8601().withMessage('Formato de fecha inválido'),
    query('cursor').optional().isString()
  ] as any),
  async (req: any, res: any) => {
    try {
      // Validar entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { conversationId } = req.params;
      const limit = req.query.limit || DEFAULT_LIMIT;
      const before = req.query.before;
      const after = req.query.after;
      const cursor = req.query.cursor;

      logger.debug('Obteniendo historial de mensajes', {
        conversationId,
        limit,
        before,
        after,
        cursor
      });

      // Construir query base
      // Adaptado al nuevo servicio: usar supabaseDatabaseService a través de métodos de alto nivel
      // Mantener nombres de variables para mínima intrusión
      let query = (databaseService as any).supabase
        .from('messages')
        .select(`
          id,
          wa_message_id,
          conversation_id,
          content,
          from_number,
          to_number,
          message_type,
          status,
          media_url,
          media_type,
          created_at,
          updated_at,
          is_from_me,
          contact:contacts!messages_from_number_fkey(
            id,
            phone_number,
            full_name,
            is_verified
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Aplicar filtros de cursor
      if (cursor) {
        // Decodificar cursor (es el ID del último mensaje)
        query = query.lt('created_at', cursor);
      }

      // Aplicar filtros de fecha
      if (before) {
        query = query.lt('created_at', before);
      }
      if (after) {
        query = query.gt('created_at', after);
      }

      const { data: messages, error } = await query;

      if (error) {
        logger.error('Error obteniendo historial', error);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener historial de mensajes'
        });
      }

      // Calcular siguiente cursor
      const hasMore = messages.length === limit;
      const nextCursor = hasMore && messages.length > 0 
        ? messages[messages.length - 1].created_at 
        : null;

      // Formatear respuesta
      const formattedMessages = messages.map((msg: any) => ({
        id: msg.id,
        waMessageId: msg.wa_message_id,
        conversationId: msg.conversation_id,
        content: msg.content,
        from: msg.from_number,
        to: msg.to_number,
        type: msg.message_type,
        status: msg.status,
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        timestamp: msg.created_at,
        isFromMe: msg.is_from_me,
        contact: msg.contact ? {
          id: msg.contact.id,
          phoneNumber: msg.contact.phone_number,
          name: msg.contact.full_name,
          isVerified: msg.contact.is_verified
        } : null
      }));

      res.json({
        success: true,
        data: {
          messages: formattedMessages.reverse(), // Orden cronológico
          pagination: {
            limit,
            hasMore,
            nextCursor,
            totalReturned: messages.length
          }
        }
      });

    } catch (error: any) {
      logger.error('Error en endpoint de historial', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * GET /api/history/conversations/:conversationId/summary
 * Obtener resumen de la conversación
 */
router.get('/conversations/:conversationId/summary',
  authMiddleware,
  ([
    param('conversationId').isUUID().withMessage('ID de conversación inválido')
  ] as any),
  async (req: any, res: any) => {
    try {
      const { conversationId } = req.params;

      // Obtener información de la conversación
      const { data: conversation, error: convError } = await (databaseService as any).supabase
        .from('conversations')
        .select(`
          id,
          phone_number,
          status,
          last_message_at,
          created_at,
          updated_at,
          contact:contacts!conversations_phone_number_fkey(
            id,
            phone_number,
            full_name,
            is_verified
          )
        `)
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversación no encontrada'
        });
      }

      // Obtener estadísticas
      const { count: totalMessages } = await (databaseService as any).supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

      const { count: unreadMessages } = await (databaseService as any).supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('status', 'received')
        .eq('is_from_me', false);

      // Obtener último mensaje
      const { data: lastMessage } = await (databaseService as any).supabase
        .from('messages')
        .select('content, created_at, is_from_me')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      res.json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            phoneNumber: conversation.phone_number,
            status: conversation.status,
            lastMessageAt: conversation.last_message_at,
            createdAt: conversation.created_at,
            contact: conversation.contact ? {
              id: conversation.contact.id,
              phoneNumber: conversation.contact.phone_number,
              name: conversation.contact.full_name,
              isVerified: conversation.contact.is_verified
            } : null
          },
          statistics: {
            totalMessages: totalMessages || 0,
            unreadMessages: unreadMessages || 0
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.created_at,
            isFromMe: lastMessage.is_from_me
          } : null
        }
      });

    } catch (error: any) {
      logger.error('Error obteniendo resumen de conversación', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * GET /api/history/search
 * Buscar mensajes en todas las conversaciones
 */
router.get('/search',
  authMiddleware,
  ([
    query('q').notEmpty().withMessage('Término de búsqueda requerido'),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    query('conversationId').optional().isUUID()
  ] as any),
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { q, conversationId } = req.query;
      const limit = req.query.limit || DEFAULT_LIMIT;

      let query = (databaseService as any).supabase
        .from('messages')
        .select(`
          id,
          wa_message_id,
          conversation_id,
          content,
          from_number,
          to_number,
          created_at,
          conversation:conversations!messages_conversation_id_fkey(
            id,
            phone_number,
            contact:contacts!conversations_phone_number_fkey(
              full_name
            )
          )
        `)
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      const { data: messages, error } = await query;

      if (error) {
        logger.error('Error buscando mensajes', error);
        return res.status(500).json({
          success: false,
          error: 'Error al buscar mensajes'
        });
      }

      res.json({
        success: true,
        data: {
          query: q,
          results: messages.map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversation_id,
            content: msg.content,
            from: msg.from_number,
            to: msg.to_number,
            timestamp: msg.created_at,
            conversation: {
              id: msg.conversation.id,
              phoneNumber: msg.conversation.phone_number,
              contactName: msg.conversation.contact?.full_name || 'Sin nombre'
            }
          })),
          totalResults: messages.length
        }
      });

    } catch (error: any) {
      logger.error('Error en búsqueda', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

export default router;
