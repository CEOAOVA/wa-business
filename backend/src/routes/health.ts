/**
 * Health Check Routes - Monitoreo del estado de servicios
 * Permite verificar el estado de todos los componentes críticos
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { whatsappService } from '../services/whatsapp.service';
import { StructuredLogger } from '../utils/structured-logger';
import { unifiedDatabaseService } from '../services/unified-database.service';

const router = express.Router();

/**
 * Health check general del sistema
 */
router.get('/health', async (req: any, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId || `health_${Date.now()}`;
  
  StructuredLogger.logSystemEvent('health_check_start', { correlationId });

  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      correlationId,
      services: {
        database: await checkDatabase(correlationId),
        whatsapp: await checkWhatsAppAPI(correlationId),
        supabase: await checkSupabase(correlationId),
        memory: checkMemoryUsage(),
        uptime: process.uptime()
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Determinar estado general
    const serviceStatuses = Object.values(health.services).map(s => 
      typeof s === 'object' && s !== null ? s.status : 'ok'
    );
    const allHealthy = serviceStatuses.every(status => status === 'ok');
    
    health.status = allHealthy ? 'ok' : 'degraded';
    
    const duration = Date.now() - startTime;
    StructuredLogger.logPerformanceMetric('health_check_complete', duration, { 
      status: health.status,
      servicesChecked: Object.keys(health.services).length
    }, correlationId);

    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorId = StructuredLogger.logError('health_check', error, { duration }, correlationId);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      correlationId,
      errorId,
      message: 'Health check failed'
    });
  }
});

/**
 * Health check detallado con métricas
 */
router.get('/health/detailed', async (req: any, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId || `detailed_health_${Date.now()}`;
  
  try {
    const detailedHealth = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      correlationId,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      services: {
        database: await checkDatabaseDetailed(correlationId),
        whatsapp: await checkWhatsAppDetailed(correlationId),
        supabase: await checkSupabaseDetailed(correlationId)
      },
      metrics: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

    // Determinar estado general
    const serviceStatuses = Object.values(detailedHealth.services).map(s => s.status);
    const allHealthy = serviceStatuses.every(status => status === 'ok');
    
    detailedHealth.status = allHealthy ? 'ok' : 'degraded';
    detailedHealth.metrics.responseTime = Date.now() - startTime;

    StructuredLogger.logSystemEvent('detailed_health_check_complete', {
      correlationId,
      status: detailedHealth.status,
      responseTime: detailedHealth.metrics.responseTime
    });

    res.status(allHealthy ? 200 : 503).json(detailedHealth);
  } catch (error) {
    const errorId = StructuredLogger.logError('detailed_health_check', error, {}, correlationId);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      correlationId,
      errorId,
      message: 'Detailed health check failed'
    });
  }
});

/**
 * Health check específico para base de datos
 */
