/**
 * Rutas para upload de archivos multimedia con multer
 * Versión completa con soporte para upload de archivos
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mediaService } from '../services/media.service';
import { whatsappService } from '../services/whatsapp.service';
import { MessageType } from '../generated/prisma';

const router = express.Router();

// Configuración de multer para upload de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar directorio basado en el tipo de archivo
    let uploadDir = 'uploads/media';
    
    if (file.mimetype.startsWith('image/')) {
      uploadDir = 'uploads/images';
    } else if (file.mimetype.startsWith('video/')) {
      uploadDir = 'uploads/video';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadDir = 'uploads/audio';
    } else if (file.mimetype.includes('pdf') || file.mimetype.includes('document') || file.mimetype.includes('text/')) {
      uploadDir = 'uploads/documents';
    } else if (file.mimetype === 'image/webp' && file.originalname.includes('sticker')) {
      uploadDir = 'uploads/stickers';
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro para tipos de archivo permitidos
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    // Imágenes
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    // Videos
    'video/mp4', 'video/3gpp', 'video/quicktime',
    // Audio
    'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
    // Documentos
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB - límite de WhatsApp
    files: 1 // Solo un archivo por upload
  }
});

/**
 * POST /api/media/upload
 * Subir archivo multimedia
 */
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo'
      });
    }

    console.log('📤 Archivo subido:', {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path
    });

    // Validar archivo con media service
    const validation = mediaService.validateMediaFile({ mimetype: file.mimetype, size: file.size });
    
    if (!validation.valid) {
      // Eliminar archivo si no es válido
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: validation.error || 'Archivo no válido'
      });
    }

    // Subir archivo a WhatsApp Business API
    const mediaId = await mediaService.uploadMediaToWhatsApp(file.path, file.filename);

    // Responder con información del archivo subido
    res.json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        localFile: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path,
          url: `/api/media/file/${file.filename}`
        },
        whatsappMedia: {
          id: mediaId,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size
        },
        validation: validation
      }
    });

  } catch (error: any) {
    console.error('❌ Error subiendo archivo:', error);
    
    // Limpiar archivo si hay error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error subiendo archivo'
    });
  }
});

/**
 * POST /api/media/upload-and-send
 * Subir archivo y enviar mensaje multimedia directamente
 */
router.post('/upload-and-send', upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    const { to, caption } = req.body;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo'
      });
    }

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Campo "to" es requerido'
      });
    }

    console.log('📤 Subiendo y enviando archivo:', {
      to: to,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      caption: caption
    });

    // Validar archivo
    const validation = mediaService.validateMediaFile({ mimetype: file.mimetype, size: file.size });
    
    if (!validation.valid) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: validation.error || 'Archivo no válido'
      });
    }

    // Subir archivo a WhatsApp Business API
    const mediaId = await mediaService.uploadMediaToWhatsApp(file.path, file.filename);

    // Determinar tipo de mensaje
    let messageType: MessageType = MessageType.DOCUMENT;
    if (file.mimetype.startsWith('image/')) {
      messageType = MessageType.IMAGE;
    } else if (file.mimetype.startsWith('video/')) {
      messageType = MessageType.VIDEO;
    } else if (file.mimetype.startsWith('audio/')) {
      messageType = MessageType.AUDIO;
    } else if (file.mimetype === 'image/webp' && file.originalname.includes('sticker')) {
      messageType = MessageType.STICKER;
    }

    // Enviar mensaje multimedia
    const sendResult = await mediaService.sendMediaMessage({
      to: to,
      mediaId: mediaId,
      mediaType: messageType,
      caption: caption,
      filename: file.originalname
    });

    // Procesar mensaje saliente
    const processedMessage = await whatsappService.processOutgoingMediaMessage({
      to: to,
      mediaId: mediaId,
      mediaType: messageType,
      caption: caption,
      filename: file.originalname,
      whatsappMessageId: sendResult.messages[0].id
    });

    res.json({
      success: true,
      message: 'Archivo subido y mensaje enviado exitosamente',
      data: {
        localFile: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path,
          url: `/api/media/file/${file.filename}`
        },
        whatsappMedia: {
          id: mediaId,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size
        },
        sentMessage: {
          id: sendResult.messages[0].id,
          to: to,
          mediaType: messageType,
          caption: caption
        },
        processedMessage: processedMessage
      }
    });

  } catch (error: any) {
    console.error('❌ Error subiendo y enviando archivo:', error);
    
    // Limpiar archivo si hay error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Error subiendo y enviando archivo'
    });
  }
});

/**
 * GET /api/media/types
 * Obtener tipos de archivo soportados
 */
router.get('/types', async (req: any, res: any) => {
  try {
    const supportedTypes = {
      images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      videos: ['video/mp4', 'video/3gpp', 'video/quicktime'],
      audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
      documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
      ],
      stickers: ['image/webp']
    };

    res.json({
      success: true,
      message: 'Tipos de archivo soportados',
      data: {
        supportedTypes: supportedTypes,
        limits: {
          maxFileSize: '16MB',
          maxFileSizeBytes: 16 * 1024 * 1024,
          maxFilesPerUpload: 1
        },
        directories: {
          images: 'uploads/images',
          videos: 'uploads/video',
          audio: 'uploads/audio',
          documents: 'uploads/documents',
          stickers: 'uploads/stickers',
          general: 'uploads/media'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo tipos soportados:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error obteniendo tipos soportados'
    });
  }
});

export default router; 