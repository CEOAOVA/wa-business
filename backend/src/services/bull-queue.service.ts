/**
 * Servicio de cola con Bull para procesamiento asíncrono robusto
 */
import Bull from 'bull';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { whatsappService } from './whatsapp.service';
import { databaseService } from './database.service';
import { socketService } from './socket.service';

// Configuración de Redis
const redisDisabled = (process.env.REDIS_DISABLED || '').toLowerCase() === 'true';
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Tipos de trabajos
export interface WebhookJob {
  type: 'webhook';
  data: {
    requestId: string;
    payload: any;
    messageId?: string;
    timestamp: string;
    priority: 'high' | 'normal' | 'low';
  };
}

export interface MessageJob {
  type: 'send_message';
  data: {
    to: string;
    message: string;
    clientId: string;
    retryCount?: number;
  };
}

type QueueJob = WebhookJob | MessageJob;

/**
 * Servicio de cola con Bull para procesamiento de mensajes
 */
export class BullQueueService {
  private static instance: BullQueueService;
  private webhookQueue: Bull.Queue<WebhookJob['data']>;
  private messageQueue: Bull.Queue<MessageJob['data']>;
  private processedMessages: Set<string> = new Set();
  private deduplicationTTL = 3600000; // 1 hora en ms

  private constructor() {
    if (redisDisabled) {
      // Crear mocks para evitar errores si se llama indirectamente
      // @ts-ignore
      this.webhookQueue = { add: async () => 'noop', on: () => undefined, clean: async () => [], getWaitingCount: async () => 0, getActiveCount: async () => 0, getCompletedCount: async () => 0, getFailedCount: async () => 0, getDelayedCount: async () => 0, pause: async () => undefined, resume: async () => undefined, empty: async () => undefined } as any;
      // @ts-ignore
      this.messageQueue = { add: async () => 'noop', on: () => undefined, clean: async () => [], getWaitingCount: async () => 0, getActiveCount: async () => 0, getCompletedCount: async () => 0, getFailedCount: async () => 0, getDelayedCount: async () => 0, pause: async () => undefined, resume: async () => undefined, empty: async () => undefined } as any;
      logger.warn('🟡 Redis deshabilitado (REDIS_DISABLED=true). BullQueueService funcionando en modo noop.');
      return;
    }

    // Crear colas separadas para diferentes tipos de trabajo
    this.webhookQueue = new Bull('webhook-processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    this.messageQueue = new Bull('message-sending', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });

    this.setupProcessors();
    this.setupEventHandlers();
    this.startCleanupJob();

    logger.info('Bull Queue Service inicializado');
  }

  static getInstance(): BullQueueService {
    if (!BullQueueService.instance) {
      BullQueueService.instance = new BullQueueService();
    }
    return BullQueueService.instance;
  }

  /**
   * Agregar webhook a la cola para procesamiento asíncrono
   */
  async addWebhookToQueue(data: WebhookJob['data']): Promise<string> {
    try {
      // Extraer messageId si existe
      const messageId = this.extractMessageId(data.payload);
      
      // Deduplicación por messageId
      if (messageId) {
        if (this.processedMessages.has(messageId)) {
          logger.debug(`Mensaje duplicado ignorado: ${messageId}`);
          return `duplicate_${messageId}`;
        }
        
        // Marcar como procesado
        this.processedMessages.add(messageId);
        data.messageId = messageId;
        
        // Programar limpieza
        setTimeout(() => {
          this.processedMessages.delete(messageId);
        }, this.deduplicationTTL);
      }

      // Determinar prioridad y opciones
      const jobOptions: Bull.JobOptions = {
        priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2,
        delay: 0
      };

      // Agregar a la cola
      const job = await this.webhookQueue.add(data, jobOptions);
      
      logger.debug(`Webhook agregado a cola: ${job.id}`, {
        requestId: data.requestId,
        messageId: messageId || undefined,
        priority: data.priority
      });

      return (job.id as string) || String(job.id);
    } catch (error: any) {
      logger.error('Error agregando webhook a cola', error);
      throw error;
    }
  }

  /**
   * Agregar mensaje saliente a la cola
   */
  async addMessageToQueue(data: MessageJob['data']): Promise<string> {
    try {
      const job = await this.messageQueue.add(data, {
        priority: 1,
        delay: 0
      });

      logger.debug(`Mensaje agregado a cola de envío: ${job.id}`);
      return job.id as string;
    } catch (error: any) {
      logger.error('Error agregando mensaje a cola', error);
      throw error;
    }
  }

  /**
   * Configurar procesadores de trabajos
   */
  private setupProcessors() {
    // Procesador de webhooks
    this.webhookQueue.process(10, async (job) => {
      const { requestId, payload, messageId } = job.data;
      
      try {
        logger.debug(`Procesando webhook ${requestId}`);
        
        // Procesar el webhook
        await (whatsappService as any).processWebhook({
          requestId,
          payload,
          messageId
        });

        logger.info(`Webhook procesado exitosamente: ${requestId}`);
        return { success: true, requestId };
        
      } catch (error: any) {
        logger.error(`Error procesando webhook ${requestId}`, error);
        
        // Si es el último intento, guardar en tabla de errores
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          await this.saveFailedWebhook(job.data, error);
        }
        
        throw error;
      }
    });

    // Procesador de mensajes salientes
    this.messageQueue.process(5, async (job) => {
      const { to, message, clientId } = job.data;
      
      try {
        logger.debug(`Enviando mensaje a ${to}`);
        
        const result = await whatsappService.sendMessage({
          to,
          message,
          clientId
        });

        if (!result.success) {
          throw new Error(result.error || 'Error enviando mensaje');
        }

        logger.info(`Mensaje enviado exitosamente a ${to}`);
        return result;
        
      } catch (error: any) {
        logger.error(`Error enviando mensaje a ${to}`, error);
        
        // Si es el último intento, notificar via Socket
        if (job.attemptsMade >= (job.opts.attempts || 5)) {
          socketService.emitGlobal('message_failed', {
            to,
            clientId,
            error: error.message
          });
        }
        
        throw error;
      }
    });
  }

