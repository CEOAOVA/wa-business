/**
 * Message Queue Service - Sistema de cola para procesamiento asíncrono de webhooks
 * Mejora la resilencia y evita timeouts en el procesamiento de mensajes
 */

import { StructuredLogger } from '../utils/structured-logger';
import { whatsappService } from './whatsapp.service';

export interface QueuedMessage {
  id: string;
  payload: any;
  retries: number;
  createdAt: Date;
  lastAttempt?: Date;
  correlationId: string;
  priority: 'high' | 'normal' | 'low';
}

export class MessageQueueService {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Backoff exponencial
  private maxQueueSize = 1000;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    StructuredLogger.logSystemEvent('message_queue_initialized', {
      maxRetries: this.maxRetries,
      maxQueueSize: this.maxQueueSize
    });
  }

  /**
   * Agregar mensaje a la cola
   */
  async addToQueue(payload: any, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<string> {
    // Verificar límite de cola
    if (this.queue.length >= this.maxQueueSize) {
      const oldestMessage = this.queue.shift();
      StructuredLogger.logError('message_queue', new Error('Queue overflow, dropping oldest message'), {
        droppedMessageId: oldestMessage?.id,
        queueSize: this.queue.length
      });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      payload,
      retries: 0,
      createdAt: new Date(),
      correlationId,
      priority
    };

    // Insertar según prioridad
    if (priority === 'high') {
      this.queue.unshift(queuedMessage);
    } else {
      this.queue.push(queuedMessage);
    }

    StructuredLogger.logSystemEvent('message_queued', {
      messageId,
      correlationId,
      priority,
      queueSize: this.queue.length
    });

    // Iniciar procesamiento si no está corriendo
    if (!this.processing) {
      this.startProcessing();
    }

    return messageId;
  }

  /**
   * Iniciar procesamiento de la cola
   */
  private startProcessing() {
    if (this.processing) return;

    this.processing = true;
    StructuredLogger.logSystemEvent('queue_processing_started', {
      queueSize: this.queue.length
    });

    // Procesar inmediatamente
    this.processQueue();

    // Configurar procesamiento periódico
    this.processingInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, 5000); // Cada 5 segundos
  }

  /**
   * Detener procesamiento de la cola
   */
  stopProcessing() {
    this.processing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    StructuredLogger.logSystemEvent('queue_processing_stopped', {
      remainingMessages: this.queue.length
    });
  }

  /**
   * Procesar mensajes en la cola
   */
  private async processQueue() {
    while (this.queue.length > 0 && this.processing) {
      const message = this.queue.shift()!;
      
      try {
        const startTime = Date.now();
        message.lastAttempt = new Date();

        StructuredLogger.logSystemEvent('processing_queued_message', {
          messageId: message.id,
          correlationId: message.correlationId,
          attempt: message.retries + 1,
          queueSize: this.queue.length
        });

        // Procesar el mensaje webhook
        await this.processWebhookMessage(message.payload, message.correlationId);
        
        const duration = Date.now() - startTime;
        StructuredLogger.logPerformanceMetric('webhook_processed_from_queue', duration, {
          messageId: message.id,
          correlationId: message.correlationId,
          attempt: message.retries + 1
        });

      } catch (error) {
        const errorId = StructuredLogger.logError('queue_message_processing', error, {
          messageId: message.id,
          correlationId: message.correlationId,
          attempt: message.retries + 1
        });

        // Reintentar si no se han agotado los intentos
        if (message.retries < this.maxRetries) {
          message.retries++;
          
          // Delay antes del reintento
          const delay = this.retryDelays[message.retries - 1] || this.retryDelays[this.retryDelays.length - 1];
          
          StructuredLogger.logSystemEvent('message_retry_scheduled', {
            messageId: message.id,
            correlationId: message.correlationId,
            attempt: message.retries,
            delay,
            errorId
          });

          // Reintroducir en la cola después del delay
          setTimeout(() => {
            this.queue.unshift(message); // Prioridad alta para reintentos
          }, delay);

        } else {
          // Mensaje fallido definitivamente
          StructuredLogger.logError('message_permanently_failed', error, {
            messageId: message.id,
            correlationId: message.correlationId,
            totalAttempts: message.retries + 1,
            errorId
          });

          // Aquí se podría implementar una cola de mensajes fallidos
          // o notificación a un sistema de alertas
        }
      }
    }

    // Si no hay más mensajes, detener procesamiento
    if (this.queue.length === 0) {
      this.processing = false;
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }
      
      StructuredLogger.logSystemEvent('queue_processing_completed', {
        queueSize: this.queue.length
      });
    }
  }

  /**
   * Procesar mensaje webhook individual
   */
  private async processWebhookMessage(payload: any, correlationId: string): Promise<void> {
    const context = StructuredLogger.createContext(correlationId);
    
    try {
      context.logWebhook('processing_start', payload);
      
      // Delegar al servicio de WhatsApp existente (compatibilidad)
      await (whatsappService as any).processWebhookLegacy(payload);
      
      context.logWebhook('processing_success', payload);
    } catch (error) {
      context.logError('webhook_processing', error, { payload });
      throw error; // Re-throw para que el sistema de reintentos funcione
    }
  }

  /**
   * Obtener estadísticas de la cola
   */
  getQueueStats() {
    const priorityStats = this.queue.reduce((acc, msg) => {
      acc[msg.priority] = (acc[msg.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMessages: this.queue.length,
      isProcessing: this.processing,
      priorityBreakdown: priorityStats,
      oldestMessage: this.queue.length > 0 ? this.queue[0].createdAt : null,
      maxQueueSize: this.maxQueueSize,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Limpiar mensajes antiguos de la cola
   */
  cleanupOldMessages(maxAgeMinutes: number = 30) {
    const cutoffTime = new Date(Date.now() - (maxAgeMinutes * 60 * 1000));
    const initialSize = this.queue.length;
    
    this.queue = this.queue.filter(msg => msg.createdAt > cutoffTime);
    
    const removedCount = initialSize - this.queue.length;
    
    if (removedCount > 0) {
      StructuredLogger.logSystemEvent('queue_cleanup', {
        removedMessages: removedCount,
        remainingMessages: this.queue.length,
        maxAgeMinutes
      });
    }

    return removedCount;
  }

  /**
   * Obtener mensaje por ID
   */
  getMessageById(messageId: string): QueuedMessage | undefined {
    return this.queue.find(msg => msg.id === messageId);
  }

  /**
   * Remover mensaje específico de la cola
   */
  removeMessage(messageId: string): boolean {
    const initialSize = this.queue.length;
    this.queue = this.queue.filter(msg => msg.id !== messageId);
    
    const removed = initialSize > this.queue.length;
    
    if (removed) {
      StructuredLogger.logSystemEvent('message_removed_from_queue', {
        messageId,
        remainingMessages: this.queue.length
      });
    }

    return removed;
  }

  /**
   * Limpiar toda la cola
   */
  clearQueue(): number {
    const clearedCount = this.queue.length;
    this.queue = [];
    
    StructuredLogger.logSystemEvent('queue_cleared', {
      clearedMessages: clearedCount
    });

    return clearedCount;
  }

  /**
   * Destruir el servicio
   */
  destroy() {
    this.stopProcessing();
    const remainingMessages = this.clearQueue();
    
    StructuredLogger.logSystemEvent('message_queue_destroyed', {
      remainingMessages
    });
  }
}

// Instancia singleton
export const messageQueueService = new MessageQueueService();
