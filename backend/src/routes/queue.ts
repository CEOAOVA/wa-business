// ✅ RUTAS DE MONITOREO DE COLAS - IMPLEMENTADO
import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getMessageQueueService } from '../services/queue/message-queue.service';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /api/queue/stats
 * Obtener estadísticas de las colas
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queueService = getMessageQueueService();
    const stats = await queueService.getQueueStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas de colas', { error });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

/**
 * POST /api/queue/clean/completed
 * Limpiar trabajos completados
 */
router.post('/clean/completed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queueService = getMessageQueueService();
    await queueService.cleanCompleted();
    
    res.json({
      success: true,
      message: 'Trabajos completados limpiados'
    });
  } catch (error) {
    logger.error('Error limpiando trabajos completados', { error });
    res.status(500).json({
      success: false,
      error: 'Error limpiando trabajos'
    });
  }
});

/**
 * POST /api/queue/clean/failed
 * Limpiar trabajos fallidos
 */
router.post('/clean/failed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queueService = getMessageQueueService();
    await queueService.cleanFailed();
    
    res.json({
      success: true,
      message: 'Trabajos fallidos limpiados'
    });
  } catch (error) {
    logger.error('Error limpiando trabajos fallidos', { error });
    res.status(500).json({
      success: false,
      error: 'Error limpiando trabajos'
    });
  }
});

/**
 * POST /api/queue/pause
 * Pausar todas las colas
 */
router.post('/pause', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queueService = getMessageQueueService();
    await queueService.pauseQueues();
    
    res.json({
      success: true,
      message: 'Colas pausadas'
    });
  } catch (error) {
    logger.error('Error pausando colas', { error });
    res.status(500).json({
      success: false,
      error: 'Error pausando colas'
    });
  }
});

/**
 * POST /api/queue/resume
 * Reanudar todas las colas
 */
router.post('/resume', authMiddleware, async (req: Request, res: Response) => {
  try {
    const queueService = getMessageQueueService();
    await queueService.resumeQueues();
    
    res.json({
      success: true,
      message: 'Colas reanudadas'
    });
  } catch (error) {
    logger.error('Error reanudando colas', { error });
    res.status(500).json({
      success: false,
      error: 'Error reanudando colas'
    });
  }
});

/**
 * GET /api/queue/job/:queue/:jobId
 * Obtener detalles de un trabajo específico
 */
router.get('/job/:queue/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { queue, jobId } = req.params;
    
    if (queue !== 'messages' && queue !== 'chatbot') {
      return res.status(400).json({
        success: false,
        error: 'Cola inválida. Use "messages" o "chatbot"'
      });
    }
    
    const queueService = getMessageQueueService();
    const job = await queueService.getJob(queue, jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Trabajo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: job.id,
        data: job.data,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      }
    });
  } catch (error) {
    logger.error('Error obteniendo trabajo', { error });
    res.status(500).json({
      success: false,
      error: 'Error obteniendo trabajo'
    });
  }
});

/**
 * POST /api/queue/retry/:queue/:jobId
 * Reintentar un trabajo fallido
 */
router.post('/retry/:queue/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { queue, jobId } = req.params;
    
    if (queue !== 'messages' && queue !== 'chatbot') {
      return res.status(400).json({
        success: false,
        error: 'Cola inválida. Use "messages" o "chatbot"'
      });
    }
    
    const queueService = getMessageQueueService();
    await queueService.retryJob(queue, jobId);
    
    res.json({
      success: true,
      message: 'Trabajo programado para reintento'
    });
  } catch (error) {
    logger.error('Error reintentando trabajo', { error });
    res.status(500).json({
      success: false,
      error: 'Error reintentando trabajo'
    });
  }
});

export default router;