import { logger } from '../../config/logger';

/**
 * Servicio de monitoreo de memoria para detectar y manejar problemas de memoria alta
 */
export class MemoryMonitor {
  private warningThreshold: number;
  private criticalThreshold: number;
  private checkInterval!: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(
    warningThreshold: number = 80, // 80%
    criticalThreshold: number = 95, // 95%
    checkIntervalMs: number = 60000 // 1 minuto
  ) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
    
    this.startMonitoring(checkIntervalMs);
  }

  /**
   * Iniciar monitoreo de memoria
   */
  private startMonitoring(checkIntervalMs: number): void {
    if (this.isMonitoring) {
      logger.warn('Memory monitor ya está ejecutándose');
      return;
    }

    this.isMonitoring = true;
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, checkIntervalMs);

    logger.info('Memory monitor iniciado', {
      warningThreshold: `${this.warningThreshold}%`,
      criticalThreshold: `${this.criticalThreshold}%`,
      checkIntervalMs
    });
  }

  /**
   * Verificar uso de memoria
   */
  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    // Log de métricas de memoria
    logger.debug('Métricas de memoria', {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapFree: `${Math.round((usage.heapTotal - usage.heapUsed) / 1024 / 1024)}MB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`
    });

    if (memoryUsagePercent > this.criticalThreshold) {
      logger.error('CRÍTICO: Uso de memoria muy alto', {
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        threshold: `${this.criticalThreshold}%`
      });
      this.triggerEmergencyCleanup();
    } else if (memoryUsagePercent > this.warningThreshold) {
      logger.warn('WARNING: Uso de memoria alto', {
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        threshold: `${this.warningThreshold}%`
      });
      this.triggerCleanup();
    }
  }

  /**
   * Limpieza de emergencia cuando la memoria está crítica
   */
  private async triggerEmergencyCleanup(): Promise<void> {
    logger.error('Iniciando limpieza de emergencia');
    
    try {
      // 1. Forzar garbage collection si está disponible
      if (global.gc) {
        global.gc();
        logger.info('Garbage collection forzado');
      }

      // 2. Limpiar caches
      await this.clearAllCaches();
      
      // 3. Reiniciar servicios críticos
      await this.restartCriticalServices();
      
      // 4. Verificar memoria después de limpieza
      const usage = process.memoryUsage();
      const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      logger.info('Limpieza de emergencia completada', {
        newUsagePercent: `${memoryUsagePercent.toFixed(2)}%`
      });
      
    } catch (error) {
      logger.error('Error durante limpieza de emergencia', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Limpieza normal cuando la memoria está alta
   */
  private async triggerCleanup(): Promise<void> {
    logger.info('Iniciando limpieza normal de memoria');
    
    try {
      // 1. Limpiar datos expirados
      await this.clearExpiredData();
      
      // 2. Verificar memoria después de limpieza
      const usage = process.memoryUsage();
      const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      logger.info('Limpieza normal completada', {
        newUsagePercent: `${memoryUsagePercent.toFixed(2)}%`
      });
      
    } catch (error) {
      logger.error('Error durante limpieza normal', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Limpiar todos los caches
   */
  private async clearAllCaches(): Promise<void> {
    try {
      // Importar servicios de cache dinámicamente
      const { cacheService } = await import('../cache/cache-service');
      if (cacheService) {
        cacheService.clear();
        logger.info('Cache service limpiado');
      }

      // Limpiar cache de inventario
      const { InventoryCache } = await import('../soap/inventory-cache');
      const inventoryCache = new InventoryCache();
      if (inventoryCache && typeof inventoryCache.clear === 'function') {
        inventoryCache.clear();
        logger.info('Inventory cache limpiado');
      }

      // Limpiar conversaciones del chatbot
      const { ChatbotService } = await import('../chatbot.service');
      const chatbotService = new ChatbotService();
      if (chatbotService && typeof chatbotService['cleanupExpiredSessions'] === 'function') {
        chatbotService['cleanupExpiredSessions']();
        logger.info('Chatbot sessions limpiadas');
      }

    } catch (error) {
      logger.error('Error limpiando caches', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Reiniciar servicios críticos
   */
  private async restartCriticalServices(): Promise<void> {
    try {
      // Reiniciar rate limiter
      const { rateLimiter } = await import('../rate-limiter/rate-limiter');
      if (rateLimiter && typeof rateLimiter.destroy === 'function') {
        rateLimiter.destroy();
        logger.info('Rate limiter reiniciado');
      }

      // Reiniciar session cleanup service
      const { sessionCleanupService } = await import('../session-cleanup.service');
      if (sessionCleanupService && typeof sessionCleanupService.restart === 'function') {
        sessionCleanupService.restart();
        logger.info('Session cleanup service reiniciado');
      }

    } catch (error) {
      logger.error('Error reiniciando servicios críticos', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Limpiar datos expirados
   */
  private async clearExpiredData(): Promise<void> {
    try {
      // Limpiar conversaciones inactivas
      const { ConversationService } = await import('../conversation/conversation-service');
      const conversationService = new ConversationService();
      if (conversationService && typeof conversationService['cleanupInactiveSessions'] === 'function') {
        const removedCount = conversationService['cleanupInactiveSessions'](0);
        logger.info(`${removedCount} conversaciones inactivas eliminadas`);
      }

      // Limpiar mensajes antiguos
      const { databaseService } = await import('../database.service');
      if (databaseService && typeof databaseService.cleanupOldMessages === 'function') {
        const removedCount = await databaseService.cleanupOldMessages(24); // 24 horas
        logger.info(`${removedCount} mensajes antiguos eliminados`);
      }

    } catch (error) {
      logger.error('Error limpiando datos expirados', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Obtener estadísticas de memoria
   */
  getMemoryStats(): any {
    const usage = process.memoryUsage();
    const memoryUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapFree: Math.round((usage.heapTotal - usage.heapUsed) / 1024 / 1024), // MB
      usagePercent: Math.round(memoryUsagePercent * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      isMonitoring: this.isMonitoring,
      warningThreshold: this.warningThreshold,
      criticalThreshold: this.criticalThreshold
    };
  }

  /**
   * Detener monitoreo
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.isMonitoring = false;
      logger.info('Memory monitor detenido');
    }
  }

  /**
   * Destruir el monitor
   */
  destroy(): void {
    this.stop();
  }
}

// Instancia singleton
export const memoryMonitor = new MemoryMonitor(
  parseInt(process.env.MAX_MEMORY_USAGE || '80'),
  parseInt(process.env.CRITICAL_MEMORY_USAGE || '95'),
  parseInt(process.env.MEMORY_CHECK_INTERVAL || '60000')
);

export default memoryMonitor; 