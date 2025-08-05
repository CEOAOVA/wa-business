/**
 * Failed Message Retry Service - Sistema de reintentos para mensajes fallidos
 * FASE 3: Implementar acknowledgment y retry automático
 */

import { databaseService } from './database.service';
import { whatsappService } from './whatsapp.service';
import { MessageType } from '../types/database';

export interface FailedMessage {
  id: number;
  conversation_id: string;
  content: string;
  to_wa_id: string;
  client_id?: string;
  retry_count: number;
  last_retry_at?: string;
  status: string;
  created_at: string;
}

export interface RetryResult {
  success: boolean;
  messageId?: number;
  whatsappMessageId?: string;
  error?: string;
  attempts: number;
}

export class FailedMessageRetryService {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private maxRetries = 3;
  private retryDelays = [5000, 10000, 30000]; // 5s, 10s, 30s
  private batchSize = 10; // Procesar máximo 10 mensajes por batch

  constructor() {
    console.log('🔄 [RETRY_SERVICE] Inicializando servicio de retry de mensajes fallidos');
  }

  /**
   * Iniciar procesamiento automático de mensajes fallidos
   */
  startAutoRetry(): void {
    if (this.isProcessing) {
      console.log('⚠️ [RETRY_SERVICE] Procesamiento ya está activo');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 [RETRY_SERVICE] Iniciando procesamiento automático de mensajes fallidos');

    // Procesar inmediatamente
    this.processFailedMessages();

    // Configurar procesamiento periódico cada 2 minutos
    this.processingInterval = setInterval(() => {
      this.processFailedMessages();
    }, 120000); // 2 minutos
  }

  /**
   * Detener procesamiento automático
   */
  stopAutoRetry(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('⏹️ [RETRY_SERVICE] Procesamiento automático detenido');
  }

  /**
   * Procesar mensajes fallidos en lotes
   */
  private async processFailedMessages(): Promise<void> {
    try {
      console.log('🔍 [RETRY_SERVICE] Buscando mensajes fallidos para reintentar...');
      
      const failedMessages = await databaseService.getFailedMessages();
      
      if (failedMessages.length === 0) {
        console.log('✅ [RETRY_SERVICE] No hay mensajes fallidos para procesar');
        return;
      }

      console.log(`📦 [RETRY_SERVICE] Encontrados ${failedMessages.length} mensajes fallidos`);

      // Procesar en lotes para evitar sobrecarga
      const batches = this.chunkArray(failedMessages, this.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
        
        // Pausa entre lotes para evitar rate limiting
        await this.delay(1000);
      }

    } catch (error: any) {
      console.error('❌ [RETRY_SERVICE] Error procesando mensajes fallidos:', error);
    }
  }

  /**
   * Procesar un lote de mensajes fallidos
   */
  private async processBatch(messages: FailedMessage[]): Promise<void> {
    console.log(`🔄 [RETRY_SERVICE] Procesando lote de ${messages.length} mensajes`);

    const promises = messages.map(message => this.retryMessage(message));
    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failureCount++;
        console.error(`❌ [RETRY_SERVICE] Fallo en reintento de mensaje ${messages[index].id}:`, 
          result.status === 'rejected' ? result.reason : result.value.error);
      }
    });

    console.log(`📊 [RETRY_SERVICE] Resultados del lote: ${successCount} exitosos, ${failureCount} fallidos`);
  }

  /**
   * Reintentar un mensaje específico
   */
  async retryMessage(message: FailedMessage): Promise<RetryResult> {
    try {
      console.log(`🔄 [RETRY_SERVICE] Reintentando mensaje ${message.id} (intento ${message.retry_count + 1}/${this.maxRetries})`);

      // Verificar si aún se puede reintentar
      if (message.retry_count >= this.maxRetries) {
        console.log(`⚠️ [RETRY_SERVICE] Mensaje ${message.id} ha alcanzado el máximo de reintentos`);
        return {
          success: false,
          messageId: message.id,
          error: 'Máximo de reintentos alcanzado',
          attempts: message.retry_count
        };
      }

      // Incrementar contador de reintentos
      await databaseService.incrementRetryCount(message.id);

      // Reintentar envío
      const result = await whatsappService.sendMessage({
        to: message.to_wa_id,
        message: message.content,
        clientId: message.client_id || `retry_${message.id}`,
        isChatbotResponse: false
      });

      if (result.success) {
        console.log(`✅ [RETRY_SERVICE] Mensaje ${message.id} reenviado exitosamente`);
        return {
          success: true,
          messageId: message.id,
          whatsappMessageId: result.messageId,
          attempts: message.retry_count + 1
        };
      } else {
        console.error(`❌ [RETRY_SERVICE] Fallo en reintento de mensaje ${message.id}:`, result.error);
        return {
          success: false,
          messageId: message.id,
          error: result.error,
          attempts: message.retry_count + 1
        };
      }

    } catch (error: any) {
      console.error(`❌ [RETRY_SERVICE] Error en reintento de mensaje ${message.id}:`, error);
      return {
        success: false,
        messageId: message.id,
        error: error.message,
        attempts: message.retry_count + 1
      };
    }
  }

  /**
   * Reintentar mensaje específico por ID
   */
  async retryMessageById(messageId: number): Promise<RetryResult> {
    try {
      const message = await databaseService.getMessageById(messageId);
      
      if (!message) {
        return {
          success: false,
          messageId,
          error: 'Mensaje no encontrado',
          attempts: 0
        };
      }

      return await this.retryMessage(message);
    } catch (error: any) {
      console.error(`❌ [RETRY_SERVICE] Error obteniendo mensaje ${messageId}:`, error);
      return {
        success: false,
        messageId,
        error: error.message,
        attempts: 0
      };
    }
  }

  /**
   * Obtener estadísticas de retry
   */
  async getRetryStats(): Promise<{
    totalFailed: number;
    totalRetried: number;
    successRate: number;
    averageRetries: number;
  }> {
    try {
      const failedMessages = await databaseService.getFailedMessages();
      const totalFailed = failedMessages.length;
      
      const totalRetries = failedMessages.reduce((sum, msg) => sum + (msg.retry_count || 0), 0);
      const averageRetries = totalFailed > 0 ? totalRetries / totalFailed : 0;
      
      // Calcular tasa de éxito (mensajes que ya no están en estado failed)
      const successCount = failedMessages.filter(msg => msg.status !== 'failed').length;
      const successRate = totalFailed > 0 ? (successCount / totalFailed) * 100 : 0;

      return {
        totalFailed,
        totalRetried: totalRetries,
        successRate,
        averageRetries
      };
    } catch (error: any) {
      console.error('❌ [RETRY_SERVICE] Error obteniendo estadísticas:', error);
      return {
        totalFailed: 0,
        totalRetried: 0,
        successRate: 0,
        averageRetries: 0
      };
    }
  }

  /**
   * Limpiar mensajes fallidos antiguos (más de 24 horas)
   */
  async cleanupOldFailedMessages(): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 horas
      const cleanedCount = await databaseService.cleanupOldFailedMessages(cutoffTime);
      
      console.log(`🧹 [RETRY_SERVICE] Limpiados ${cleanedCount} mensajes fallidos antiguos`);
      return cleanedCount;
    } catch (error: any) {
      console.error('❌ [RETRY_SERVICE] Error limpiando mensajes antiguos:', error);
      return 0;
    }
  }

  /**
   * Obtener mensajes fallidos con paginación
   */
  async getFailedMessages(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      console.log(`🔍 [RETRY_SERVICE] Obteniendo mensajes fallidos (limit: ${limit}, offset: ${offset})`);
      const failedMessages = await databaseService.getFailedMessages();
      
      // Aplicar paginación manual
      const paginatedMessages = failedMessages.slice(offset, offset + limit);
      
      console.log(`✅ [RETRY_SERVICE] Mensajes fallidos obtenidos: ${paginatedMessages.length}/${failedMessages.length}`);
      return paginatedMessages;
    } catch (error: any) {
      console.error('❌ [RETRY_SERVICE] Error obteniendo mensajes fallidos:', error);
      return [];
    }
  }

  /**
   * Reintentar mensaje fallido por ID
   */
  async retryFailedMessage(messageId: string): Promise<RetryResult | null> {
    try {
      const id = parseInt(messageId);
      if (isNaN(id)) {
        console.error(`❌ [RETRY_SERVICE] ID de mensaje inválido: ${messageId}`);
        return null;
      }

      console.log(`🔄 [RETRY_SERVICE] Reintentando mensaje fallido: ${id}`);
      const result = await this.retryMessageById(id);
      
      if (result.success) {
        console.log(`✅ [RETRY_SERVICE] Mensaje ${id} reenviado exitosamente`);
      } else {
        console.error(`❌ [RETRY_SERVICE] Fallo al reenviar mensaje ${id}:`, result.error);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ [RETRY_SERVICE] Error reintentando mensaje ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Limpiar todos los mensajes fallidos
   */
  async clearAllFailedMessages(): Promise<number> {
    try {
      console.log('🧹 [RETRY_SERVICE] Limpiando todos los mensajes fallidos');
      
      const failedMessages = await databaseService.getFailedMessages();
      let removedCount = 0;
      
      for (const message of failedMessages) {
        try {
          const success = await databaseService.updateMessageStatus(message.id, 'deleted');
          if (success) {
            removedCount++;
          }
        } catch (error) {
          console.error(`❌ [RETRY_SERVICE] Error eliminando mensaje ${message.id}:`, error);
        }
      }
      
      console.log(`✅ [RETRY_SERVICE] Limpieza completada: ${removedCount} mensajes eliminados`);
      return removedCount;
    } catch (error: any) {
      console.error('❌ [RETRY_SERVICE] Error en limpieza total:', error);
      return 0;
    }
  }

  /**
   * Utilidades auxiliares
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destruir el servicio
   */
  destroy(): void {
    this.stopAutoRetry();
    console.log('🗑️ [RETRY_SERVICE] Servicio destruido');
  }
}

// Instancia singleton
export const failedMessageRetryService = new FailedMessageRetryService(); 