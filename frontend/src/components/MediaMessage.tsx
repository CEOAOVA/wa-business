import React, { useState } from 'react';
import { Download, Play, Pause, Volume2, File, FileText, Image, Video, Music, Eye, X } from 'lucide-react';

interface MediaMessageProps {
  message: {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER';
    mediaUrl?: string;
    mediaCaption?: string;
    content: string;
    timestamp: Date;
    isOwn: boolean;
  };
  onDownload?: (mediaUrl: string, filename: string) => void;
}

const MediaMessage: React.FC<MediaMessageProps> = ({ message, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Image className="w-6 h-6 text-green-500" />;
      case 'VIDEO':
        return <Video className="w-6 h-6 text-blue-500" />;
      case 'AUDIO':
        return <Music className="w-6 h-6 text-purple-500" />;
      case 'DOCUMENT':
        return <FileText className="w-6 h-6 text-red-500" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleAudioToggle = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (message.mediaUrl && onDownload) {
      const filename = `${message.type.toLowerCase()}_${message.id}`;
      onDownload(message.mediaUrl, filename);
    }
  };

  const handleFullScreenToggle = () => {
    setShowFullScreen(!showFullScreen);
  };

  const renderImageMessage = () => (
    <div className="relative max-w-xs">
      <img
        src={message.mediaUrl}
        alt={message.mediaCaption || 'Imagen'}
        className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleFullScreenToggle}
        loading="lazy"
      />
      <div className="absolute top-2 right-2 flex space-x-1">
        <button
          onClick={handleFullScreenToggle}
          className="p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      {message.mediaCaption && (
        <p className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded">
          {message.mediaCaption}
        </p>
      )}
    </div>
  );

  const renderVideoMessage = () => (
    <div className="relative max-w-xs">
      <video
        controls
        className="rounded-lg max-w-full h-auto"
        preload="metadata"
      >
        <source src={message.mediaUrl} type="video/mp4" />
        Tu navegador no soporta video.
      </video>
      <button
        onClick={handleDownload}
        className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
      >
        <Download className="w-4 h-4" />
      </button>
      {message.mediaCaption && (
        <p className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded">
          {message.mediaCaption}
        </p>
      )}
    </div>
  );

  const renderAudioMessage = () => (
    <div className="flex items-center space-x-3 bg-gray-100 p-3 rounded-lg max-w-xs">
      <button
        onClick={handleAudioToggle}
        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Audio</span>
        </div>
        <audio
          ref={setAudioRef}
          src={message.mediaUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
      
      <button
        onClick={handleDownload}
        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );

  const renderDocumentMessage = () => (
    <div className="flex items-center space-x-3 bg-gray-100 p-3 rounded-lg max-w-xs">
      {getFileIcon(message.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {message.content || 'Documento'}
        </p>
        <p className="text-xs text-gray-500">
          {message.type}
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );

  const renderStickerMessage = () => (
    <div className="relative">
      <img
        src={message.mediaUrl}
        alt="Sticker"
        className="max-w-32 max-h-32 object-contain"
        loading="lazy"
      />
      <button
        onClick={handleDownload}
        className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
      >
        <Download className="w-3 h-3" />
      </button>
    </div>
  );

  const renderMediaContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return renderImageMessage();
      case 'VIDEO':
        return renderVideoMessage();
      case 'AUDIO':
        return renderAudioMessage();
      case 'DOCUMENT':
        return renderDocumentMessage();
      case 'STICKER':
        return renderStickerMessage();
      default:
        return <div className="text-gray-500">Tipo de media no soportado</div>;
    }
  };

  return (
    <>
      <div className={`flex mb-4 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`
          max-w-xs lg:max-w-md px-4 py-2 rounded-lg
          ${message.isOwn 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-900 border border-gray-200'
          }
        `}>
          {renderMediaContent()}
          
          <div className={`
            text-xs mt-2 
            ${message.isOwn ? 'text-blue-100' : 'text-gray-500'}
          `}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>

      {/* Modal de pantalla completa para imágenes */}
      {showFullScreen && message.type === 'IMAGE' && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-full max-h-full p-4">
            <button
              onClick={handleFullScreenToggle}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={message.mediaUrl}
              alt={message.mediaCaption || 'Imagen'}
              className="max-w-full max-h-full object-contain"
            />
            {message.mediaCaption && (
              <div className="absolute bottom-4 left-4 right-4 text-white text-center">
                <p className="bg-black bg-opacity-50 p-2 rounded">
                  {message.mediaCaption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MediaMessage; 