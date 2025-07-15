"use strict";
/**
 * Rutas multimedia simplificadas - Versión que compila
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../generated/prisma");
const router = express_1.default.Router();
/**
 * GET /api/media/types
 * Obtener tipos de archivos soportados
 */
router.get('/types', (req, res) => {
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
            messageTypes: Object.values(prisma_1.MessageType),
            status: 'Sistema multimedia configurado - Multer pendiente de instalación'
        }
    });
});
/**
 * GET /api/media/stats
 * Estadísticas placeholder
 */
router.get('/stats', (req, res) => {
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
router.post('/upload', (req, res) => {
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
exports.default = router;
