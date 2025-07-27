import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "../hooks/useChat";
import { useApp } from "../context/AppContext";
import { useWhatsApp } from "../hooks/useWhatsApp";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { useWebSocketOptimized } from "../hooks/useWebSocketOptimized";
import MediaMessage from "./MediaMessage";
import MediaUpload from "./MediaUpload";
import type { Message } from "../types";

// Componente optimizado para una burbuja de mensaje individual
const MessageBubbleOptimized: React.FC<{ 
  message: Message; 
  isOwn: boolean;
  getRelativeTime: (date: Date) => string;
  isNew?: boolean;
}> = React.memo(({ message, isOwn, getRelativeTime, isNew = false }) => {
  const bubbleClass = isOwn 
    ? "self-end bg-embler-yellow text-embler-dark" 
    : message.senderId === 'bot'
      ? "self-start bg-blue-600 text-white"
      : "self-start bg-gray-700 text-white";

  const senderName = isOwn 
    ? "Tú" 
    : message.senderId === 'bot'
      ? "🤖 IA Asistente"
      : "Cliente";

  // Determinar si es un mensaje de texto o media
  const isTextMessage = message.type === 'text' || message.message_type === 'text' || !message.type;
  const hasMedia = message.metadata?.mediaUrl || message.metadata?.media_url;

  // Animación para mensajes nuevos
  const animationClass = isNew ? "animate-pulse" : "";

  return (
    <div className={`flex flex-col ${bubbleClass} rounded-lg px-4 py-2 max-w-[70%] break-words ${animationClass}`}>
      <div className="text-xs opacity-75 mb-1 font-medium">
        {senderName}
      </div>
      
      {isTextMessage && !hasMedia ? (
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        <MediaMessage 
          message={{
            id: message.id.toString(),
            type: (message.type || message.message_type || 'text').toUpperCase() as 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER',
            mediaUrl: message.metadata?.mediaUrl || message.metadata?.media_url,
            mediaCaption: message.metadata?.caption || message.metadata?.media_caption,
            content: message.content,
            timestamp: message.timestamp || new Date(message.created_at || Date.now()),
            isOwn
          }}
          standalone={false}
        />
      )}
      
      <div className="text-xs opacity-70 mt-1 text-right">
        {getRelativeTime(message.timestamp || new Date(message.created_at || Date.now()))}
      </div>
    </div>
  );
});

MessageBubbleOptimized.displayName = 'MessageBubbleOptimized';

