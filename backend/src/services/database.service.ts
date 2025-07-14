import { PrismaClient, Contact, Conversation, Message, MessageType, MessageStatus } from '../generated/prisma';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Inicializar conexión a la base de datos
   */
  async connect() {
    try {
      await this.prisma.$connect();
      console.log('🔗 Base de datos SQLite conectada exitosamente');
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error);
      throw error;
    }
  }

  /**
   * Cerrar conexión a la base de datos
   */
  async disconnect() {
    await this.prisma.$disconnect();
    console.log('🔌 Base de datos desconectada');
  }

  /**
   * Crear o actualizar un contacto
   */
  async upsertContact(waId: string, name?: string, profilePic?: string): Promise<Contact> {
    return await this.prisma.contact.upsert({
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
  }

  /**
   * Obtener contacto por WhatsApp ID
   */
  async getContactByWaId(waId: string): Promise<Contact | null> {
    return await this.prisma.contact.findUnique({
      where: { waId }
    });
  }

  /**
   * Obtener o crear conversación
   */
  async getOrCreateConversation(contactId: string): Promise<Conversation> {
    let conversation = await this.prisma.conversation.findFirst({
      where: { contactId },
      include: {
        contact: true,
        lastMessage: true
      }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { contactId },
        include: {
          contact: true,
          lastMessage: true
        }
      });
    }

    return conversation;
  }

  /**
   * Crear un nuevo mensaje
   */
  async createMessage(data: {
    waMessageId?: string;
    conversationId: string;
    senderId?: string;
    receiverId?: string;
    content: string;
    messageType?: MessageType;
    mediaUrl?: string;
    mediaCaption?: string;
    isFromUs?: boolean;
    timestamp?: Date;
  }): Promise<Message> {
    const message = await this.prisma.message.create({
      data: {
        waMessageId: data.waMessageId,
        conversationId: data.conversationId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.mediaCaption,
        isFromUs: data.isFromUs || false,
        timestamp: data.timestamp || new Date(),
        status: MessageStatus.SENT,
        isDelivered: true
      }
    });

    // Actualizar la conversación con el último mensaje
    await this.updateConversationLastMessage(data.conversationId, message.id);

    return message;
  }

  /**
   * Actualizar último mensaje de la conversación
   */
  async updateConversationLastMessage(conversationId: string, messageId: string) {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: messageId,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Procesar mensaje entrante de WhatsApp
   */
  async processIncomingMessage(data: {
    waMessageId: string;
    fromWaId: string;
    toWaId: string;
    content: string;
    messageType?: MessageType;
    mediaUrl?: string;
    mediaCaption?: string;
    timestamp?: Date;
    contactName?: string;
  }): Promise<{ contact: Contact; conversation: Conversation; message: Message }> {
    try {
      // 1. Crear o actualizar contacto
      const contact = await this.upsertContact(
        data.fromWaId,
        data.contactName
      );

      // 2. Obtener o crear conversación
      const conversation = await this.getOrCreateConversation(contact.id);

      // 3. Verificar si el mensaje ya existe (evitar duplicados)
      const existingMessage = await this.prisma.message.findUnique({
        where: { waMessageId: data.waMessageId }
      });

      if (existingMessage) {
        console.log(`🔍 Mensaje ${data.waMessageId} ya existe, omitiendo`);
        return { contact, conversation, message: existingMessage };
      }

      // 4. Crear mensaje
      const message = await this.createMessage({
        waMessageId: data.waMessageId,
        conversationId: conversation.id,
        senderId: contact.id,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.mediaCaption,
        isFromUs: false,
        timestamp: data.timestamp || new Date()
      });

      // 5. Incrementar contador de no leídos
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCount: { increment: 1 }
        }
      });

      console.log(`📩 Mensaje guardado en BD: ${message.id} de ${contact.name || contact.waId}`);

      return { contact, conversation, message };
    } catch (error) {
      console.error('❌ Error procesando mensaje entrante:', error);
      throw error;
    }
  }

  /**
   * Procesar mensaje saliente (enviado por nosotros)
   */
  async processOutgoingMessage(data: {
    waMessageId?: string;
    toWaId: string;
    content: string;
    messageType?: MessageType;
    mediaUrl?: string;
    mediaCaption?: string;
    timestamp?: Date;
  }): Promise<{ contact: Contact; conversation: Conversation; message: Message }> {
    try {
      // 1. Crear o actualizar contacto
      const contact = await this.upsertContact(data.toWaId);

      // 2. Obtener o crear conversación
      const conversation = await this.getOrCreateConversation(contact.id);

      // 3. Crear mensaje
      const message = await this.createMessage({
        waMessageId: data.waMessageId,
        conversationId: conversation.id,
        receiverId: contact.id,
        content: data.content,
        messageType: data.messageType || MessageType.TEXT,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.mediaCaption,
        isFromUs: true,
        timestamp: data.timestamp || new Date()
      });

      console.log(`📤 Mensaje enviado guardado en BD: ${message.id} para ${contact.waId}`);

      return { contact, conversation, message };
    } catch (error) {
      console.error('❌ Error procesando mensaje saliente:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        sender: true,
        receiver: true
      }
    });
  }

  /**
   * Obtener todas las conversaciones
   */
  async getConversations(limit: number = 50, offset: number = 0) {
    return await this.prisma.conversation.findMany({
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
  }

  /**
   * Marcar mensaje como leído
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { isRead: true }
      });
      return true;
    } catch (error) {
      console.error('❌ Error marcando mensaje como leído:', error);
      return false;
    }
  }

  /**
   * Marcar conversación como leída
   */
  async markConversationAsRead(conversationId: string): Promise<boolean> {
    try {
      await this.prisma.$transaction([
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
    } catch (error) {
      console.error('❌ Error marcando conversación como leída:', error);
      return false;
    }
  }

  /**
   * Limpiar mensajes antiguos
   */
  async cleanupOldMessages(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await this.prisma.message.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    console.log(`🗑️ ${result.count} mensajes antiguos eliminados`);
    return result.count;
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    const [totalContacts, totalConversations, totalMessages, unreadMessages] = await Promise.all([
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
  }

  // ===== MÉTODOS DE GESTIÓN DE CONTACTOS =====

  /**
   * Obtener todos los contactos con filtros y paginación
   */
  async getContacts(options: {
    limit?: number;
    offset?: number;
    search?: string;
    isBlocked?: boolean;
    isArchived?: boolean;
    isFavorite?: boolean;
    tagId?: string;
    sortBy?: 'name' | 'lastMessage' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      limit = 50,
      offset = 0,
      search,
      isBlocked,
      isArchived,
      isFavorite,
      tagId,
      sortBy = 'lastMessage',
      sortOrder = 'desc'
    } = options;

    // Construir filtros
    const where: any = {};

    if (isBlocked !== undefined) where.isBlocked = isBlocked;
    if (isArchived !== undefined) where.isArchived = isArchived;
    if (isFavorite !== undefined) where.isFavorite = isFavorite;

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
    let orderBy: any = {};
    if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'lastMessage') {
      orderBy = { conversations: { some: { updatedAt: sortOrder } } };
    }

    const contacts = await this.prisma.contact.findMany({
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

    const total = await this.prisma.contact.count({ where });

    return {
      contacts: contacts.map(contact => ({
        ...contact,
        lastConversation: contact.conversations[0] || null,
        conversations: undefined // Remove conversations array, we only need the last one
      })),
      total,
      limit,
      offset
    };
  }

  /**
   * Obtener un contacto por ID con información completa
   */
  async getContactById(contactId: string) {
    return await this.prisma.contact.findUnique({
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
  }

  /**
   * Actualizar información de un contacto
   */
  async updateContact(contactId: string, data: {
    name?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    notes?: string;
    isBlocked?: boolean;
    isArchived?: boolean;
    isFavorite?: boolean;
  }) {
    return await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });
  }

  /**
   * Eliminar un contacto (y sus conversaciones asociadas)
   */
  async deleteContact(contactId: string): Promise<boolean> {
    try {
      await this.prisma.contact.delete({
        where: { id: contactId }
      });
      return true;
    } catch (error) {
      console.error('❌ Error eliminando contacto:', error);
      return false;
    }
  }

  /**
   * Bloquear/desbloquear contacto
   */
  async toggleBlockContact(contactId: string): Promise<{ success: boolean; isBlocked: boolean }> {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        select: { isBlocked: true }
      });

      if (!contact) {
        return { success: false, isBlocked: false };
      }

      const updatedContact = await this.prisma.contact.update({
        where: { id: contactId },
        data: { isBlocked: !contact.isBlocked }
      });

      return { success: true, isBlocked: updatedContact.isBlocked };
    } catch (error) {
      console.error('❌ Error bloqueando/desbloqueando contacto:', error);
      return { success: false, isBlocked: false };
    }
  }

  /**
   * Marcar/desmarcar contacto como favorito
   */
  async toggleFavoriteContact(contactId: string): Promise<{ success: boolean; isFavorite: boolean }> {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        select: { isFavorite: true }
      });

      if (!contact) {
        return { success: false, isFavorite: false };
      }

      const updatedContact = await this.prisma.contact.update({
        where: { id: contactId },
        data: { isFavorite: !contact.isFavorite }
      });

      return { success: true, isFavorite: updatedContact.isFavorite };
    } catch (error) {
      console.error('❌ Error marcando/desmarcando favorito:', error);
      return { success: false, isFavorite: false };
    }
  }

  // ===== MÉTODOS DE GESTIÓN DE ETIQUETAS =====

  /**
   * Obtener todas las etiquetas
   */
  async getTags() {
    return await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { contacts: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Crear nueva etiqueta
   */
  async createTag(data: {
    name: string;
    color?: string;
    description?: string;
  }) {
    return await this.prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#3b82f6',
        description: data.description
      }
    });
  }

  /**
   * Actualizar etiqueta
   */
  async updateTag(tagId: string, data: {
    name?: string;
    color?: string;
    description?: string;
  }) {
    return await this.prisma.tag.update({
      where: { id: tagId },
      data
    });
  }

  /**
   * Eliminar etiqueta
   */
  async deleteTag(tagId: string): Promise<boolean> {
    try {
      await this.prisma.tag.delete({
        where: { id: tagId }
      });
      return true;
    } catch (error) {
      console.error('❌ Error eliminando etiqueta:', error);
      return false;
    }
  }

  /**
   * Agregar etiqueta a contacto
   */
  async addTagToContact(contactId: string, tagId: string): Promise<boolean> {
    try {
      await this.prisma.contactTag.create({
        data: { contactId, tagId }
      });
      return true;
    } catch (error) {
      console.error('❌ Error agregando etiqueta a contacto:', error);
      return false;
    }
  }

  /**
   * Quitar etiqueta de contacto
   */
  async removeTagFromContact(contactId: string, tagId: string): Promise<boolean> {
    try {
      await this.prisma.contactTag.deleteMany({
        where: { contactId, tagId }
      });
      return true;
    } catch (error) {
      console.error('❌ Error quitando etiqueta de contacto:', error);
      return false;
    }
  }

  /**
   * Obtener contactos por etiqueta
   */
  async getContactsByTag(tagId: string, limit: number = 50, offset: number = 0) {
    return await this.prisma.contact.findMany({
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
  }

  /**
   * Buscar contactos por texto
   */
  async searchContacts(query: string, limit: number = 20) {
    return await this.prisma.contact.findMany({
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
  }
}

// Instancia singleton
export const databaseService = new DatabaseService(); 