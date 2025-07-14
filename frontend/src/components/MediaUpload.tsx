import React, { useState, useRef } from 'react';
import { Upload, File, Image, Video, Music, FileText, Paperclip, X, Send } from 'lucide-react';

interface MediaUploadProps {
  onUpload: (file: File) => void;
  onUploadAndSend: (file: File, caption?: string) => void;
  isUploading: boolean;
  contactId?: string;
}

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  onUpload,
  onUploadAndSend,
  isUploading,
  contactId
}) => {
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null);
  const [caption, setCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const supportedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    video: ['video/mp4', 'video/3gpp', 'video/quicktime'],
    audio: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'],
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
    ]
  };

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' | 'other' => {
    const mimeType = file.type;
    if (supportedTypes.image.includes(mimeType)) return 'image';
    if (supportedTypes.video.includes(mimeType)) return 'video';
    if (supportedTypes.audio.includes(mimeType)) return 'audio';
    if (supportedTypes.document.includes(mimeType)) return 'document';
    return 'other';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-8 h-8 text-green-500" />;
      case 'video':
        return <Video className="w-8 h-8 text-blue-500" />;
      case 'audio':
        return <Music className="w-8 h-8 text-purple-500" />;
      case 'document':
        return <FileText className="w-8 h-8 text-red-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const isValidFile = (file: File): boolean => {
    const allTypes = [
      ...supportedTypes.image,
      ...supportedTypes.video,
      ...supportedTypes.audio,
      ...supportedTypes.document
    ];
    return allTypes.includes(file.type) && file.size <= 16 * 1024 * 1024; // 16MB
  };

  const handleFileSelect = (file: File) => {
    if (!isValidFile(file)) {
      alert('Archivo no válido. Verifique el tipo y tamaño (máximo 16MB).');
      return;
    }

    const fileType = getFileType(file);
    const url = URL.createObjectURL(file);
    
    setSelectedFile({ file, url, type: fileType });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile.file);
      clearSelection();
    }
  };

  const handleUploadAndSend = () => {
    if (selectedFile) {
      onUploadAndSend(selectedFile.file, caption);
      clearSelection();
    }
  };

  const clearSelection = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.url);
    }
    setSelectedFile(null);
    setCaption('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
      {!selectedFile ? (
        <div
          className={`text-center ${dragActive ? 'border-blue-500 bg-blue-50' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Subir archivo multimedia
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Arrastra y suelta un archivo aquí, o haz clic para seleccionar
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.mp4,.3gp,.mov,.aac,.mp3,.ogg,.amr,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Seleccionar archivo
          </button>
          <div className="mt-4 text-xs text-gray-500">
            <p>Tipos soportados: Imágenes, Videos, Audio, Documentos</p>
            <p>Tamaño máximo: 16MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Archivo seleccionado</h3>
            <button
              onClick={clearSelection}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.file.name}
              </p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.file.size)}
              </p>
            </div>
          </div>

          {/* Vista previa para imágenes */}
          {selectedFile.type === 'image' && (
            <div className="mt-4">
              <img
                src={selectedFile.url}
                alt="Vista previa"
                className="max-w-full max-h-64 object-contain rounded-lg border"
              />
            </div>
          )}

          {/* Vista previa para videos */}
          {selectedFile.type === 'video' && (
            <div className="mt-4">
              <video
                src={selectedFile.url}
                controls
                className="max-w-full max-h-64 rounded-lg border"
              />
            </div>
          )}

          {/* Caption para imágenes y videos */}
          {(selectedFile.type === 'image' || selectedFile.type === 'video') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Agregar una descripción..."
                disabled={isUploading}
              />
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Subiendo...' : 'Solo subir'}
            </button>
            
            {contactId && (
              <button
                onClick={handleUploadAndSend}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Send className="mr-2 h-4 w-4" />
                {isUploading ? 'Enviando...' : 'Subir y enviar'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload; 