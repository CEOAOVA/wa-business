import express from 'express';
import { performanceMonitor } from '../services/monitoring/performance-metrics';
import { memoryMonitor } from '../services/monitoring/memory-monitor';
import { logger } from '../config/logger';

const router = express.Router();

// Endpoint para obtener métricas de rendimiento
router.get('/metrics', async (req, res) => {
  try {
    const metrics = performanceMonitor.getMetricsSummary();
    const memoryStats = memoryMonitor.getMemoryStats();
    
    res.json({
      success: true,
      data: {
        performance: metrics,
        memory: memoryStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error obteniendo métricas', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas del sistema'
    });
  }
});

// Endpoint para obtener métricas específicas
router.get('/metrics/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 100 } = req.query;
    
    const metrics = performanceMonitor.getMetrics(name, parseInt(limit as string));
    
    res.json({
      success: true,
      data: {
        name,
        metrics,
        count: metrics.length
      }
    });
  } catch (error) {
    logger.error('Error obteniendo métricas específicas', { 
      name: req.params.name,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas específicas'
    });
  }
});

// Endpoint para obtener thresholds
router.get('/thresholds', async (req, res) => {
  try {
    const thresholds = performanceMonitor.getThresholds();
    const thresholdData: Record<string, any> = {};
    
    for (const [name, threshold] of thresholds) {
      thresholdData[name] = threshold;
    }
    
    res.json({
      success: true,
      data: thresholdData
    });
  } catch (error) {
    logger.error('Error obteniendo thresholds', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo thresholds'
    });
  }
});

// Endpoint para actualizar thresholds
router.put('/thresholds/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { warning, critical, action } = req.body;
    
    if (!warning || !critical || !action) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren warning, critical y action'
      });
    }
    
    performanceMonitor.setThreshold(name, { warning, critical, action });
    
    res.json({
      success: true,
      message: `Threshold ${name} actualizado correctamente`
    });
  } catch (error) {
    logger.error('Error actualizando threshold', { 
      name: req.params.name,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({
      success: false,
      error: 'Error actualizando threshold'
    });
  }
});

// Endpoint para limpiar métricas
router.delete('/metrics', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (name) {
      performanceMonitor.clearMetrics(name as string);
    } else {
      performanceMonitor.clearMetrics();
    }
    
    res.json({
      success: true,
      message: name ? `Métricas ${name} limpiadas` : 'Todas las métricas limpiadas'
    });
  } catch (error) {
    logger.error('Error limpiando métricas', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Error limpiando métricas'
    });
  }
});

// Endpoint para obtener estado del sistema
router.get('/status', async (req, res) => {
  try {
    const memoryStats = memoryMonitor.getMemoryStats();
    const latestMetrics = performanceMonitor.getMetricsSummary();
    
    // Obtener métricas críticas
    const criticalMetrics = {
      memory_usage: latestMetrics.memory_usage?.latest || 0,
      cpu_usage: latestMetrics.cpu_usage?.latest || 0,
      network_connections: latestMetrics.network_connections?.latest || 0,
      websocket_connections: latestMetrics.websocket_connections?.latest || 0
    };
    
    // Determinar estado general del sistema
    let systemStatus = 'healthy';
    let issues: string[] = [];
    
    if (criticalMetrics.memory_usage > 90) {
      systemStatus = 'critical';
      issues.push('Uso de memoria crítico');
    } else if (criticalMetrics.memory_usage > 80) {
      systemStatus = 'warning';
      issues.push('Uso de memoria alto');
    }
    
    if (criticalMetrics.cpu_usage > 90) {
      systemStatus = 'critical';
      issues.push('Uso de CPU crítico');
    } else if (criticalMetrics.cpu_usage > 70) {
      if (systemStatus === 'healthy') systemStatus = 'warning';
      issues.push('Uso de CPU alto');
    }
    
    res.json({
      success: true,
      data: {
        status: systemStatus,
        issues,
        memory: memoryStats,
        metrics: criticalMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error obteniendo estado del sistema', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del sistema'
    });
  }
});

export default router; 