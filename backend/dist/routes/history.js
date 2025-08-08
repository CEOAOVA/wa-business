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
/**
 * Rutas para historial de mensajes con paginación optimizada
 */
const express_1 = require("express");
const auth_jwt_1 = require("../middleware/auth-jwt");
const database_service_1 = require("../services/database.service");
const logger_1 = require("../utils/logger");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Constantes para paginación
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
/**
 * GET /api/history/conversations/:conversationId/messages
 * Obtener historial paginado de mensajes de una conversación
 */
router.get('/conversations/:conversationId/messages', auth_jwt_1.authMiddleware, [
    (0, express_validator_1.param)('conversationId').isUUID().withMessage('ID de conversación inválido'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    (0, express_validator_1.query)('before').optional().isISO8601().withMessage('Formato de fecha inválido'),
    (0, express_validator_1.query)('after').optional().isISO8601().withMessage('Formato de fecha inválido'),
    (0, express_validator_1.query)('cursor').optional().isString()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validar entrada
        const errors = (0, express_validator_1.validationResult)(req);
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
        logger_1.logger.debug('Obteniendo historial de mensajes', {
            conversationId,
            limit,
            before,
            after,
            cursor
        });
        // Construir query base
        // Adaptado al nuevo servicio: usar supabaseDatabaseService a través de métodos de alto nivel
        // Mantener nombres de variables para mínima intrusión
        let query = database_service_1.databaseService.supabase
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
        const { data: messages, error } = yield query;
        if (error) {
            logger_1.logger.error('Error obteniendo historial', error);
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
        const formattedMessages = messages.map((msg) => ({
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
    }
    catch (error) {
        logger_1.logger.error('Error en endpoint de historial', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
/**
 * GET /api/history/conversations/:conversationId/summary
 * Obtener resumen de la conversación
 */
router.get('/conversations/:conversationId/summary', auth_jwt_1.authMiddleware, [
    (0, express_validator_1.param)('conversationId').isUUID().withMessage('ID de conversación inválido')
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { conversationId } = req.params;
        // Obtener información de la conversación
        const { data: conversation, error: convError } = yield database_service_1.databaseService.supabase
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
        const { count: totalMessages } = yield database_service_1.databaseService.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId);
        const { count: unreadMessages } = yield database_service_1.databaseService.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('status', 'received')
            .eq('is_from_me', false);
        // Obtener último mensaje
        const { data: lastMessage } = yield database_service_1.databaseService.supabase
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
    }
    catch (error) {
        logger_1.logger.error('Error obteniendo resumen de conversación', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
/**
 * GET /api/history/search
 * Buscar mensajes en todas las conversaciones
 */
router.get('/search', auth_jwt_1.authMiddleware, [
    (0, express_validator_1.query)('q').notEmpty().withMessage('Término de búsqueda requerido'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).toInt(),
    (0, express_validator_1.query)('conversationId').optional().isUUID()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        const { q, conversationId } = req.query;
        const limit = req.query.limit || DEFAULT_LIMIT;
        let query = database_service_1.databaseService.supabase
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
        const { data: messages, error } = yield query;
        if (error) {
            logger_1.logger.error('Error buscando mensajes', error);
            return res.status(500).json({
                success: false,
                error: 'Error al buscar mensajes'
            });
        }
        res.json({
            success: true,
            data: {
                query: q,
                results: messages.map((msg) => {
                    var _a;
                    return ({
                        id: msg.id,
                        conversationId: msg.conversation_id,
                        content: msg.content,
                        from: msg.from_number,
                        to: msg.to_number,
                        timestamp: msg.created_at,
                        conversation: {
                            id: msg.conversation.id,
                            phoneNumber: msg.conversation.phone_number,
                            contactName: ((_a = msg.conversation.contact) === null || _a === void 0 ? void 0 : _a.full_name) || 'Sin nombre'
                        }
                    });
                }),
                totalResults: messages.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error en búsqueda', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}));
exports.default = router;
