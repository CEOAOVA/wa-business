/**
 * Unified Database Service - Consolidación híbrida con feature flags
 * Permite migración gradual y rollback seguro en producción
 */

import { StructuredLogger } from '../utils/structured-logger';
import { supabaseDatabaseService, SupabaseMessage, SupabaseConversation } from './supabase-database.service';
import { databaseService } from './database.service';
import { whatsappCircuitBreaker, databaseCircuitBreaker } from './circuit-breaker.service';
import { supabase } from '../config/supabase';

export interface UnifiedDatabaseConfig {
  useDirectSupabase: boolean;
  useOptimizedQueries: boolean;
  useBatchOperations: boolean;
  useCircuitBreaker: boolean;
  enablePerformanceMetrics: boolean;
  rollbackThreshold: number; // Error rate % para rollback automático
}

export interface MigrationMetrics {
  legacyOperations: number;
  optimizedOperations: number;
  legacyErrors: number;
  optimizedErrors: number;
  averageLegacyTime: number;
  averageOptimizedTime: number;
  errorRate: number;
  recommendedConfig: Partial<UnifiedDatabaseConfig>;
}

export class UnifiedDatabaseService {
  private config: UnifiedDatabaseConfig;
  private metrics: MigrationMetrics;
  private startTime: number;

