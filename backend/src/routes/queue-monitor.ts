/**
 * Rutas para monitoreo de colas Bull
 */
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-jwt';
import { bullQueueService } from '../services/bull-queue.service';

const router = Router();

/**
 * GET /api/queue/stats
 * Obtener estadísticas de las colas
 */
router.get('/stats', authMiddleware, async (req: any, res: any) => {
  try {
    const stats = await bullQueueService.getQueueStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/queue/pause
 * Pausar procesamiento de colas
 */
router.post('/pause', authMiddleware, async (req: any, res: any) => {
  try {
    // Solo admins pueden pausar
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }

    await bullQueueService.pauseQueues();
    
    res.json({
      success: true,
      message: 'Colas pausadas'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/queue/resume
 * Reanudar procesamiento de colas
 */
router.post('/resume', authMiddleware, async (req: any, res: any) => {
  try {
    // Solo admins pueden reanudar
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }

    await bullQueueService.resumeQueues();
    
    res.json({
      success: true,
      message: 'Colas reanudadas'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/queue/clear
 * Limpiar todas las colas (PELIGROSO)
 */
router.delete('/clear', authMiddleware, async (req: any, res: any) => {
  try {
    // Solo admins pueden limpiar
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No autorizado'
      });
    }

    // Confirmación requerida
    if (req.body.confirm !== 'CLEAR_ALL_QUEUES') {
      return res.status(400).json({
        success: false,
        error: 'Confirmación requerida: confirm=CLEAR_ALL_QUEUES'
      });
    }

    await bullQueueService.clearQueues();
    
    res.json({
      success: true,
      message: 'Todas las colas han sido limpiadas'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
