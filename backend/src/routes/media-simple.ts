/**
 * Rutas multimedia simplificadas - Versión que compila
 */

import express from 'express';
import { MessageType } from '../generated/prisma';

const router = express.Router();

/**
 * GET /api/media/types
 * Obtener tipos de archivos soportados
 */
router.get('/types', (req: any, res: any) => {
  const supportedTypes = {
    image: ['image/jpeg', 'image/png', 'image/webp'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ],
    audio: ['audio/aac', 'audio/mp4', 'audio/mpeg'],
    video: ['video/mp4', 'video/3gpp']
  };

  res.json({
    success: true,
    message: 'Tipos de archivo soportados',
    data: {
      supportedTypes,
      maxFileSize: '16MB',
      messageTypes: Object.values(MessageType),
      status: 'Sistema multimedia configurado - Multer pendiente de instalación'
    }
  });
});

/**
 * GET /api/media/stats
 * Estadísticas placeholder
 */
router.get('/stats', (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Sistema multimedia listo',
    data: {
      storage: {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        typeBreakdown: {}
      },
      formattedSize: '0 MB',
      status: 'Esperando instalación de multer para funcionalidad completa'
    }
  });
});

/**
 * POST /api/media/upload
 * Placeholder para upload
 */
router.post('/upload', (req: any, res: any) => {
  res.status(501).json({
    success: false,
    error: 'Funcionalidad de upload no disponible',
    instructions: [
      '1. Ejecutar: npm install multer @types/multer',
      '2. Crear directorios: node create-uploads-dirs.js',
      '3. Activar rutas completas de multimedia'
    ]
  });
});

export default router; 