async function checkDatabase(correlationId?: string): Promise<any> {
  try {
    const startTime = Date.now();
    const result = await supabase?.from('agents').select('count').limit(1);
    const duration = Date.now() - startTime;
    
    if (!result) {
      StructuredLogger.logError('database_health_check', new Error('Supabase client not available'), { duration }, correlationId);
      return { 
        status: 'error', 
        details: 'Supabase client not available',
        responseTime: duration
      };
    }
    
    const { data, error } = result;
    
    if (error) {
      StructuredLogger.logError('database_health_check', error, { duration }, correlationId);
      return { 
        status: 'error', 
        details: error.message,
        responseTime: duration
      };
    }
    
    StructuredLogger.logDatabaseEvent('health_check', 'agents', { duration }, correlationId);
    return { 
      status: 'ok', 
      details: 'Database connection successful',
      responseTime: duration
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('database_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: errorMessage,
      responseTime: -1
    };
  }
}

/**
 * Health check detallado para base de datos
 */
async function checkDatabaseDetailed(correlationId?: string): Promise<any> {
  try {
    const startTime = Date.now();
    
    // Verificar múltiples tablas
    const checks = await Promise.allSettled([
      supabase?.from('agents').select('count').limit(1),
      supabase?.from('contacts').select('count').limit(1),
      supabase?.from('conversations').select('count').limit(1),
      supabase?.from('messages').select('count').limit(1)
    ]);
    
    const duration = Date.now() - startTime;
    const tables = ['agents', 'contacts', 'conversations', 'messages'];
    const results = checks.map((check, index) => ({
      table: tables[index],
      status: check.status === 'fulfilled' && check.value && !check.value.error ? 'ok' : 'error',
      error: check.status === 'rejected' ? (check.reason instanceof Error ? check.reason.message : 'Unknown error') : 
             (check.status === 'fulfilled' && check.value && check.value.error ? check.value.error.message : null)
    }));
    
    const allTablesHealthy = results.every(r => r.status === 'ok');
    
    return {
      status: allTablesHealthy ? 'ok' : 'degraded',
      details: 'Database detailed check',
      responseTime: duration,
      tables: results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('database_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: errorMessage,
      responseTime: -1,
      tables: []
    };
  }
}

/**
 * Health check para WhatsApp API
 */
async function checkWhatsAppAPI(correlationId?: string): Promise<any> {
  try {
    const startTime = Date.now();
    const result = await whatsappService.getPhoneNumberInfo();
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      StructuredLogger.logWhatsAppEvent('health_check_failed', { error: result.error, duration }, correlationId);
      return { 
        status: 'error', 
        details: result.error,
        responseTime: duration
      };
    }
    
    StructuredLogger.logWhatsAppEvent('health_check_success', { duration }, correlationId);
    return { 
      status: 'ok', 
      details: 'WhatsApp API connection successful',
      responseTime: duration
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('whatsapp_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: errorMessage,
      responseTime: -1
    };
  }
}

/**
 * Health check detallado para WhatsApp API
 */
async function checkWhatsAppDetailed(correlationId?: string): Promise<any> {
  try {
    const startTime = Date.now();
    const result = await whatsappService.getPhoneNumberInfo();
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      return {
        status: 'error',
        details: result.error,
        responseTime: duration,
        phoneNumberInfo: null
      };
    }
    
    return {
      status: 'ok',
      details: 'WhatsApp API detailed check successful',
      responseTime: duration,
      phoneNumberInfo: {
        hasData: !!result.data,
        verified: result.data?.verified_name || 'unknown'
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('whatsapp_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: errorMessage,
      responseTime: -1,
      phoneNumberInfo: null
    };
  }
}

/**
 * Health check para Supabase
 */
async function checkSupabase(correlationId?: string): Promise<any> {
  try {
    const hasSupabase = !!supabase;
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasAnonKey = !!process.env.SUPABASE_ANON_KEY;
    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const allConfigured = hasSupabase && hasUrl && hasAnonKey && hasServiceKey;
    
    StructuredLogger.logSystemEvent('supabase_health_check', {
      hasSupabase,
      hasUrl,
      hasAnonKey,
      hasServiceKey,
      allConfigured,
      correlationId
    });
    
    return { 
      status: allConfigured ? 'ok' : 'error', 
      details: allConfigured ? 'Supabase client configured' : 'Supabase configuration incomplete'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('supabase_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: errorMessage
    };
  }
}

/**
 * Health check detallado para Supabase
 */
async function checkSupabaseDetailed(correlationId?: string): Promise<any> {
  try {
    const config = {
      hasClient: !!supabase,
      hasUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),
      urlLength: process.env.SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.SUPABASE_ANON_KEY?.length || 0,
      serviceKeyLength: (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY)?.length || 0
    };
    
    const allConfigured = config.hasClient && config.hasUrl && config.hasAnonKey && config.hasServiceKey;
    
    return {
      status: allConfigured ? 'ok' : 'error',
      details: allConfigured ? 'Supabase fully configured' : 'Supabase configuration issues',
      configuration: config
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    StructuredLogger.logError('supabase_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: errorMessage,
      configuration: null
    };
  }
}

/**
 * Verificar uso de memoria
 */
function checkMemoryUsage(): any {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
  
  return {
    status: usagePercent > 90 ? 'warning' : 'ok',
    totalMB,
    usedMB,
    usagePercent,
    details: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`
  };
}

/**
 * Health check específico para migración de base de datos
 */
router.get('/health/database-migration', async (req: any, res) => {
  const startTime = Date.now();
  const correlationId = req.correlationId || `migration_health_${Date.now()}`;
  
  try {
    const metrics = unifiedDatabaseService.getMetrics();
    const config = unifiedDatabaseService.getConfig();
    
    // Ejecutar tests de validación
    const validationTests = await Promise.allSettled([
      testLegacyMethod(correlationId),
      testOptimizedMethod(correlationId),
      testBatchOperations(correlationId)
    ]);
    
    const testResults = validationTests.map((test, index) => ({
      testName: ['legacy_method', 'optimized_method', 'batch_operations'][index],
      status: test.status,
      result: test.status === 'fulfilled' ? test.value : null,
      error: test.status === 'rejected' ? test.reason.message : null
    }));
    
    const allTestsPassed = testResults.every(t => t.status === 'fulfilled');
    const responseTime = Date.now() - startTime;
    
    const migrationHealth = {
      status: allTestsPassed ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      correlationId,
      responseTime,
      currentConfig: config,
      metrics,
      validationTests: testResults,
      recommendations: {
        shouldUseDirect: metrics.recommendedConfig.useDirectSupabase,
        shouldUseOptimized: metrics.recommendedConfig.useOptimizedQueries,
        shouldUseCircuitBreaker: metrics.recommendedConfig.useCircuitBreaker,
        migrationProgress: calculateMigrationProgress(metrics)
      }
    };
    
    StructuredLogger.logSystemEvent('migration_health_check_completed', {
      correlationId,
      status: migrationHealth.status,
      responseTime,
      testsPassed: allTestsPassed
    });
    
    res.status(allTestsPassed ? 200 : 503).json(migrationHealth);
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const errorId = StructuredLogger.logError('health_check', error, {
      correlationId,
      responseTime
    });
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      correlationId,
      errorId,
      message: 'Health check failed',
      details: error?.message || 'Unknown error',
      responseTime
    });
  }
});

/**
 * Test método legacy
 */
async function testLegacyMethod(correlationId: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Test simple: obtener conversaciones usando método legacy
    const conversations = await unifiedDatabaseService.getConversations(5, 0);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      duration,
      resultCount: conversations.length,
      method: 'legacy'
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    StructuredLogger.logError('legacy_method_test', error, { correlationId, duration });
    throw error;
  }
}

/**
 * Test método optimizado
 */
async function testOptimizedMethod(correlationId: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Temporalmente activar método optimizado para test
    const originalConfig = unifiedDatabaseService.getConfig();
    unifiedDatabaseService.updateConfig({ useOptimizedQueries: true });
    
    const conversations = await unifiedDatabaseService.getConversations(5, 0);
    const duration = Date.now() - startTime;
    
    // Restaurar configuración original
    unifiedDatabaseService.updateConfig(originalConfig);
    
    return {
      success: true,
      duration,
      resultCount: conversations.length,
      method: 'optimized'
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    StructuredLogger.logError('optimized_method_test', error, { correlationId, duration });
    throw error;
  }
}

/**
 * Test operaciones batch
 */
async function testBatchOperations(correlationId: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Test simple: verificar que las operaciones batch están disponibles
    const config = unifiedDatabaseService.getConfig();
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      duration,
      batchOperationsEnabled: config.useBatchOperations,
      method: 'batch_test'
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    StructuredLogger.logError('batch_operations_test', error, { correlationId, duration });
    throw error;
  }
}

/**
 * Calcular progreso de migración
 */
function calculateMigrationProgress(metrics: any): any {
  const totalOperations = metrics.legacyOperations + metrics.optimizedOperations;
  
  if (totalOperations === 0) {
    return {
      percentage: 0,
      stage: 'not_started',
      recommendation: 'Begin with 10% traffic'
    };
  }
  
  const optimizedPercentage = (metrics.optimizedOperations / totalOperations) * 100;
  
  let stage = 'testing';
  let recommendation = 'Continue monitoring';
  
  if (optimizedPercentage < 10) {
    stage = 'initial_testing';
    recommendation = 'Increase to 25% traffic if metrics are good';
  } else if (optimizedPercentage < 50) {
    stage = 'gradual_rollout';
    recommendation = 'Increase to 75% traffic if error rate < 5%';
  } else if (optimizedPercentage < 90) {
    stage = 'majority_rollout';
    recommendation = 'Complete migration if performance is better';
  } else {
    stage = 'migration_complete';
    recommendation = 'Consider removing legacy code';
  }
  
  return {
    percentage: Math.round(optimizedPercentage),
    stage,
    recommendation,
    totalOperations,
    errorRate: metrics.errorRate
  };
}

export default router;
