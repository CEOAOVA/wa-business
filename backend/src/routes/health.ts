/**
 * Health Check Routes - Monitoreo del estado de servicios
 * Permite verificar el estado de todos los componentes críticos
 */

import express from 'express';
import { supabase } from '../config/supabase';
import { whatsappService } from '../services/whatsapp.service';
import { StructuredLogger } from '../utils/structured-logger';

const router = express.Router();

/**
 * Health check general del sistema
 */
router.get('/health', async (req, res) => {
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
router.get('/health/detailed', async (req, res) => {
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
    const { data, error } = await supabase.from('agents').select('count').limit(1);
    const duration = Date.now() - startTime;
    
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
    StructuredLogger.logError('database_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: error.message,
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
      supabase.from('agents').select('count').limit(1),
      supabase.from('contacts').select('count').limit(1),
      supabase.from('conversations').select('count').limit(1),
      supabase.from('messages').select('count').limit(1)
    ]);
    
    const duration = Date.now() - startTime;
    const tables = ['agents', 'contacts', 'conversations', 'messages'];
    const results = checks.map((check, index) => ({
      table: tables[index],
      status: check.status === 'fulfilled' && !check.value.error ? 'ok' : 'error',
      error: check.status === 'rejected' ? check.reason.message : 
             (check.status === 'fulfilled' && check.value.error ? check.value.error.message : null)
    }));
    
    const allTablesHealthy = results.every(r => r.status === 'ok');
    
    return {
      status: allTablesHealthy ? 'ok' : 'degraded',
      details: 'Database detailed check',
      responseTime: duration,
      tables: results
    };
  } catch (error) {
    StructuredLogger.logError('database_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: error.message,
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
    StructuredLogger.logError('whatsapp_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: error.message,
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
    StructuredLogger.logError('whatsapp_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: error.message,
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
      allConfigured
    }, correlationId);
    
    return { 
      status: allConfigured ? 'ok' : 'error', 
      details: allConfigured ? 'Supabase client configured' : 'Supabase configuration incomplete'
    };
  } catch (error) {
    StructuredLogger.logError('supabase_health_check', error, {}, correlationId);
    return { 
      status: 'error', 
      details: error.message
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
    StructuredLogger.logError('supabase_detailed_health_check', error, {}, correlationId);
    return {
      status: 'error',
      details: error.message,
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

export default router;