  constructor() {
    this.config = {
      useDirectSupabase: process.env.USE_DIRECT_SUPABASE === 'true',
      useOptimizedQueries: process.env.USE_OPTIMIZED_QUERIES === 'true',
      useBatchOperations: process.env.USE_BATCH_OPERATIONS === 'true',
      useCircuitBreaker: process.env.USE_CIRCUIT_BREAKER === 'true',
      enablePerformanceMetrics: process.env.ENABLE_PERFORMANCE_METRICS !== 'false',
      rollbackThreshold: parseInt(process.env.ROLLBACK_THRESHOLD || '10') // 10% error rate
    };

    this.metrics = {
      legacyOperations: 0,
      optimizedOperations: 0,
      legacyErrors: 0,
      optimizedErrors: 0,
      averageLegacyTime: 0,
      averageOptimizedTime: 0,
      errorRate: 0,
      recommendedConfig: {}
    };

    this.startTime = Date.now();

    StructuredLogger.logSystemEvent('unified_database_service_initialized', {
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Procesar mensaje saliente con estrategia híbrida
   */
  async processOutgoingMessage(data: any): Promise<any> {
    const correlationId = `unified_out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('process_outgoing_start', 'messages', {
      useDirectSupabase: this.config.useDirectSupabase,
      messageId: data.clientId || 'unknown'
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedProcessOutgoingMessage(data, context),
        'processOutgoingMessage',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.processOutgoingMessage(data),
        'processOutgoingMessage',
        context
      );
    }
  }

  /**
   * Procesar mensaje entrante con estrategia híbrida
   */
  async processIncomingMessage(data: any): Promise<any> {
    const correlationId = `unified_in_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('process_incoming_start', 'messages', {
      useDirectSupabase: this.config.useDirectSupabase,
      from: data.from || 'unknown'
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedProcessIncomingMessage(data, context),
        'processIncomingMessage',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.processIncomingMessage(data),
        'processIncomingMessage',
        context
      );
    }
  }

  /**
   * Obtener conversaciones con estrategia híbrida
   */
  async getConversations(limit: number = 50, offset: number = 0): Promise<any[]> {
    const correlationId = `unified_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    if (this.config.useOptimizedQueries) {
      return await this.executeOptimizedMethod(
        () => this.optimizedGetConversations(limit, offset, context),
        'getConversations',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.getConversations(limit, offset),
        'getConversations',
        context
      );
    }
  }

  /**
   * Obtener mensajes de conversación con estrategia híbrida
   */
  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const correlationId = `unified_msgs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    if (this.config.useOptimizedQueries) {
      return await this.executeOptimizedMethod(
        () => this.optimizedGetConversationMessages(conversationId, limit, offset, context),
        'getConversationMessages',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.getConversationMessages(conversationId, limit, offset),
        'getConversationMessages',
        context
      );
    }
  }

  /**
   * Marcar mensaje como leído con estrategia híbrida
   */
  async markMessageAsRead(messageId: string): Promise<any> {
    const correlationId = `unified_read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('mark_message_read_start', 'messages', {
      messageId,
      useDirectSupabase: this.config.useDirectSupabase
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedMarkMessageAsRead(messageId, context),
        'markMessageAsRead',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.markMessageAsRead(messageId),
        'markMessageAsRead',
        context
      );
    }
  }

  /**
   * Eliminar mensaje con estrategia híbrida
   */
  async deleteMessage(messageId: string): Promise<any> {
    const correlationId = `unified_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('delete_message_start', 'messages', {
      messageId,
      useDirectSupabase: this.config.useDirectSupabase
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedDeleteMessage(messageId, context),
        'deleteMessage',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => this.legacyDeleteMessage(messageId),
        'deleteMessage',
        context
      );
    }
  }

  /**
   * Limpiar mensajes antiguos con estrategia híbrida
   */
  async cleanupOldMessages(daysOld: number = 30): Promise<any> {
    const correlationId = `unified_cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('cleanup_messages_start', 'messages', {
      daysOld,
      useDirectSupabase: this.config.useDirectSupabase
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedCleanupOldMessages(daysOld, context),
        'cleanupOldMessages',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.cleanupOldMessages(daysOld),
        'cleanupOldMessages',
        context
      );
    }
  }

  /**
   * Marcar conversación como leída con estrategia híbrida
   */
  async markConversationAsRead(conversationId: string): Promise<any> {
    const correlationId = `unified_conv_read_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const context = StructuredLogger.createContext(correlationId);
    
    context.logDatabase('mark_conversation_read_start', 'conversations', {
      conversationId,
      useDirectSupabase: this.config.useDirectSupabase
    });

    if (this.config.useDirectSupabase) {
      return await this.executeOptimizedMethod(
        () => this.optimizedMarkConversationAsRead(conversationId, context),
        'markConversationAsRead',
        context
      );
    } else {
      return await this.executeLegacyMethod(
        () => databaseService.markConversationAsRead(conversationId),
        'markConversationAsRead',
        context
      );
    }
  }

  /**
   * Ejecutar método optimizado con métricas y circuit breaker
   */
  private async executeOptimizedMethod<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      let result: T;
      
      if (this.config.useCircuitBreaker) {
        result = await databaseCircuitBreaker.call(operation);
      } else {
        result = await operation();
      }
      
      const duration = Date.now() - startTime;
      this.updateOptimizedMetrics(duration, false);
      
      context.logPerformance(`${operationName}_optimized_success`, duration, {
        useCircuitBreaker: this.config.useCircuitBreaker
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateOptimizedMetrics(duration, true);
      
      const errorId = context.logError(`${operationName}_optimized_failed`, error, {
        duration,
        useCircuitBreaker: this.config.useCircuitBreaker
      });
      
      // Verificar si necesitamos rollback automático
      await this.checkAutoRollback(context);
      
      throw error;
    }
  }

  /**
   * Ejecutar método legacy con métricas
   */
  private async executeLegacyMethod<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.updateLegacyMetrics(duration, false);
      
      context.logPerformance(`${operationName}_legacy_success`, duration);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateLegacyMetrics(duration, true);
      
      const errorId = context.logError(`${operationName}_legacy_failed`, error, { duration });
      
      throw error;
    }
  }

  /**
   * Método optimizado para procesar mensaje saliente
   */
  private async optimizedProcessOutgoingMessage(data: any, context: any): Promise<any> {
    // Usar createMessage directamente - método disponible
    const result = await supabaseDatabaseService.createMessage({
      conversationId: data.conversationId,
      senderType: 'agent',
      content: data.content || data.message,
      messageType: data.messageType || 'text',
      whatsappMessageId: data.whatsappMessageId,
      clientId: data.clientId,
      metadata: data.metadata
    });
    
    context.logDatabase('optimized_outgoing_processed', 'messages', {
      messageId: result?.id || 'unknown',
      optimizations: ['direct_supabase', 'structured_logging']
    });
    
    return result;
  }

  /**
   * Método optimizado para procesar mensaje entrante
   */
  private async optimizedProcessIncomingMessage(data: any, context: any): Promise<any> {
    // Usar createMessage directamente - método disponible
    const result = await supabaseDatabaseService.createMessage({
      conversationId: data.conversationId,
      senderType: 'user',
      content: data.content || data.message,
      messageType: data.messageType || 'text',
      whatsappMessageId: data.whatsappMessageId,
      clientId: data.clientId,
      metadata: data.metadata
    });
    
    context.logDatabase('optimized_incoming_processed', 'messages', {
      messageId: result?.id || 'unknown',
      from: data.from,
      optimizations: ['direct_supabase', 'structured_logging']
    });
    
    return result;
  }

  /**
   * Método optimizado para obtener conversaciones
   */
  private async optimizedGetConversations(limit: number, offset: number, context: any): Promise<any[]> {
    // Usar query optimizada directamente
    const conversations = await supabaseDatabaseService.getConversations(limit, offset);
    
    context.logDatabase('optimized_conversations_fetched', 'conversations', {
      count: conversations.length,
      limit,
      offset,
      optimizations: ['direct_query', 'reduced_joins']
    });
    
    return conversations;
  }

  /**
   * Método optimizado para obtener mensajes de conversación
   */
  private async optimizedGetConversationMessages(conversationId: string, limit: number, offset: number, context: any): Promise<any[]> {
    // Usar query optimizada directamente - ajustar parámetros
    const messages = await supabaseDatabaseService.getConversationMessages(conversationId, limit);
    
    context.logDatabase('optimized_messages_fetched', 'messages', {
      count: messages.length,
      conversationId,
      limit,
      offset,
      optimizations: ['direct_query', 'indexed_lookup']
    });
    
    return messages;
  }

  /**
   * Método optimizado para marcar mensaje como leído
   */
  private async optimizedMarkMessageAsRead(messageId: string, context: any): Promise<any> {
    // Usar directamente supabaseDatabaseService
    const result = await supabaseDatabaseService.markMessageAsRead(messageId);
    
    context.logDatabase('optimized_message_marked_read', 'messages', {
      messageId,
      success: !!result,
      optimizations: ['direct_supabase', 'single_query']
    });
    
    return result;
  }

  /**
   * Método optimizado para eliminar mensaje
   */
  private async optimizedDeleteMessage(messageId: string, context: any): Promise<any> {
    // Implementar eliminación directa con Supabase
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    
    context.logDatabase('optimized_message_deleted', 'messages', {
      messageId,
      success: !error,
      optimizations: ['direct_supabase', 'cascade_delete']
    });
    
    return data;
  }

  /**
   * Método optimizado para limpiar mensajes antiguos
   */
  private async optimizedCleanupOldMessages(daysOld: number, context: any): Promise<any> {
    // Usar método disponible en supabaseDatabaseService
    const hoursOld = daysOld * 24; // Convertir días a horas
    const deletedCount = await supabaseDatabaseService.cleanupOldMessages(hoursOld);
    
    context.logDatabase('optimized_messages_cleaned', 'messages', {
      daysOld,
      deletedCount,
      optimizations: ['batch_delete', 'indexed_date_filter']
    });
    
    return { deletedCount };
  }

  /**
   * Método optimizado para marcar conversación como leída
   */
  private async optimizedMarkConversationAsRead(conversationId: string, context: any): Promise<any> {
    // Usar método disponible en supabaseDatabaseService
    const result = await supabaseDatabaseService.markConversationAsRead(conversationId);
    
    context.logDatabase('optimized_conversation_marked_read', 'conversations', {
      conversationId,
      success: result,
      optimizations: ['direct_supabase', 'single_query']
    });
    
    return result;
  }

  /**
   * Método legacy para eliminar mensaje (fallback)
   */
  private async legacyDeleteMessage(messageId: string): Promise<any> {
    // Implementar usando Supabase directamente como fallback
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    
    if (error) throw error;
    return data;
  }

  /**
   * Actualizar métricas de métodos optimizados
   */
  private updateOptimizedMetrics(duration: number, isError: boolean) {
    this.metrics.optimizedOperations++;
    if (isError) {
      this.metrics.optimizedErrors++;
    }
    
    // Calcular promedio móvil
    this.metrics.averageOptimizedTime = 
      (this.metrics.averageOptimizedTime * (this.metrics.optimizedOperations - 1) + duration) / 
      this.metrics.optimizedOperations;
    
    this.updateErrorRate();
  }

  /**
   * Actualizar métricas de métodos legacy
   */
  private updateLegacyMetrics(duration: number, isError: boolean) {
    this.metrics.legacyOperations++;
    if (isError) {
      this.metrics.legacyErrors++;
    }
    
    // Calcular promedio móvil
    this.metrics.averageLegacyTime = 
      (this.metrics.averageLegacyTime * (this.metrics.legacyOperations - 1) + duration) / 
      this.metrics.legacyOperations;
    
    this.updateErrorRate();
  }

  /**
   * Actualizar tasa de error general
   */
  private updateErrorRate() {
    const totalOperations = this.metrics.legacyOperations + this.metrics.optimizedOperations;
    const totalErrors = this.metrics.legacyErrors + this.metrics.optimizedErrors;
    
    this.metrics.errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;
  }

  /**
   * Verificar si necesitamos rollback automático
   */
  private async checkAutoRollback(context: any) {
    if (this.metrics.errorRate > this.config.rollbackThreshold && 
        this.metrics.optimizedOperations > 10) { // Mínimo 10 operaciones para estadística válida
      
      context.logError('auto_rollback_triggered', new Error('Error rate exceeded threshold'), {
        errorRate: this.metrics.errorRate,
        threshold: this.config.rollbackThreshold,
        metrics: this.metrics
      });
      
      // Desactivar optimizaciones automáticamente
      this.config.useDirectSupabase = false;
      this.config.useOptimizedQueries = false;
      
      StructuredLogger.logSystemEvent('auto_rollback_executed', {
        previousConfig: this.config,
        metrics: this.metrics,
        reason: 'error_rate_exceeded'
      });
    }
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics(): MigrationMetrics {
    // Calcular configuración recomendada basada en métricas
    this.metrics.recommendedConfig = this.calculateRecommendedConfig();
    
    return { ...this.metrics };
  }

  /**
   * Calcular configuración recomendada basada en métricas
   */
  private calculateRecommendedConfig(): Partial<UnifiedDatabaseConfig> {
    const recommended: Partial<UnifiedDatabaseConfig> = {};
    
    // Recomendar método directo si es más rápido y confiable
    if (this.metrics.optimizedOperations > 20 && this.metrics.legacyOperations > 20) {
      const optimizedErrorRate = (this.metrics.optimizedErrors / this.metrics.optimizedOperations) * 100;
      const legacyErrorRate = (this.metrics.legacyErrors / this.metrics.legacyOperations) * 100;
      
      recommended.useDirectSupabase = 
        optimizedErrorRate <= legacyErrorRate && 
        this.metrics.averageOptimizedTime <= this.metrics.averageLegacyTime * 1.2; // 20% tolerancia
      
      recommended.useOptimizedQueries = 
        this.metrics.averageOptimizedTime < this.metrics.averageLegacyTime;
    }
    
    // Recomendar circuit breaker si hay errores frecuentes
    recommended.useCircuitBreaker = this.metrics.errorRate > 5;
    
    return recommended;
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): UnifiedDatabaseConfig {
    return { ...this.config };
  }

  /**
   * Actualizar configuración (para testing y ajustes)
   */
  updateConfig(newConfig: Partial<UnifiedDatabaseConfig>) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    StructuredLogger.logSystemEvent('unified_database_config_updated', {
      oldConfig,
      newConfig: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resetear métricas (para testing)
   */
  resetMetrics() {
    this.metrics = {
      legacyOperations: 0,
      optimizedOperations: 0,
      legacyErrors: 0,
      optimizedErrors: 0,
      averageLegacyTime: 0,
      averageOptimizedTime: 0,
      errorRate: 0,
      recommendedConfig: {}
    };
    
    StructuredLogger.logSystemEvent('unified_database_metrics_reset', {
      timestamp: new Date().toISOString()
    });
  }
}

// Instancia singleton
export const unifiedDatabaseService = new UnifiedDatabaseService();
