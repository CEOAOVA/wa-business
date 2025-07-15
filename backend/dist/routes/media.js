"use strict";
/**
 * Rutas para manejo de archivos multimedia
 * Versión simplificada para compilación sin multer
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const media_service_1 = require("../services/media.service");
const whatsapp_service_1 = require("../services/whatsapp.service");
const prisma_1 = require("../generated/prisma");
const router = express_1.default.Router();
/**
 * GET /api/media/download/:mediaId
 * Descargar archivo multimedia desde WhatsApp
 */
router.get('/download/:mediaId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mediaId } = req.params;
        if (!mediaId) {
            return res.status(400).json({
                success: false,
                error: 'Media ID requerido'
            });
        }
        console.log('📥 Descargando archivo:', mediaId);
        const mediaFile = yield media_service_1.mediaService.downloadMediaFromWhatsApp(mediaId);
        res.json({
            success: true,
            message: 'Archivo descargado exitosamente',
            data: {
                mediaId: mediaFile.id,
                filename: mediaFile.filename,
                originalName: mediaFile.originalName,
                mimetype: mediaFile.mimetype,
                size: mediaFile.size,
                path: mediaFile.path,
                url: mediaFile.url,
                metadata: mediaFile.metadata
            }
        });
    }
    catch (error) {
        console.error('❌ Error descargando archivo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error descargando archivo'
        });
    }
}));
/**
 * GET /api/media/file/:filename
 * Servir archivo multimedia estático
 */
router.get('/file/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(process.cwd(), 'uploads', 'media', filename);
        // Verificar si el archivo existe
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'Archivo no encontrado'
            });
        }
        res.sendFile(filePath);
    }
    catch (error) {
        console.error('❌ Error sirviendo archivo:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error sirviendo archivo'
        });
    }
}));
/**
 * GET /api/media/thumbnail/:filename
 * Servir thumbnail de archivo multimedia
 */
router.get('/thumbnail/:filename', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        const thumbnailPath = path_1.default.join(process.cwd(), 'uploads', 'thumbnails', filename);
        // Verificar si el thumbnail existe
        const fs = require('fs');
        if (!fs.existsSync(thumbnailPath)) {
            // Si no existe thumbnail, servir archivo original
            return res.redirect(`/api/media/file/${filename}`);
        }
        res.sendFile(thumbnailPath);
    }
    catch (error) {
        console.error('❌ Error sirviendo thumbnail:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error sirviendo thumbnail'
        });
    }
}));
/**
 * POST /api/media/send
 * Enviar mensaje multimedia usando un archivo ya subido
 */
router.post('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { to, mediaId, mediaType, caption, filename } = req.body;
        if (!to || !mediaId || !mediaType) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: to, mediaId, mediaType'
            });
        }
        console.log('📱 Enviando mensaje multimedia:', { to, mediaId, mediaType });
        // Validar tipo de mensaje
        const validTypes = Object.values(prisma_1.MessageType);
        if (!validTypes.includes(mediaType)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de mensaje no válido. Tipos válidos: ${validTypes.join(', ')}`
            });
        }
        // Enviar mensaje
        const result = yield media_service_1.mediaService.sendMediaMessage({
            to: to,
            mediaId: mediaId,
            mediaType: mediaType,
            caption: caption,
            filename: filename
        });
        // Guardar en base de datos
        const processedMessage = yield whatsapp_service_1.whatsappService.processOutgoingMediaMessage({
            to: to,
            mediaId: mediaId,
            mediaType: mediaType,
            caption: caption,
            filename: filename,
            whatsappMessageId: result.messages[0].id
        });
        res.json({
            success: true,
            message: 'Mensaje multimedia enviado exitosamente',
            data: {
                messageId: result.messages[0].id,
                to: to,
                mediaId: mediaId,
                mediaType: mediaType,
                processedMessage: processedMessage
            }
        });
    }
    catch (error) {
        console.error('❌ Error enviando mensaje multimedia:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error enviando mensaje multimedia'
        });
    }
}));
/**
 * GET /api/media/stats
 * Obtener estadísticas de almacenamiento de medios
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield media_service_1.mediaService.getStorageStats();
        res.json({
            success: true,
            message: 'Estadísticas obtenidas exitosamente',
            data: {
                storage: stats,
                formattedSize: `${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`,
                formattedAverageSize: `${(stats.averageFileSize / 1024).toFixed(2)} KB`
            }
        });
    }
    catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error obteniendo estadísticas'
        });
    }
}));
/**
 * DELETE /api/media/cleanup
 * Limpiar archivos antiguos
 */
router.delete('/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { days = 30 } = req.query;
        const daysNumber = parseInt(days) || 30;
        if (daysNumber < 1 || daysNumber > 365) {
            return res.status(400).json({
                success: false,
                error: 'Número de días debe estar entre 1 y 365'
            });
        }
        const deletedCount = yield media_service_1.mediaService.cleanupOldFiles(daysNumber);
        res.json({
            success: true,
            message: `Limpieza completada. ${deletedCount} archivos eliminados`,
            data: {
                deletedFiles: deletedCount,
                olderThanDays: daysNumber
            }
        });
    }
    catch (error) {
        console.error('❌ Error limpiando archivos:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error limpiando archivos'
        });
    }
}));
/**
 * GET /api/media/types
 * Obtener tipos de archivos soportados
 */
router.get('/types', (req, res) => {
    try {
        const supportedTypes = {
            image: ['image/jpeg', 'image/png', 'image/webp'],
            document: [
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
            audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
            video: ['video/mp4', 'video/3gpp'],
            sticker: ['image/webp']
        };
        res.json({
            success: true,
            message: 'Tipos de archivo soportados',
            data: {
                supportedTypes,
                maxFileSize: '16MB',
                messageTypes: Object.values(prisma_1.MessageType),
                note: 'Upload endpoint disponible después de instalar multer'
            }
        });
    }
    catch (error) {
        console.error('❌ Error obteniendo tipos soportados:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error obteniendo tipos soportados'
        });
    }
});
/**
 * POST /api/media/upload (placeholder)
 * Endpoint reservado para subida de archivos (requiere multer)
 */
router.post('/upload', (req, res) => {
    res.status(501).json({
        success: false,
        error: 'Upload endpoint no disponible sin multer instalado',
        message: 'Ejecutar: npm install multer @types/multer',
        instructions: 'Después de instalar multer, este endpoint será funcional'
    });
});
exports.default = router;
