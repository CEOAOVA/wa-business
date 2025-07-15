"use strict";
/**
 * Servicio de medios multimedia para WhatsApp Business API
 * Maneja imágenes, documentos, audio, video y otros archivos
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
exports.mediaService = exports.MediaService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fs_2 = require("fs");
const whatsapp_1 = require("../config/whatsapp");
const prisma_1 = require("../generated/prisma");
class MediaService {
    constructor() {
        // Tipos MIME soportados por WhatsApp
        this.supportedMimeTypes = {
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
        this.mediaDir = path_1.default.join(process.cwd(), 'uploads', 'media');
        this.thumbnailDir = path_1.default.join(process.cwd(), 'uploads', 'thumbnails');
        this.maxFileSize = 16 * 1024 * 1024; // 16MB limit for WhatsApp
        this.initializeDirectories();
    }
    /**
     * Inicializar directorios de medios
     */
    initializeDirectories() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_2.promises.mkdir(this.mediaDir, { recursive: true });
                yield fs_2.promises.mkdir(this.thumbnailDir, { recursive: true });
                console.log('📁 Directorios de medios inicializados');
            }
            catch (error) {
                console.error('❌ Error creando directorios de medios:', error);
            }
        });
    }
    /**
     * Obtener tipo de mensaje basado en MIME type
     */
    getMessageType(mimeType) {
        if (this.supportedMimeTypes.image.includes(mimeType))
            return prisma_1.MessageType.IMAGE;
        if (this.supportedMimeTypes.document.includes(mimeType))
            return prisma_1.MessageType.DOCUMENT;
        if (this.supportedMimeTypes.audio.includes(mimeType))
            return prisma_1.MessageType.AUDIO;
        if (this.supportedMimeTypes.video.includes(mimeType))
            return prisma_1.MessageType.VIDEO;
        if (this.supportedMimeTypes.sticker.includes(mimeType))
            return prisma_1.MessageType.STICKER;
        return prisma_1.MessageType.DOCUMENT; // Por defecto
    }
    /**
     * Validar archivo multimedia
     */
    validateMediaFile(file) {
        // Validar tamaño
        if (file.size > this.maxFileSize) {
            return { valid: false, error: `Archivo demasiado grande. Máximo ${this.maxFileSize / (1024 * 1024)}MB` };
        }
        // Validar tipo MIME
        const allSupportedTypes = [
            ...this.supportedMimeTypes.image,
            ...this.supportedMimeTypes.document,
            ...this.supportedMimeTypes.audio,
            ...this.supportedMimeTypes.video,
            ...this.supportedMimeTypes.sticker
        ];
        if (!allSupportedTypes.includes(file.mimetype)) {
            return { valid: false, error: `Tipo de archivo no soportado: ${file.mimetype}` };
        }
        return { valid: true };
    }
    /**
     * Subir archivo multimedia a WhatsApp
     */
    uploadMediaToWhatsApp(filePath, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log('📤 Subiendo archivo a WhatsApp:', filename);
                const formData = new FormData();
                const fileBuffer = yield fs_2.promises.readFile(filePath);
                const blob = new Blob([fileBuffer]);
                formData.append('file', blob, filename);
                formData.append('messaging_product', 'whatsapp');
                const response = yield axios_1.default.post((0, whatsapp_1.buildApiUrl)(`${whatsapp_1.whatsappConfig.phoneNumberId}/media`), formData, {
                    headers: Object.assign(Object.assign({}, (0, whatsapp_1.getHeaders)()), { 'Content-Type': 'multipart/form-data' }),
                });
                const mediaId = response.data.id;
                console.log('✅ Archivo subido exitosamente, Media ID:', mediaId);
                return mediaId;
            }
            catch (error) {
                console.error('❌ Error subiendo archivo a WhatsApp:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Error subiendo archivo: ${((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || error.message}`);
            }
        });
    }
    /**
     * Descargar archivo multimedia desde WhatsApp
     */
    downloadMediaFromWhatsApp(mediaId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log('📥 Descargando archivo de WhatsApp:', mediaId);
                // Obtener URL del archivo
                const mediaInfoResponse = yield axios_1.default.get((0, whatsapp_1.buildApiUrl)(mediaId), { headers: (0, whatsapp_1.getHeaders)() });
                const mediaInfo = mediaInfoResponse.data;
                const mediaUrl = mediaInfo.url;
                const mimeType = mediaInfo.mime_type;
                const fileSize = mediaInfo.file_size;
                // Descargar archivo
                const downloadResponse = yield axios_1.default.get(mediaUrl, {
                    headers: (0, whatsapp_1.getHeaders)(),
                    responseType: 'stream'
                });
                // Generar nombre de archivo único
                const fileExtension = this.getFileExtension(mimeType);
                const filename = `${mediaId}_${Date.now()}.${fileExtension}`;
                const filePath = path_1.default.join(this.mediaDir, filename);
                // Guardar archivo
                const writer = fs_1.default.createWriteStream(filePath);
                downloadResponse.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', () => __awaiter(this, void 0, void 0, function* () {
                        console.log('✅ Archivo descargado exitosamente:', filename);
                        const mediaFile = {
                            id: mediaId,
                            filename,
                            originalName: filename,
                            mimetype: mimeType,
                            size: fileSize,
                            path: filePath,
                            url: mediaUrl
                        };
                        resolve(mediaFile);
                    }));
                    writer.on('error', reject);
                });
            }
            catch (error) {
                console.error('❌ Error descargando archivo:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Error descargando archivo: ${((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || error.message}`);
            }
        });
    }
    /**
     * Enviar mensaje multimedia
     */
    sendMediaMessage(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const { to, mediaId, mediaType, caption, filename } = options;
                console.log('📱 Enviando mensaje multimedia:', { to, mediaType, mediaId });
                let messageBody = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: to,
                    type: mediaType.toLowerCase()
                };
                // Configurar cuerpo del mensaje según el tipo
                switch (mediaType) {
                    case prisma_1.MessageType.IMAGE:
                        messageBody.image = {
                            id: mediaId,
                            caption: caption || ''
                        };
                        break;
                    case prisma_1.MessageType.DOCUMENT:
                        messageBody.document = {
                            id: mediaId,
                            caption: caption || '',
                            filename: filename || 'document'
                        };
                        break;
                    case prisma_1.MessageType.AUDIO:
                        messageBody.audio = {
                            id: mediaId
                        };
                        break;
                    case prisma_1.MessageType.VIDEO:
                        messageBody.video = {
                            id: mediaId,
                            caption: caption || ''
                        };
                        break;
                    case prisma_1.MessageType.STICKER:
                        messageBody.sticker = {
                            id: mediaId
                        };
                        break;
                    default:
                        throw new Error(`Tipo de media no soportado: ${mediaType}`);
                }
                const response = yield axios_1.default.post((0, whatsapp_1.buildApiUrl)(`${whatsapp_1.whatsappConfig.phoneNumberId}/messages`), messageBody, { headers: (0, whatsapp_1.getHeaders)() });
                console.log('✅ Mensaje multimedia enviado exitosamente:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('❌ Error enviando mensaje multimedia:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error(`Error enviando mensaje: ${((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || error.message}`);
            }
        });
    }
    /**
     * Procesar archivo multimedia recibido
     */
    processIncomingMedia(mediaId, messageType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Procesando archivo multimedia recibido:', mediaId);
                const mediaFile = yield this.downloadMediaFromWhatsApp(mediaId);
                // Generar thumbnail si es imagen o video
                if (messageType === prisma_1.MessageType.IMAGE || messageType === prisma_1.MessageType.VIDEO) {
                    yield this.generateThumbnail(mediaFile);
                }
                // Extraer metadata adicional
                if (messageType === prisma_1.MessageType.AUDIO || messageType === prisma_1.MessageType.VIDEO) {
                    mediaFile.metadata = yield this.extractMediaMetadata(mediaFile.path);
                }
                console.log('✅ Archivo multimedia procesado exitosamente');
                return mediaFile;
            }
            catch (error) {
                console.error('❌ Error procesando archivo multimedia:', error);
                throw error;
            }
        });
    }
    /**
     * Generar thumbnail (placeholder - requiere imagemagick o sharp)
     */
    generateThumbnail(mediaFile) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // TODO: Implementar generación de thumbnails con sharp o imagemagick
                console.log('🖼️ Generando thumbnail para:', mediaFile.filename);
                // Por ahora, solo registramos la intención
            }
            catch (error) {
                console.error('❌ Error generando thumbnail:', error);
            }
        });
    }
    /**
     * Extraer metadata de archivos multimedia
     */
    extractMediaMetadata(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // TODO: Implementar extracción de metadata con ffprobe
                console.log('🔍 Extrayendo metadata de:', filePath);
                return {};
            }
            catch (error) {
                console.error('❌ Error extrayendo metadata:', error);
                return {};
            }
        });
    }
    /**
     * Obtener extensión de archivo basada en MIME type
     */
    getFileExtension(mimeType) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
            'text/plain': 'txt',
            'text/csv': 'csv',
            'audio/aac': 'aac',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3',
            'audio/amr': 'amr',
            'audio/ogg': 'ogg',
            'video/mp4': 'mp4',
            'video/3gpp': '3gp'
        };
        return mimeToExt[mimeType] || 'bin';
    }
    /**
     * Limpiar archivos antiguos
     */
    cleanupOldFiles() {
        return __awaiter(this, arguments, void 0, function* (olderThanDays = 30) {
            try {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                const files = yield fs_2.promises.readdir(this.mediaDir);
                let deletedCount = 0;
                for (const file of files) {
                    const filePath = path_1.default.join(this.mediaDir, file);
                    const stats = yield fs_2.promises.stat(filePath);
                    if (stats.mtime < cutoffDate) {
                        yield fs_2.promises.unlink(filePath);
                        deletedCount++;
                    }
                }
                console.log(`🗑️ Archivos antiguos eliminados: ${deletedCount}`);
                return deletedCount;
            }
            catch (error) {
                console.error('❌ Error limpiando archivos antiguos:', error);
                return 0;
            }
        });
    }
    /**
     * Obtener estadísticas de almacenamiento
     */
    getStorageStats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = yield fs_2.promises.readdir(this.mediaDir);
                let totalSize = 0;
                const typeBreakdown = {};
                for (const file of files) {
                    const filePath = path_1.default.join(this.mediaDir, file);
                    const stats = yield fs_2.promises.stat(filePath);
                    totalSize += stats.size;
                    const extension = path_1.default.extname(file).toLowerCase().slice(1);
                    typeBreakdown[extension] = (typeBreakdown[extension] || 0) + 1;
                }
                return {
                    totalFiles: files.length,
                    totalSize,
                    averageFileSize: files.length > 0 ? totalSize / files.length : 0,
                    typeBreakdown
                };
            }
            catch (error) {
                console.error('❌ Error obteniendo estadísticas:', error);
                return {
                    totalFiles: 0,
                    totalSize: 0,
                    averageFileSize: 0,
                    typeBreakdown: {}
                };
            }
        });
    }
}
exports.MediaService = MediaService;
// Instancia singleton
exports.mediaService = new MediaService();