  /**
   * Configurar manejadores de eventos
   */
  private setupEventHandlers() {
    // Eventos de webhook queue
    this.webhookQueue.on('completed', (job, result) => {
      logger.debug(`Webhook job completado: ${job.id}`);
    });

    this.webhookQueue.on('failed', (job, err) => {
      logger.error(`Webhook job falló: ${job.id}`, err);
    });

    this.webhookQueue.on('stalled', (job) => {
      logger.warn(`Webhook job stalled: ${job.id}`);
    });

    // Eventos de message queue
    this.messageQueue.on('completed', (job, result) => {
      logger.debug(`Message job completado: ${job.id}`);
    });

    this.messageQueue.on('failed', (job, err) => {
      logger.error(`Message job falló: ${job.id}`, err);
    });

    // Monitoreo de salud
    setInterval(() => {
      this.logQueueStats();
    }, 60000); // Cada minuto
  }

  /**
   * Extraer messageId del payload de WhatsApp
   */
  private extractMessageId(payload: any): string | null {
    try {
      if (payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id) {
        return payload.entry[0].changes[0].value.messages[0].id;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Guardar webhook fallido para análisis
   */
  private async saveFailedWebhook(data: WebhookJob['data'], error: Error) {
    try {
      await (databaseService as any).supabase
        .from('failed_webhooks')
        .insert({
          request_id: data.requestId,
          payload: data.payload,
          message_id: data.messageId,
          error_message: error.message,
          error_stack: error.stack,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      logger.error('Error guardando webhook fallido', dbError);
    }
  }

  /**
   * Iniciar trabajo de limpieza periódica
   */
  private startCleanupJob() {
    // Limpiar trabajos completados cada hora
    setInterval(async () => {
      try {
        const webhookCleaned = await this.webhookQueue.clean(3600000, 'completed');
        const messageCleaned = await this.messageQueue.clean(3600000, 'completed');
        
        logger.info('Limpieza de colas completada', {
          webhookCleaned: webhookCleaned.length,
          messageCleaned: messageCleaned.length
        });
      } catch (error) {
        logger.error('Error en limpieza de colas', error);
      }
    }, 3600000); // Cada hora
  }

  /**
   * Obtener estadísticas de las colas
   */
  async getQueueStats() {
    const [webhookStats, messageStats] = await Promise.all([
      this.getQueueInfo(this.webhookQueue),
      this.getQueueInfo(this.messageQueue)
    ]);

    return {
      webhook: webhookStats,
      message: messageStats,
      deduplication: {
        cachedMessages: this.processedMessages.size
      }
    };
  }

  /**
   * Obtener información de una cola
   */
  private async getQueueInfo(queue: Bull.Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }

  /**
   * Log de estadísticas
   */
  private async logQueueStats() {
    try {
      const stats = await this.getQueueStats();
      logger.info('Queue Statistics', stats as any);
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cola', error);
    }
  }

  /**
   * Pausar procesamiento
   */
  async pauseQueues() {
    await Promise.all([
      this.webhookQueue.pause(),
      this.messageQueue.pause()
    ]);
    logger.info('Colas pausadas');
  }

  /**
   * Reanudar procesamiento
   */
  async resumeQueues() {
    await Promise.all([
      this.webhookQueue.resume(),
      this.messageQueue.resume()
    ]);
    logger.info('Colas reanudadas');
  }

  /**
   * Limpiar todas las colas (usar con cuidado)
   */
  async clearQueues() {
    await Promise.all([
      this.webhookQueue.empty(),
      this.messageQueue.empty()
    ]);
    this.processedMessages.clear();
    logger.warn('Todas las colas han sido limpiadas');
  }
}

// Exportar instancia singleton
export const bullQueueService = BullQueueService.getInstance();
