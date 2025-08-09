// ✅ SERVICIO DE COLAS CON BULL - IMPLEMENTADO
import Bull, { Job, Queue, QueueOptions, JobOptions } from 'bull';
import { logger } from '../../config/logger';
import { WhatsAppService } from '../whatsapp.service';
import { ChatbotService } from '../chatbot.service';
import { getConfig } from '../../config';

interface MessageJobData {
  to: string;
  message: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  conversationId?: string;
  mediaUrl?: string;
  priority?: number;
}

interface ChatbotJobData {
  phoneNumber: string;
  message: string;
  contactName?: string;
  conversationId: string;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export class MessageQueueService {
  private messageQueue: Queue<MessageJobData>;
  private chatbotQueue: Queue<ChatbotJobData>;
  private readonly MAX_RETRIES = 3;
  private readonly config = getConfig();
  private readonly redisDisabled = (process.env.REDIS_DISABLED || '').toLowerCase() === 'true';
  
  // Redis configuration
  private readonly redisConfig: QueueOptions = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: () => true
    },
    defaultJobOptions: {
      attempts: this.MAX_RETRIES,
      backoff: {
        type: 'exponential',
        delay: 2000 // Delay inicial
      },
      removeOnComplete: 100, // Mantener últimos 100 trabajos completados
      removeOnFail: 50 // Mantener últimos 50 trabajos fallidos
    }
  };
  
  private whatsappService: WhatsAppService | null = null;
  private chatbotService: ChatbotService | null = null;
  
  constructor() {
    if (this.redisDisabled) {
      logger.warn('🟡 Redis deshabilitado (REDIS_DISABLED=true). Servicio de colas no se inicializa.');
      // Crear dummies para evitar null checks en llamadas
      // @ts-ignore
      this.messageQueue = { add: async () => 'noop', on: () => undefined } as any;
      // @ts-ignore
      this.chatbotQueue = { add: async () => 'noop', on: () => undefined } as any;
      return;
    }

    this.messageQueue = new Bull('whatsapp-messages', this.redisConfig);
    this.chatbotQueue = new Bull('chatbot-processing', this.redisConfig);
    
    this.setupProcessors();
    this.setupEventListeners();
    
    logger.info('✅ Servicio de colas inicializado con Bull');
  }
  
  /**
   * Configurar procesadores de trabajos
   */
  private setupProcessors(): void {
    // Procesador para mensajes de WhatsApp
    this.messageQueue.process('send-message', 5, async (job: Job<MessageJobData>) => {
      const { to, message, type, conversationId, mediaUrl } = job.data;
      
      logger.info(`[Queue] Procesando mensaje ${job.id}`, { to, type });
      
      try {
        // Lazy load WhatsApp service
        if (!this.whatsappService) {
          this.whatsappService = new WhatsAppService();
        }
        
        const result = await this.whatsappService.sendMessage({
          to,
          message,
          clientId: conversationId || 'system',
          type: type === 'text' ? 'text' : undefined // Solo soporta 'text' por ahora
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Error enviando mensaje');
        }
        
        logger.info(`✅ [Queue] Mensaje enviado exitosamente ${job.id}`);
        return result;
        
      } catch (error) {
        logger.error(`❌ [Queue] Error procesando mensaje ${job.id}`, { error });
        
        // Si es error de rate limit, reintentamos con delay mayor
        if (error instanceof Error && error.message.includes('rate limit')) {
          // Bull manejará el retry con backoff exponencial automáticamente
          throw new Error('Rate limit alcanzado, reintentando...');
        }
        
        throw error;
      }
    });
    
    // Procesador para chatbot
    this.chatbotQueue.process('process-message', 3, async (job: Job<ChatbotJobData>) => {
      const { phoneNumber, message, contactName, conversationId } = job.data;
      
      logger.info(`[Queue] Procesando mensaje de chatbot ${job.id}`, { phoneNumber });
      
      try {
        // Lazy load Chatbot service
        if (!this.chatbotService) {
          this.chatbotService = new ChatbotService();
        }
        
        const response = await this.chatbotService.processWhatsAppMessage(
          phoneNumber,
          message
        );
        
        // Si el chatbot genera una respuesta, la encolamos para envío
        if (response.shouldSend && response.response) {
          await this.addMessage({
            to: phoneNumber,
            message: response.response,
            type: 'text',
            conversationId,
            priority: 0 // Prioridad normal para mensajes del chatbot
          });
        }
        
        logger.info(`✅ [Queue] Mensaje de chatbot procesado ${job.id}`);
        return response;
        
      } catch (error) {
        logger.error(`❌ [Queue] Error procesando chatbot ${job.id}`, { error });
        throw error;
      }
    });
  }
  
  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    // Eventos de la cola de mensajes
    this.messageQueue.on('completed', (job: Job<MessageJobData>, result: any) => {
      logger.debug(`[Queue] Trabajo completado: ${job.id}`, { result });
    });
    
    this.messageQueue.on('failed', (job: Job<MessageJobData>, error: Error) => {
      logger.error(`[Queue] Trabajo fallido: ${job.id}`, { 
        error: error.message,
        attempts: job.attemptsMade 
      });
    });
    
    this.messageQueue.on('stalled', (job: Job<MessageJobData>) => {
      logger.warn(`[Queue] Trabajo estancado: ${job.id}`);
    });
    
    // Eventos de la cola del chatbot
    this.chatbotQueue.on('completed', (job: Job<ChatbotJobData>, result: any) => {
      logger.debug(`[Queue] Chatbot procesado: ${job.id}`);
    });
    
    this.chatbotQueue.on('failed', (job: Job<ChatbotJobData>, error: Error) => {
      logger.error(`[Queue] Chatbot fallido: ${job.id}`, { error: error.message });
    });
    
    // Eventos globales
    this.messageQueue.on('error', (error: Error) => {
      logger.error('[Queue] Error en cola de mensajes', { error });
    });
    
    this.chatbotQueue.on('error', (error: Error) => {
      logger.error('[Queue] Error en cola de chatbot', { error });
    });
  }
  
  /**
   * Agregar mensaje a la cola
   */
  async addMessage(data: MessageJobData): Promise<string> {
    try {
      if (this.redisDisabled) return 'noop';
      const jobOptions: JobOptions = {
        priority: data.priority || 0,
        delay: 0,
        attempts: this.MAX_RETRIES
      };
      
      // Si es mensaje prioritario, procesarlo primero
      if (data.priority && data.priority > 0) {
        jobOptions.lifo = true; // Last In First Out para prioridad
      }
      
      const job = await this.messageQueue.add('send-message', data, jobOptions);
      
      logger.info(`✅ Mensaje agregado a cola: ${job.id}`, { 
        to: data.to, 
        priority: data.priority 
      });
      
      return job.id as string;
      
    } catch (error) {
      logger.error('Error agregando mensaje a cola', { error, data });
      throw error;
    }
  }
  
  /**
   * Agregar mensaje de chatbot a la cola
   */
  async addChatbotMessage(data: ChatbotJobData): Promise<string> {
    try {
      if (this.redisDisabled) return 'noop';
      const job = await this.chatbotQueue.add('process-message', data, {
        attempts: 2, // Menos reintentos para chatbot
        backoff: {
          type: 'fixed',
          delay: 1000
        }
      });
      
      logger.info(`✅ Mensaje de chatbot agregado a cola: ${job.id}`, { 
        phoneNumber: data.phoneNumber 
      });
      
      return job.id as string;
      
    } catch (error) {
      logger.error('Error agregando mensaje de chatbot a cola', { error, data });
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de las colas
   */
  async getQueueStats(): Promise<{ messages: QueueStats; chatbot: QueueStats }> {
    try {
      const [
        msgWaiting, msgActive, msgCompleted, msgFailed, msgDelayed, msgPaused,
        botWaiting, botActive, botCompleted, botFailed, botDelayed, botPaused
      ] = await Promise.all([
        this.messageQueue.getWaitingCount(),
        this.messageQueue.getActiveCount(),
        this.messageQueue.getCompletedCount(),
        this.messageQueue.getFailedCount(),
        this.messageQueue.getDelayedCount(),
        this.messageQueue.isPaused(),
        this.chatbotQueue.getWaitingCount(),
        this.chatbotQueue.getActiveCount(),
        this.chatbotQueue.getCompletedCount(),
        this.chatbotQueue.getFailedCount(),
        this.chatbotQueue.getDelayedCount(),
        this.chatbotQueue.isPaused()
      ]);
      
      return {
        messages: {
          waiting: msgWaiting,
          active: msgActive,
          completed: msgCompleted,
          failed: msgFailed,
          delayed: msgDelayed,
          paused: msgPaused
        },
        chatbot: {
          waiting: botWaiting,
          active: botActive,
          completed: botCompleted,
          failed: botFailed,
          delayed: botDelayed,
          paused: botPaused
        }
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de colas', { error });
      throw error;
    }
  }
  
  /**
   * Limpiar trabajos completados
   */
  async cleanCompleted(): Promise<void> {
    try {
      const [msgCleaned, botCleaned] = await Promise.all([
        this.messageQueue.clean(1000, 'completed'),
        this.chatbotQueue.clean(1000, 'completed')
      ]);
      
      logger.info(`✅ Limpiados ${msgCleaned.length} mensajes y ${botCleaned.length} trabajos de chatbot`);
    } catch (error) {
      logger.error('Error limpiando trabajos completados', { error });
    }
  }
  
  /**
   * Limpiar trabajos fallidos
   */
  async cleanFailed(): Promise<void> {
    try {
      const [msgCleaned, botCleaned] = await Promise.all([
        this.messageQueue.clean(1000, 'failed'),
        this.chatbotQueue.clean(1000, 'failed')
      ]);
      
      logger.info(`✅ Limpiados ${msgCleaned.length} mensajes fallidos y ${botCleaned.length} trabajos de chatbot fallidos`);
    } catch (error) {
      logger.error('Error limpiando trabajos fallidos', { error });
    }
  }
  
  /**
   * Pausar colas
   */
  async pauseQueues(): Promise<void> {
    await Promise.all([
      this.messageQueue.pause(),
      this.chatbotQueue.pause()
    ]);
    logger.info('⏸️ Colas pausadas');
  }
  
  /**
   * Reanudar colas
   */
  async resumeQueues(): Promise<void> {
    await Promise.all([
      this.messageQueue.resume(),
      this.chatbotQueue.resume()
    ]);
    logger.info('▶️ Colas reanudadas');
  }
  
  /**
   * Obtener trabajo por ID
   */
  async getJob(queueName: 'messages' | 'chatbot', jobId: string): Promise<Job | null> {
    const queue = queueName === 'messages' ? this.messageQueue : this.chatbotQueue;
    return await queue.getJob(jobId);
  }
  
  /**
   * Reintentar trabajo fallido
   */
  async retryJob(queueName: 'messages' | 'chatbot', jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job && job.failedReason) {
      await job.retry();
      logger.info(`🔄 Reintentando trabajo ${jobId}`);
    }
  }
  
  /**
   * Cerrar conexiones
   */
  async close(): Promise<void> {
    await Promise.all([
      this.messageQueue.close(),
      this.chatbotQueue.close()
    ]);
    logger.info('✅ Colas cerradas correctamente');
  }
  
  /**
   * Limpiar todas las colas (¡CUIDADO!)
   */
  async obliterate(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar colas en producción');
    }
    
    await Promise.all([
      this.messageQueue.obliterate({ force: true }),
      this.chatbotQueue.obliterate({ force: true })
    ]);
    
    logger.warn('⚠️ Todas las colas han sido limpiadas completamente');
  }
}

// Singleton
let messageQueueService: MessageQueueService | null = null;

export const getMessageQueueService = (): MessageQueueService => {
  if (!messageQueueService) {
    messageQueueService = new MessageQueueService();
  }
  return messageQueueService;
};

export default MessageQueueService;