// Componente optimizado para la lista de mensajes
const MessagesListOptimized: React.FC<{
  messages: Message[];
  getRelativeTime: (date: Date) => string;
  isOwnMessage: (message: Message) => boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}> = React.memo(({ messages, getRelativeTime, isOwnMessage, messagesEndRef }) => {
  // Memoizar los mensajes para evitar re-renders innecesarios
  const memoizedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const isNew = index === messages.length - 1 && 
        Date.now() - new Date(message.timestamp || message.created_at || Date.now()).getTime() < 5000;
      
      return (
        <MessageBubbleOptimized
          key={`${message.id}-${message.timestamp || message.created_at}`}
          message={message}
          isOwn={isOwnMessage(message)}
          getRelativeTime={getRelativeTime}
          isNew={isNew}
        />
      );
    });
  }, [messages, getRelativeTime, isOwnMessage]);

  return (
    <div className="flex flex-col space-y-2 p-4">
      {memoizedMessages}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessagesListOptimized.displayName = 'MessagesListOptimized';

// Componente optimizado para el indicador de escritura
const TypingIndicator: React.FC<{ isTyping: boolean }> = React.memo(({ isTyping }) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-center space-x-2 p-4">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-sm text-gray-500">Escribiendo...</span>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// Componente optimizado para el estado de conexión
const ConnectionStatus: React.FC<{
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor';
  retryCount: number;
}> = React.memo(({ isConnected, connectionQuality, retryCount }) => {
  const getStatusColor = () => {
    if (!isConnected) return 'text-red-500';
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    if (!isConnected) return 'Desconectado';
    switch (connectionQuality) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Buena';
      case 'poor': return 'Débil';
      default: return 'Conectado';
    }
  };

  return (
    <div className={`flex items-center space-x-2 text-xs ${getStatusColor()}`}>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-current' : 'bg-red-500'}`}></div>
      <span>{getStatusText()}</span>
      {retryCount > 0 && (
        <span className="text-gray-400">({retryCount})</span>
      )}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

const ChatPanelOptimized: React.FC = () => {
  const { currentChat, currentMessages: messages, sendMessage, getRelativeTime, isOwnMessage } = useChat();
  const { updateChatTakeoverMode } = useApp();
  const { 
    sendMessage: sendWhatsAppMessage
  } = useWhatsApp();
  const { isUploading } = useMediaUpload({
    apiBaseUrl: import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'http://localhost:3002'),
  });

  // WebSocket optimizado
  const {
    isConnected,
    connectionQuality,
    retryCount,
    joinConversation,
    leaveConversation
  } = useWebSocketOptimized({
    maxRetries: 10,
    baseDelay: 300,
    heartbeatInterval: 20000,
    messageQueueSize: 50
  });

  // States existentes
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Estados para WhatsApp
  const [whatsappMode, setWhatsappMode] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // Estados para takeover
  const [takeoverMode, setTakeoverMode] = useState<'spectator' | 'takeover' | 'ai_only'>('spectator');
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Auto-scroll optimizado con debounce
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Detectar nuevos mensajes y hacer scroll automático
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const newMessagesCount = messages.length - lastMessageCountRef.current;
      lastMessageCountRef.current = messages.length;
      
      // Scroll automático solo si hay nuevos mensajes
      if (newMessagesCount > 0) {
        setTimeout(scrollToBottom, 100);
      }
    }
  }, [messages.length, scrollToBottom]);

  // Unirse/salir de conversaciones cuando cambia el chat
  useEffect(() => {
    if (currentChat?.id) {
      joinConversation(currentChat.id);
      
      return () => {
        leaveConversation(currentChat.id);
      };
    }
  }, [currentChat?.id, joinConversation, leaveConversation]);

  // Simular indicador de escritura cuando se reciben mensajes
  useEffect(() => {
    if (messages.length > 0 && !isOwnMessage(messages[messages.length - 1])) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, isOwnMessage]);

  // Funciones utilitarias
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const isValid = cleaned.length >= 10 && cleaned.length <= 15;
    return {
      isValid,
      message: cleaned.length < 10 ? 'Número muy corto' : cleaned.length > 15 ? 'Número muy largo' : '',
      error: !isValid ? (cleaned.length < 10 ? 'Número muy corto' : 'Número muy largo') : undefined,
      formatted: `+${cleaned}`
    };
  };



  // Funciones para takeover
  const getCurrentConversationId = (): string | null => {
    if (!currentChat?.id) return null;
    
    // Si el ID ya es un UUID (sin prefijo conv-), usarlo directamente
    if (currentChat.id.includes('-')) {
      return currentChat.id;
    }
    
    // Si es un ID de conversación de WhatsApp, extraer el UUID
    if (currentChat.id.startsWith('whatsapp-')) {
      const parts = currentChat.id.split('-');
      if (parts.length >= 3) {
        return parts.slice(2).join('-'); // Tomar todo después de whatsapp-conv-
      }
    }
    
    return null;
  };

  const loadTakeoverMode = async () => {
    if (!currentChat?.id) return;
    
    try {
      const conversationId = getCurrentConversationId();
      if (!conversationId) return;
      
      const response = await fetch(`/api/chat/takeover/${conversationId}/mode`);
      if (response.ok) {
        const data = await response.json();
        setTakeoverMode(data.mode || 'spectator');
      }
    } catch (error) {
      console.error('Error cargando modo takeover:', error);
    }
  };

  // Cargar modo takeover cuando cambia el chat
  useEffect(() => {
    loadTakeoverMode();
  }, [currentChat?.id]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleTakeover = async () => {
    if (!currentChat?.id || isChangingMode) return;
    
    setIsChangingMode(true);
    try {
      const conversationId = getCurrentConversationId();
      if (!conversationId) return;
      
      const newMode = takeoverMode === 'spectator' ? 'takeover' : 'spectator';
      const response = await fetch(`/api/chat/takeover/${conversationId}/mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      
      if (response.ok) {
        setTakeoverMode(newMode);
        updateChatTakeoverMode(currentChat.id, newMode);
      }
    } catch (error) {
      console.error('Error cambiando modo takeover:', error);
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentChat?.id || isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    try {
      const conversationId = getCurrentConversationId();
      if (!conversationId) return;
      
      const response = await fetch(`/api/chat/takeover/${conversationId}/summary`);
      if (response.ok) {
        const data = await response.json();
        console.log('Resumen generado:', data);
        // TODO: Implementar modal de resumen cuando sea necesario
      }
    } catch (error) {
      console.error('Error generando resumen:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChat) return;
    
    const messageContent = newMessage.trim();
    setNewMessage("");
    
    try {
      if (whatsappMode && whatsappNumber) {
        await sendWhatsAppMessage({ to: whatsappNumber, message: messageContent });
      } else {
        await sendMessage(messageContent);
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const handleSendWhatsAppMessage = async () => {
    if (!whatsappNumber || !newMessage.trim()) return;
    
    const validation = validatePhone(whatsappNumber);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }
    
    try {
      await sendWhatsAppMessage({ to: validation.formatted, message: newMessage.trim() });
      setNewMessage("");
      setWhatsappNumber("");
      setWhatsappMode(false);
    } catch (error) {
      console.error('Error enviando mensaje WhatsApp:', error);
    }
  };

  // Memoizar el componente de lista de mensajes
  const messagesList = useMemo(() => (
    <MessagesListOptimized
      messages={messages}
      getRelativeTime={getRelativeTime}
      isOwnMessage={isOwnMessage}
      messagesEndRef={messagesEndRef}
    />
  ), [messages, getRelativeTime, isOwnMessage]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-white mb-2">Selecciona un chat</h2>
          <p className="text-gray-400">Elige una conversación para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {/* Header optimizado */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-embler-yellow rounded-full flex items-center justify-center">
              <span className="text-embler-dark font-bold text-lg">
                {currentChat.clientName?.charAt(0) || 'C'}
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold">{currentChat.clientName || 'Cliente'}</h3>
              <ConnectionStatus 
                isConnected={isConnected}
                connectionQuality={connectionQuality}
                retryCount={retryCount}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentChat.id.startsWith('whatsapp-') && (
              <>
                <button
                  onClick={handleToggleTakeover}
                  disabled={isChangingMode}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    takeoverMode === 'takeover'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isChangingMode ? '...' : takeoverMode === 'takeover' ? 'Salir' : 'Tomar'}
                </button>
                
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                >
                  {isGeneratingSummary ? 'Generando...' : 'Resumen'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Área de mensajes optimizada */}
      <div className="flex-1 overflow-y-auto messages-container">
        {messagesList}
        <TypingIndicator isTyping={isTyping} />
      </div>

      {/* Input optimizado */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        {whatsappMode ? (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Número de teléfono"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-embler-yellow focus:outline-none"
            />
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-embler-yellow focus:outline-none"
              />
              <button
                onClick={handleSendWhatsAppMessage}
                className="px-4 py-2 bg-embler-yellow text-embler-dark font-medium rounded hover:bg-yellow-400 transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMediaUpload(!showMediaUpload)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              📎
            </button>
            
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-embler-yellow focus:outline-none"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-embler-yellow text-embler-dark font-medium rounded hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        )}
        
        {showMediaUpload && (
          <MediaUpload
            onUpload={(file) => {
              console.log('Media uploaded:', file);
              setShowMediaUpload(false);
            }}
            onUploadAndSend={(file, caption) => {
              console.log('Media uploaded and sent:', file, caption);
              setShowMediaUpload(false);
            }}
            isUploading={isUploading}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPanelOptimized; 