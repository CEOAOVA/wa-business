/**
 * Componente para mostrar historial de mensajes con virtualización
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { useMessageHistory } from '../hooks/useMessageHistory';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessageHistoryProps {
  conversationId: string;
  height: number;
  width: number;
  onMessageClick?: (message: any) => void;
}

const MessageHistory: React.FC<MessageHistoryProps> = ({
  conversationId,
  height,
  width,
  onMessageClick
}) => {
  const {
    messages,
    loading,
    error,
    hasMore,
    loadInitialMessages,
    loadMore
  } = useMessageHistory(conversationId);

  const listRef = useRef<List>(null);
  const rowHeights = useRef<{ [key: number]: number }>({});

  // Cargar mensajes iniciales
  useEffect(() => {
    loadInitialMessages();
  }, [conversationId, loadInitialMessages]);

  // Calcular altura de fila basado en contenido
  const getItemSize = useCallback((index: number) => {
    return rowHeights.current[index] || 100; // Altura por defecto
  }, []);

  // Guardar altura real después de renderizar
  const setItemSize = useCallback((index: number, size: number) => {
    rowHeights.current[index] = size;
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  // Manejar scroll para cargar más mensajes
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) return;
    
    // Si llegamos al top, cargar más mensajes antiguos
    if (scrollOffset < 100 && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Renderizar mensaje individual
  const MessageRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (rowRef.current) {
        const height = rowRef.current.getBoundingClientRect().height;
        setItemSize(index, height + 16); // +16 para padding
      }
    }, [index, message.content]);

    const formatTime = (timestamp: string) => {
      return format(new Date(timestamp), 'HH:mm', { locale: es });
    };

    const formatDate = (timestamp: string) => {
      return format(new Date(timestamp), 'dd/MM/yyyy', { locale: es });
    };

    // Mostrar separador de fecha si es necesario
    const showDateSeparator = index === 0 || 
      formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);

    return (
      <div style={style} className="px-4">
        {showDateSeparator && (
          <div className="text-center my-4">
            <span className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-400">
              {formatDate(message.timestamp)}
            </span>
          </div>
        )}
        
        <div
          ref={rowRef}
          className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'} mb-2`}
          onClick={() => onMessageClick?.(message)}
        >
          <div
            className={`
              max-w-[70%] rounded-lg p-3 shadow-sm
              ${message.isFromMe 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
            `}
          >
            {/* Nombre del contacto */}
            {!message.isFromMe && message.contact && (
              <div className="text-xs font-semibold mb-1 opacity-75">
                {message.contact.name || message.from}
              </div>
            )}

            {/* Contenido del mensaje */}
            <div className="break-words whitespace-pre-wrap">
              {message.content}
            </div>

            {/* Media */}
            {message.mediaUrl && (
              <div className="mt-2">
                {message.mediaType?.startsWith('image/') && (
                  <img 
                    src={message.mediaUrl} 
                    alt="Imagen" 
                    className="max-w-full rounded"
                    loading="lazy"
                  />
                )}
                {message.mediaType?.startsWith('video/') && (
                  <video 
                    src={message.mediaUrl} 
                    controls 
                    className="max-w-full rounded"
                  />
                )}
                {message.mediaType?.startsWith('audio/') && (
                  <audio 
                    src={message.mediaUrl} 
                    controls 
                    className="w-full"
                  />
                )}
                {!['image/', 'video/', 'audio/'].some(type => message.mediaType?.startsWith(type)) && (
                  <a 
                    href={message.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    📎 Archivo adjunto
                  </a>
                )}
              </div>
            )}

            {/* Hora y estado */}
            <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${
              message.isFromMe ? 'text-blue-100' : 'text-gray-500'
            }`}>
              <span>{formatTime(message.timestamp)}</span>
              
              {/* Indicadores de estado para mensajes enviados */}
              {message.isFromMe && (
                <span>
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && (
                    <span className="text-blue-300">✓✓</span>
                  )}
                  {message.status === 'failed' && '❌'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold mb-2">Error cargando mensajes</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={loadInitialMessages}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white dark:bg-gray-800">
      {/* Indicador de carga superior */}
      {loading && messages.length > 0 && (
        <div className="absolute top-0 left-0 right-0 flex justify-center p-2 bg-white dark:bg-gray-800 z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Lista virtualizada */}
      <List
        ref={listRef}
        height={height}
        width={width}
        itemCount={messages.length}
        itemSize={getItemSize}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        initialScrollOffset={0}
        overscanCount={5}
      >
        {MessageRow}
      </List>

      {/* Sin mensajes */}
      {messages.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No hay mensajes en esta conversación</p>
        </div>
      )}
    </div>
  );
};

export default MessageHistory;
