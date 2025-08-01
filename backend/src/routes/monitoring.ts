import { Router } from 'express';
import { monitoringService } from '../services/monitoring/monitoring-service';
import { bulkheadService } from '../services/resilience/bulkhead.service';
import { supabaseCircuitBreaker, soapCircuitBreaker, whatsappCircuitBreaker } from '../services/circuit-breaker/circuit-breaker.service';

const router = Router();

/**
 * GET /api/monitoring/health
 * Health check del sistema
 */
router.get('/health', async (req, res) => {
  try {
    const healthReport = monitoringService.generateHealthReport();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...healthReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error generando health report',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/metrics
 * Métricas actuales del sistema
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const bulkheadMetrics = bulkheadService.getAllMetrics();
    const bulkheadStatus = bulkheadService.getAllStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        ...metrics,
        bulkhead: {
          metrics: bulkheadMetrics,
          status: bulkheadStatus
        },
        circuitBreakers: {
          supabase: supabaseCircuitBreaker.getMetrics(),
          soap: soapCircuitBreaker.getMetrics(),
          whatsapp: whatsappCircuitBreaker.getMetrics()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Alertas activas del sistema
 */
router.get('/alerts', async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const alerts = metrics.alerts;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      alerts: {
        total: alerts.length,
        critical: alerts.filter((a: any) => a.type === 'critical').length,
        error: alerts.filter((a: any) => a.type === 'error').length,
        warning: alerts.filter((a: any) => a.type === 'warning').length,
        list: alerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo alertas',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/alerts/:alertId/resolve
 * Resolver una alerta específica
 */
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    monitoringService.resolveAlert(alertId);
    
    res.json({
      success: true,
      message: 'Alerta resuelta correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error resolviendo alerta',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/history
 * Historial de métricas
 */
router.get('/history', async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const history = monitoringService.getMetricsHistory();
    
    // Filtrar por horas si se especifica
    const cutoffTime = Date.now() - (parseInt(hours as string) * 60 * 60 * 1000);
    
    const filteredHistory = {
      webSocket: history.webSocket.filter((entry: any) => 
        entry.lastHeartbeat.getTime() > cutoffTime
      ),
      supabase: history.supabase.filter((entry: any) => 
        entry.lastHealthCheck.getTime() > cutoffTime
      ),
      system: history.system.filter((entry: any) => 
        entry.uptime > (process.uptime() - parseInt(hours as string) * 3600)
      )
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      hours: parseInt(hours as string),
      history: filteredHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/status
 * Estado general del sistema
 */
router.get('/status', async (req, res) => {
  try {
    const healthReport = monitoringService.generateHealthReport();
    const metrics = monitoringService.getMetrics();
    const bulkheadStatus = bulkheadService.getAllStatus();
    
    // Calcular uptime
    const uptime = process.uptime();
    const uptimeFormatted = {
      seconds: Math.floor(uptime),
      minutes: Math.floor(uptime / 60),
      hours: Math.floor(uptime / 3600),
      days: Math.floor(uptime / 86400)
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: {
        health: healthReport.status,
        uptime: uptimeFormatted,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        websocket: {
          activeConnections: metrics.webSocket.activeConnections,
          averageLatency: metrics.webSocket.averageLatency,
          heartbeatSuccessRate: metrics.webSocket.heartbeatSuccessRate
        },
        supabase: {
          poolUtilization: metrics.supabase.poolUtilization,
          activeConnections: metrics.supabase.activeConnections,
          errorRate: metrics.supabase.errorRate
        },
        bulkhead: bulkheadStatus,
        alerts: {
          total: metrics.alerts.length,
          critical: metrics.alerts.filter((a: any) => a.type === 'critical').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del sistema',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/cleanup
 * Limpiar datos antiguos y bulkheads inactivos
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Limpiar bulkheads inactivos
    bulkheadService.cleanup();
    
    res.json({
      success: true,
      message: 'Cleanup completado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error durante cleanup',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 