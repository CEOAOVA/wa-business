/**
 * Servicio de medios multimedia para WhatsApp Business API
 * Maneja imágenes, documentos, audio, video y otros archivos
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { whatsappConfig, buildApiUrl, getHeaders } from '../config/whatsapp';
import { databaseService } from './database.service';
import { MessageType } from '../generated/prisma';

// Tipos de medios soportados
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  metadata?: MediaMetadata;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  bitrate?: number;
  title?: string;
  artist?: string;
  album?: string;
}

export interface WhatsAppMediaResponse {
  messaging_product: string;
  url?: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
  id: string;
}

export interface MediaUploadResult {
  mediaId: string;
  mediaUrl: string;
  mediaPath: string;
  mediaType: MessageType;
  metadata?: MediaMetadata;
}

export class MediaService {
  private readonly mediaDir: string;
  private readonly thumbnailDir: string;
  private readonly maxFileSize: number;
  
  // Tipos MIME soportados por WhatsApp
  private readonly supportedMimeTypes = {
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

  constructor() {
    this.mediaDir = path.join(process.cwd(), 'uploads', 'media');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.maxFileSize = 16 * 1024 * 1024; // 16MB limit for WhatsApp
    
    this.initializeDirectories();
  }

  /**
   * Inicializar directorios de medios
   */
  private async initializeDirectories() {
    try {
      await fsPromises.mkdir(this.mediaDir, { recursive: true });
      await fsPromises.mkdir(this.thumbnailDir, { recursive: true });
      console.log('📁 Directorios de medios inicializados');
    } catch (error) {
      console.error('❌ Error creando directorios de medios:', error);
    }
  }

  /**
   * Obtener tipo de mensaje basado en MIME type
   */
  getMessageType(mimeType: string): MessageType {
    if (this.supportedMimeTypes.image.includes(mimeType)) return MessageType.IMAGE;
    if (this.supportedMimeTypes.document.includes(mimeType)) return MessageType.DOCUMENT;
    if (this.supportedMimeTypes.audio.includes(mimeType)) return MessageType.AUDIO;
    if (this.supportedMimeTypes.video.includes(mimeType)) return MessageType.VIDEO;
    if (this.supportedMimeTypes.sticker.includes(mimeType)) return MessageType.STICKER;
    return MessageType.DOCUMENT; // Por defecto
  }

  /**
   * Validar archivo multimedia
   */
  validateMediaFile(file: { mimetype: string; size: number }): { valid: boolean; error?: string } {
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
  async uploadMediaToWhatsApp(filePath: string, filename: string): Promise<string> {
    try {
      console.log('📤 Subiendo archivo a WhatsApp:', filename);
      
      const formData = new FormData();
      const fileBuffer = await fsPromises.readFile(filePath);
      const blob = new Blob([fileBuffer]);
      
      formData.append('file', blob, filename);
      formData.append('messaging_product', 'whatsapp');

      const response = await axios.post(
        buildApiUrl(`${whatsappConfig.phoneNumberId}/media`),
        formData,
        {
          headers: {
            ...getHeaders(),
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const mediaId = response.data.id;
      console.log('✅ Archivo subido exitosamente, Media ID:', mediaId);
      
      return mediaId;
    } catch (error: any) {
      console.error('❌ Error subiendo archivo a WhatsApp:', error.response?.data || error.message);
      throw new Error(`Error subiendo archivo: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Descargar archivo multimedia desde WhatsApp
   */
  async downloadMediaFromWhatsApp(mediaId: string): Promise<MediaFile> {
    try {
      console.log('📥 Descargando archivo de WhatsApp:', mediaId);

      // Obtener URL del archivo
      const mediaInfoResponse = await axios.get(
        buildApiUrl(mediaId),
        { headers: getHeaders() }
      );

      const mediaInfo = mediaInfoResponse.data;
      const mediaUrl = mediaInfo.url;
      const mimeType = mediaInfo.mime_type;
      const fileSize = mediaInfo.file_size;

      // Descargar archivo
      const downloadResponse = await axios.get(mediaUrl, {
        headers: getHeaders(),
        responseType: 'stream'
      });

      // Generar nombre de archivo único
      const fileExtension = this.getFileExtension(mimeType);
      const filename = `${mediaId}_${Date.now()}.${fileExtension}`;
      const filePath = path.join(this.mediaDir, filename);

      // Guardar archivo
      const writer = fs.createWriteStream(filePath);
      downloadResponse.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          console.log('✅ Archivo descargado exitosamente:', filename);
          
          const mediaFile: MediaFile = {
            id: mediaId,
            filename,
            originalName: filename,
            mimetype: mimeType,
            size: fileSize,
            path: filePath,
            url: mediaUrl
          };

          resolve(mediaFile);
        });

        writer.on('error', reject);
      });
    } catch (error: any) {
      console.error('❌ Error descargando archivo:', error.response?.data || error.message);
      throw new Error(`Error descargando archivo: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Enviar mensaje multimedia
   */
  async sendMediaMessage(options: {
    to: string;
    mediaId: string;
    mediaType: MessageType;
    caption?: string;
    filename?: string;
  }): Promise<any> {
    try {
      const { to, mediaId, mediaType, caption, filename } = options;
      
      console.log('📱 Enviando mensaje multimedia:', { to, mediaType, mediaId });

      let messageBody: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: mediaType.toLowerCase()
      };

      // Configurar cuerpo del mensaje según el tipo
      switch (mediaType) {
        case MessageType.IMAGE:
          messageBody.image = {
            id: mediaId,
            caption: caption || ''
          };
          break;

        case MessageType.DOCUMENT:
          messageBody.document = {
            id: mediaId,
            caption: caption || '',
            filename: filename || 'document'
          };
          break;

        case MessageType.AUDIO:
          messageBody.audio = {
            id: mediaId
          };
          break;

        case MessageType.VIDEO:
          messageBody.video = {
            id: mediaId,
            caption: caption || ''
          };
          break;

        case MessageType.STICKER:
          messageBody.sticker = {
            id: mediaId
          };
          break;

        default:
          throw new Error(`Tipo de media no soportado: ${mediaType}`);
      }

      const response = await axios.post(
        buildApiUrl(`${whatsappConfig.phoneNumberId}/messages`),
        messageBody,
        { headers: getHeaders() }
      );

      console.log('✅ Mensaje multimedia enviado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error enviando mensaje multimedia:', error.response?.data || error.message);
      throw new Error(`Error enviando mensaje: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Procesar archivo multimedia recibido
   */
  async processIncomingMedia(mediaId: string, messageType: MessageType): Promise<MediaFile> {
    try {
      console.log('🔄 Procesando archivo multimedia recibido:', mediaId);
      
      const mediaFile = await this.downloadMediaFromWhatsApp(mediaId);
      
      // Generar thumbnail si es imagen o video
      if (messageType === MessageType.IMAGE || messageType === MessageType.VIDEO) {
        await this.generateThumbnail(mediaFile);
      }
      
      // Extraer metadata adicional
      if (messageType === MessageType.AUDIO || messageType === MessageType.VIDEO) {
        mediaFile.metadata = await this.extractMediaMetadata(mediaFile.path);
      }

      console.log('✅ Archivo multimedia procesado exitosamente');
      return mediaFile;
    } catch (error: any) {
      console.error('❌ Error procesando archivo multimedia:', error);
      throw error;
    }
  }

  /**
   * Generar thumbnail (placeholder - requiere imagemagick o sharp)
   */
  private async generateThumbnail(mediaFile: MediaFile): Promise<void> {
    try {
      // TODO: Implementar generación de thumbnails con sharp o imagemagick
      console.log('🖼️ Generando thumbnail para:', mediaFile.filename);
      // Por ahora, solo registramos la intención
    } catch (error) {
      console.error('❌ Error generando thumbnail:', error);
    }
  }

  /**
   * Extraer metadata de archivos multimedia
   */
  private async extractMediaMetadata(filePath: string): Promise<MediaMetadata> {
    try {
      // TODO: Implementar extracción de metadata con ffprobe
      console.log('🔍 Extrayendo metadata de:', filePath);
      return {};
    } catch (error) {
      console.error('❌ Error extrayendo metadata:', error);
      return {};
    }
  }

  /**
   * Obtener extensión de archivo basada en MIME type
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
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
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = await fsPromises.readdir(this.mediaDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.mediaDir, file);
        const stats = await fsPromises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fsPromises.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`🗑️ Archivos antiguos eliminados: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error limpiando archivos antiguos:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    typeBreakdown: { [key: string]: number };
  }> {
    try {
      const files = await fsPromises.readdir(this.mediaDir);
      let totalSize = 0;
      const typeBreakdown: { [key: string]: number } = {};

      for (const file of files) {
        const filePath = path.join(this.mediaDir, file);
        const stats = await fsPromises.stat(filePath);
        totalSize += stats.size;

        const extension = path.extname(file).toLowerCase().slice(1);
        typeBreakdown[extension] = (typeBreakdown[extension] || 0) + 1;
      }

      return {
        totalFiles: files.length,
        totalSize,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        typeBreakdown
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        typeBreakdown: {}
      };
    }
  }
}

// Instancia singleton
export const mediaService = new MediaService(); 