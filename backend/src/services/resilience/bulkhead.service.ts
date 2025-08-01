export interface BulkheadConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number;
}

export interface BulkheadMetrics {
  activeExecutions: number;
  queuedExecutions: number;
  totalExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecution: Date;
}

export class BulkheadService {
  private static instance: BulkheadService;
  
  private bulkheads: Map<string, {
    config: BulkheadConfig;
    activeExecutions: number;
    queue: Array<{
      id: string;
      operation: () => Promise<any>;
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timestamp: number;
    }>;
    metrics: BulkheadMetrics;
  }> = new Map();
  
  private readonly DEFAULT_CONFIG: BulkheadConfig = {
    maxConcurrent: 10,
    maxQueueSize: 50,
    timeout: 30000 // 30 segundos
  };
  
  private constructor() {
    this.startQueueProcessing();
  }
  
  static getInstance(): BulkheadService {
    if (!BulkheadService.instance) {
      BulkheadService.instance = new BulkheadService();
    }
    return BulkheadService.instance;
  }
  
  /**
   * Crear o obtener bulkhead para un servicio
   */
  getBulkhead(serviceName: string, config?: Partial<BulkheadConfig>): {
    execute: <T>(operation: () => Promise<T>) => Promise<T>;
    getMetrics: () => BulkheadMetrics;
  } {
    if (!this.bulkheads.has(serviceName)) {
      this.bulkheads.set(serviceName, {
        config: { ...this.DEFAULT_CONFIG, ...config },
        activeExecutions: 0,
        queue: [],
        metrics: {
          activeExecutions: 0,
          queuedExecutions: 0,
          totalExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          lastExecution: new Date()
        }
      });
    }
    
    const bulkhead = this.bulkheads.get(serviceName)!;
    
    return {
      execute: <T>(operation: () => Promise<T>): Promise<T> => {
        return this.executeWithBulkhead(serviceName, operation);
      },
      getMetrics: () => ({ ...bulkhead.metrics })
    };
  }
  
  /**
   * Ejecutar operación con bulkhead
   */
  private async executeWithBulkhead<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const bulkhead = this.bulkheads.get(serviceName)!;
    const { config, metrics } = bulkhead;
    
    // Si hay espacio para ejecutar inmediatamente
    if (bulkhead.activeExecutions < config.maxConcurrent) {
      return this.executeOperation(serviceName, operation);
    }
    
    // Si la cola está llena, rechazar
    if (bulkhead.queue.length >= config.maxQueueSize) {
      const error = new Error(`Bulkhead queue full for ${serviceName}`);
      metrics.failedExecutions++;
      throw error;
    }
    
    // Agregar a la cola
    return new Promise<T>((resolve, reject) => {
      const queueItem = {
        id: `bulkhead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      bulkhead.queue.push(queueItem);
      metrics.queuedExecutions = bulkhead.queue.length;
      
      // Timeout para items en cola
      setTimeout(() => {
        const index = bulkhead.queue.findIndex(item => item.id === queueItem.id);
        if (index !== -1) {
          bulkhead.queue.splice(index, 1);
          metrics.failedExecutions++;
          metrics.queuedExecutions = bulkhead.queue.length;
          reject(new Error(`Bulkhead timeout for ${serviceName}`));
        }
      }, config.timeout);
    });
  }
  
  /**
   * Ejecutar operación
   */
  private async executeOperation<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const bulkhead = this.bulkheads.get(serviceName)!;
    const { metrics } = bulkhead;
    
    bulkhead.activeExecutions++;
    metrics.activeExecutions = bulkhead.activeExecutions;
    metrics.totalExecutions++;
    metrics.lastExecution = new Date();
    
    const startTime = Date.now();
    
    try {
      const result = await operation();
      
      // Actualizar métricas de tiempo promedio
      const executionTime = Date.now() - startTime;
      metrics.averageExecutionTime = 
        (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) / 
        metrics.totalExecutions;
      
      return result;
      
    } catch (error) {
      metrics.failedExecutions++;
      throw error;
      
    } finally {
      bulkhead.activeExecutions--;
      metrics.activeExecutions = bulkhead.activeExecutions;
    }
  }
  
  /**
   * Procesar cola de operaciones
   */
  private startQueueProcessing(): void {
    setInterval(() => {
      for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
        // Procesar items en cola si hay espacio
        while (
          bulkhead.queue.length > 0 && 
          bulkhead.activeExecutions < bulkhead.config.maxConcurrent
        ) {
          const queueItem = bulkhead.queue.shift()!;
          bulkhead.metrics.queuedExecutions = bulkhead.queue.length;
          
          // Ejecutar operación
          this.executeOperation(serviceName, queueItem.operation)
            .then(queueItem.resolve)
            .catch(queueItem.reject);
        }
      }
    }, 100); // Cada 100ms
  }
  
  /**
   * Obtener métricas de todos los bulkheads
   */
  getAllMetrics(): Record<string, BulkheadMetrics> {
    const metrics: Record<string, BulkheadMetrics> = {};
    
    for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
      metrics[serviceName] = { ...bulkhead.metrics };
    }
    
    return metrics;
  }
  
  /**
   * Obtener estado de todos los bulkheads
   */
  getAllStatus(): Record<string, {
    active: number;
    queued: number;
    maxConcurrent: number;
    maxQueueSize: number;
  }> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
      status[serviceName] = {
        active: bulkhead.activeExecutions,
        queued: bulkhead.queue.length,
        maxConcurrent: bulkhead.config.maxConcurrent,
        maxQueueSize: bulkhead.config.maxQueueSize
      };
    }
    
    return status;
  }
  
  /**
   * Limpiar bulkheads inactivos
   */
  cleanup(): void {
    const now = Date.now();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
    
    for (const [serviceName, bulkhead] of this.bulkheads.entries()) {
      const timeSinceLastExecution = now - bulkhead.metrics.lastExecution.getTime();
      
      if (
        timeSinceLastExecution > inactiveThreshold &&
        bulkhead.activeExecutions === 0 &&
        bulkhead.queue.length === 0
      ) {
        this.bulkheads.delete(serviceName);
        console.log(`🧹 [BulkheadService] Bulkhead eliminado para ${serviceName} (inactivo)`);
      }
    }
  }
}

// Exportar instancia singleton
export const bulkheadService = BulkheadService.getInstance();

// Configuraciones predefinidas para servicios comunes
export const BULKHEAD_CONFIGS = {
  supabase: {
    maxConcurrent: 20,
    maxQueueSize: 100,
    timeout: 15000
  },
  soap: {
    maxConcurrent: 5,
    maxQueueSize: 30,
    timeout: 30000
  },
  whatsapp: {
    maxConcurrent: 10,
    maxQueueSize: 50,
    timeout: 20000
  },
  llm: {
    maxConcurrent: 15,
    maxQueueSize: 75,
    timeout: 25000
  }
}; 