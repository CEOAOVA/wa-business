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
exports.databaseService = exports.DatabaseService = void 0;
const prisma_1 = require("../generated/prisma");
class DatabaseService {
    constructor() {
        this.prisma = new prisma_1.PrismaClient();
    }
    /**
     * Inicializar conexión a la base de datos
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.$connect();
                console.log('🔗 Base de datos SQLite conectada exitosamente');
            }
            catch (error) {
                console.error('❌ Error conectando a la base de datos:', error);
                throw error;
            }
        });
    }
    /**
     * Cerrar conexión a la base de datos
     */
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.$disconnect();
            console.log('🔌 Base de datos desconectada');
        });
    }
    /**
     * Crear o actualizar un contacto
     */
    upsertContact(waId, name, profilePic) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.contact.upsert({
                where: { waId },
                update: {
                    name: name || undefined,
                    profilePic: profilePic || undefined,
                    updatedAt: new Date()
                },
                create: {
                    waId,
                    name,
                    profilePic
                }
            });
        });
    }
    /**
     * Obtener contacto por WhatsApp ID
     */
    getContactByWaId(waId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.contact.findUnique({
                where: { waId }
            });
        });
    }
    /**
     * Obtener o crear conversación
     */
    getOrCreateConversation(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            let conversation = yield this.prisma.conversation.findFirst({
                where: { contactId },
                include: {
                    contact: true,
                    lastMessage: true
                }
            });
            if (!conversation) {
                conversation = yield this.prisma.conversation.create({
                    data: { contactId },
                    include: {
                        contact: true,
                        lastMessage: true
                    }
                });
            }
            return conversation;
        });
    }
    /**
     * Crear un nuevo mensaje
     */
    createMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = yield this.prisma.message.create({
                data: {
                    waMessageId: data.waMessageId,
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    content: data.content,
                    messageType: data.messageType || prisma_1.MessageType.TEXT,
                    mediaUrl: data.mediaUrl,
                    mediaCaption: data.mediaCaption,
                    isFromUs: data.isFromUs || false,
                    timestamp: data.timestamp || new Date(),
                    status: prisma_1.MessageStatus.SENT,
                    isDelivered: true
                }
            });
            // Actualizar la conversación con el último mensaje
            yield this.updateConversationLastMessage(data.conversationId, message.id);
            return message;
        });
    }
    /**
     * Actualizar último mensaje de la conversación
     */
    updateConversationLastMessage(conversationId, messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessageId: messageId,
                    updatedAt: new Date()
                }
            });
        });
    }
    /**
     * Procesar mensaje entrante de WhatsApp
     */
    processIncomingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Crear o actualizar contacto
                const contact = yield this.upsertContact(data.fromWaId, data.contactName);
                // 2. Obtener o crear conversación
                const conversation = yield this.getOrCreateConversation(contact.id);
                // 3. Verificar si el mensaje ya existe (evitar duplicados)
                const existingMessage = yield this.prisma.message.findUnique({
                    where: { waMessageId: data.waMessageId }
                });
                if (existingMessage) {
                    console.log(`🔍 Mensaje ${data.waMessageId} ya existe, omitiendo`);
                    return { contact, conversation, message: existingMessage };
                }
                // 4. Crear mensaje
                const message = yield this.createMessage({
                    waMessageId: data.waMessageId,
                    conversationId: conversation.id,
                    senderId: contact.id,
                    content: data.content,
                    messageType: data.messageType || prisma_1.MessageType.TEXT,
                    mediaUrl: data.mediaUrl,
                    mediaCaption: data.mediaCaption,
                    isFromUs: false,
                    timestamp: data.timestamp || new Date()
                });
                // 5. Incrementar contador de no leídos
                yield this.prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        unreadCount: { increment: 1 }
                    }
                });
                console.log(`📩 Mensaje guardado en BD: ${message.id} de ${contact.name || contact.waId}`);
                return { contact, conversation, message };
            }
            catch (error) {
                console.error('❌ Error procesando mensaje entrante:', error);
                throw error;
            }
        });
    }
    /**
     * Procesar mensaje saliente (enviado por nosotros)
     */
    processOutgoingMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Crear o actualizar contacto
                const contact = yield this.upsertContact(data.toWaId);
                // 2. Obtener o crear conversación
                const conversation = yield this.getOrCreateConversation(contact.id);
                // 3. Crear mensaje
                const message = yield this.createMessage({
                    waMessageId: data.waMessageId,
                    conversationId: conversation.id,
                    receiverId: contact.id,
                    content: data.content,
                    messageType: data.messageType || prisma_1.MessageType.TEXT,
                    mediaUrl: data.mediaUrl,
                    mediaCaption: data.mediaCaption,
                    isFromUs: true,
                    timestamp: data.timestamp || new Date()
                });
                console.log(`📤 Mensaje enviado guardado en BD: ${message.id} para ${contact.waId}`);
                return { contact, conversation, message };
            }
            catch (error) {
                console.error('❌ Error procesando mensaje saliente:', error);
                throw error;
            }
        });
    }
    /**
     * Obtener mensajes de una conversación
     */
    getConversationMessages(conversationId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, limit = 50, offset = 0) {
            return yield this.prisma.message.findMany({
                where: { conversationId },
                orderBy: { timestamp: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    sender: true,
                    receiver: true
                }
            });
        });
    }
    /**
     * Obtener todas las conversaciones
     */
    getConversations() {
        return __awaiter(this, arguments, void 0, function* (limit = 50, offset = 0) {
            return yield this.prisma.conversation.findMany({
                orderBy: { updatedAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    contact: true,
                    lastMessage: true,
                    _count: {
                        select: { messages: true }
                    }
                }
            });
        });
    }
    /**
     * Marcar mensaje como leído
     */
    markMessageAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.message.update({
                    where: { id: messageId },
                    data: { isRead: true }
                });
                return true;
            }
            catch (error) {
                console.error('❌ Error marcando mensaje como leído:', error);
                return false;
            }
        });
    }
    /**
     * Marcar conversación como leída
     */
    markConversationAsRead(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.$transaction([
                    // Marcar todos los mensajes como leídos
                    this.prisma.message.updateMany({
                        where: { conversationId, isRead: false },
                        data: { isRead: true }
                    }),
                    // Resetear contador de no leídos
                    this.prisma.conversation.update({
                        where: { id: conversationId },
                        data: { unreadCount: 0 }
                    })
                ]);
                return true;
            }
            catch (error) {
                console.error('❌ Error marcando conversación como leída:', error);
                return false;
            }
        });
    }
    /**
     * Limpiar mensajes antiguos
     */
    cleanupOldMessages() {
        return __awaiter(this, arguments, void 0, function* (olderThanHours = 24) {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);
            const result = yield this.prisma.message.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate }
                }
            });
            console.log(`🗑️ ${result.count} mensajes antiguos eliminados`);
            return result.count;
        });
    }
    /**
     * Obtener estadísticas
     */
    getStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalContacts, totalConversations, totalMessages, unreadMessages] = yield Promise.all([
                this.prisma.contact.count(),
                this.prisma.conversation.count(),
                this.prisma.message.count(),
                this.prisma.message.count({ where: { isRead: false, isFromUs: false } })
            ]);
            return {
                totalContacts,
                totalConversations,
                totalMessages,
                unreadMessages
            };
        });
    }
    // ===== MÉTODOS DE GESTIÓN DE CONTACTOS =====
    /**
     * Obtener todos los contactos con filtros y paginación
     */
    getContacts() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { limit = 50, offset = 0, search, isBlocked, isArchived, isFavorite, tagId, sortBy = 'lastMessage', sortOrder = 'desc' } = options;
            // Construir filtros
            const where = {};
            if (isBlocked !== undefined)
                where.isBlocked = isBlocked;
            if (isArchived !== undefined)
                where.isArchived = isArchived;
            if (isFavorite !== undefined)
                where.isFavorite = isFavorite;
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { displayName: { contains: search } },
                    { waId: { contains: search } },
                    { phone: { contains: search } },
                    { email: { contains: search } }
                ];
            }
            if (tagId) {
                where.tags = {
                    some: { tagId }
                };
            }
            // Construir ordenamiento
            let orderBy = {};
            if (sortBy === 'name') {
                orderBy = { name: sortOrder };
            }
            else if (sortBy === 'createdAt') {
                orderBy = { createdAt: sortOrder };
            }
            else if (sortBy === 'lastMessage') {
                orderBy = { conversations: { some: { updatedAt: sortOrder } } };
            }
            const contacts = yield this.prisma.contact.findMany({
                where,
                orderBy,
                take: limit,
                skip: offset,
                include: {
                    tags: {
                        include: { tag: true }
                    },
                    conversations: {
                        include: {
                            lastMessage: true,
                            _count: { select: { messages: true } }
                        },
                        orderBy: { updatedAt: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: {
                            sentMessages: true,
                            receivedMessages: true,
                            conversations: true
                        }
                    }
                }
            });
            const total = yield this.prisma.contact.count({ where });
            return {
                contacts: contacts.map(contact => (Object.assign(Object.assign({}, contact), { lastConversation: contact.conversations[0] || null, conversations: undefined // Remove conversations array, we only need the last one
                 }))),
                total,
                limit,
                offset
            };
        });
    }
    /**
     * Obtener un contacto por ID con información completa
     */
    getContactById(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.contact.findUnique({
                where: { id: contactId },
                include: {
                    tags: {
                        include: { tag: true }
                    },
                    conversations: {
                        include: {
                            lastMessage: true,
                            _count: { select: { messages: true } }
                        }
                    },
                    _count: {
                        select: {
                            sentMessages: true,
                            receivedMessages: true,
                            conversations: true
                        }
                    }
                }
            });
        });
    }
    /**
     * Actualizar información de un contacto
     */
    updateContact(contactId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.contact.update({
                where: { id: contactId },
                data: Object.assign(Object.assign({}, data), { updatedAt: new Date() }),
                include: {
                    tags: {
                        include: { tag: true }
                    }
                }
            });
        });
    }
    /**
     * Eliminar un contacto (y sus conversaciones asociadas)
     */
    deleteContact(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.contact.delete({
                    where: { id: contactId }
                });
                return true;
            }
            catch (error) {
                console.error('❌ Error eliminando contacto:', error);
                return false;
            }
        });
    }
    /**
     * Bloquear/desbloquear contacto
     */
    toggleBlockContact(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contact = yield this.prisma.contact.findUnique({
                    where: { id: contactId },
                    select: { isBlocked: true }
                });
                if (!contact) {
                    return { success: false, isBlocked: false };
                }
                const updatedContact = yield this.prisma.contact.update({
                    where: { id: contactId },
                    data: { isBlocked: !contact.isBlocked }
                });
                return { success: true, isBlocked: updatedContact.isBlocked };
            }
            catch (error) {
                console.error('❌ Error bloqueando/desbloqueando contacto:', error);
                return { success: false, isBlocked: false };
            }
        });
    }
    /**
     * Marcar/desmarcar contacto como favorito
     */
    toggleFavoriteContact(contactId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contact = yield this.prisma.contact.findUnique({
                    where: { id: contactId },
                    select: { isFavorite: true }
                });
                if (!contact) {
                    return { success: false, isFavorite: false };
                }
                const updatedContact = yield this.prisma.contact.update({
                    where: { id: contactId },
                    data: { isFavorite: !contact.isFavorite }
                });
                return { success: true, isFavorite: updatedContact.isFavorite };
            }
            catch (error) {
                console.error('❌ Error marcando/desmarcando favorito:', error);
                return { success: false, isFavorite: false };
            }
        });
    }
    // ===== MÉTODOS DE GESTIÓN DE ETIQUETAS =====
    /**
     * Obtener todas las etiquetas
     */
    getTags() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.tag.findMany({
                include: {
                    _count: {
                        select: { contacts: true }
                    }
                },
                orderBy: { name: 'asc' }
            });
        });
    }
    /**
     * Crear nueva etiqueta
     */
    createTag(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.tag.create({
                data: {
                    name: data.name,
                    color: data.color || '#3b82f6',
                    description: data.description
                }
            });
        });
    }
    /**
     * Actualizar etiqueta
     */
    updateTag(tagId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.prisma.tag.update({
                where: { id: tagId },
                data
            });
        });
    }
    /**
     * Eliminar etiqueta
     */
    deleteTag(tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.tag.delete({
                    where: { id: tagId }
                });
                return true;
            }
            catch (error) {
                console.error('❌ Error eliminando etiqueta:', error);
                return false;
            }
        });
    }
    /**
     * Agregar etiqueta a contacto
     */
    addTagToContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.contactTag.create({
                    data: { contactId, tagId }
                });
                return true;
            }
            catch (error) {
                console.error('❌ Error agregando etiqueta a contacto:', error);
                return false;
            }
        });
    }
    /**
     * Quitar etiqueta de contacto
     */
    removeTagFromContact(contactId, tagId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.prisma.contactTag.deleteMany({
                    where: { contactId, tagId }
                });
                return true;
            }
            catch (error) {
                console.error('❌ Error quitando etiqueta de contacto:', error);
                return false;
            }
        });
    }
    /**
     * Obtener contactos por etiqueta
     */
    getContactsByTag(tagId_1) {
        return __awaiter(this, arguments, void 0, function* (tagId, limit = 50, offset = 0) {
            return yield this.prisma.contact.findMany({
                where: {
                    tags: {
                        some: { tagId }
                    }
                },
                include: {
                    tags: {
                        include: { tag: true }
                    },
                    conversations: {
                        include: { lastMessage: true },
                        orderBy: { updatedAt: 'desc' },
                        take: 1
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' }
            });
        });
    }
    /**
     * Buscar contactos por texto
     */
    searchContacts(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, limit = 20) {
            return yield this.prisma.contact.findMany({
                where: {
                    OR: [
                        { name: { contains: query } },
                        { displayName: { contains: query } },
                        { waId: { contains: query } },
                        { phone: { contains: query } },
                        { email: { contains: query } },
                        { notes: { contains: query } }
                    ]
                },
                include: {
                    tags: {
                        include: { tag: true }
                    },
                    conversations: {
                        include: { lastMessage: true },
                        orderBy: { updatedAt: 'desc' },
                        take: 1
                    }
                },
                take: limit,
                orderBy: [
                    { isFavorite: 'desc' },
                    { name: 'asc' }
                ]
            });
        });
    }
}
exports.DatabaseService = DatabaseService;
// Instancia singleton
exports.databaseService = new DatabaseService();
