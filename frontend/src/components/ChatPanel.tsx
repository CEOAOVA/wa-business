import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { useWhatsApp } from "../hooks/useWhatsApp";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { MESSAGES } from "../constants/messages";
import MediaMessage from "./MediaMessage";
import MediaUpload from "./MediaUpload";
import ContactInfoComponent from "./ContactInfo";
import whatsappApi from "../services/whatsapp-api";
import type { Message } from "../types";

// Componente para una burbuja de mensaje individual
const MessageBubble: React.FC<{ 
  message: Message; 
  isOwn: boolean;
  getRelativeTime: (date: Date) => string;
}> = ({ message, isOwn, getRelativeTime }) => {
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

  return (
    <div className={`flex flex-col ${bubbleClass} rounded-lg px-4 py-2 max-w-[70%] break-words`}>
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
};

const ChatPanel: React.FC = () => {
  const { currentChat, currentMessages: messages, sendMessage, getRelativeTime, isOwnMessage } = useChat();
  const { state: authState, logout } = useAuth();
  const { updateChatTakeoverMode } = useApp();
  const { 
    sendMessage: sendWhatsAppMessage, 
    checkConnection: checkWhatsAppConnection,
    connectionStatus
  } = useWhatsApp();
  const { isUploading } = useMediaUpload({
    apiBaseUrl: import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'http://localhost:3002'),
  });

  // States existentes
  const [newMessage, setNewMessage] = useState("");
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados para WhatsApp
  const [whatsappMode, setWhatsappMode] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // Estados para takeover
  const [takeoverMode, setTakeoverMode] = useState<'spectator' | 'takeover' | 'ai_only'>('spectator');
  const [isLoadingTakeoverMode, setIsLoadingTakeoverMode] = useState(false);
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // NUEVO: Estado para información de contacto
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Auto-scroll a mensajes más recientes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-scroll inmediato cuando se carga un nuevo chat
  useEffect(() => {
    if (currentChat && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [currentChat?.id]);

  // Función para scroll manual al final
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Función para scroll manual al inicio
  const scrollToTop = useCallback(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

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

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Funciones para takeover
  const getCurrentConversationId = (): string | null => {
    if (!currentChat?.id) return null;
    
    // Si el ID ya es un UUID (sin prefijo conv-), usarlo directamente
    if (!currentChat.id.startsWith('conv-')) {
      return currentChat.id;
    }
    
    // Si tiene prefijo conv-, extraer el ID real
    return currentChat.id.replace('conv-', '');
  };

  // MEJORADO: Cargar modo takeover cuando cambia la conversación
  useEffect(() => {
    const loadTakeoverMode = async () => {
      if (!currentChat) {
        setTakeoverMode('spectator');
        setIsLoadingTakeoverMode(false);
        return;
      }

      setIsLoadingTakeoverMode(true);
      
      try {
        const conversationId = getCurrentConversationId();
        if (conversationId) {
          console.log(`🔍 [ChatPanel] Cargando modo takeover para conversación: ${conversationId}`);
          
          const response = await whatsappApi.getTakeoverMode(conversationId);
          
          if (response && response.success && response.data) {
            const actualMode = response.data.takeoverMode;
            setTakeoverMode(actualMode);
            console.log(`✅ [ChatPanel] Modo takeover cargado: ${actualMode}`);
            
            // Actualizar el chat en el contexto con el modo real
            if (currentChat) {
              updateChatTakeoverMode(currentChat.id, actualMode);
            }
          } else {
            console.warn(`⚠️ [ChatPanel] No se pudo obtener modo takeover, usando valor por defecto`);
            setTakeoverMode('spectator');
          }
        } else {
          console.warn(`⚠️ [ChatPanel] No se pudo obtener conversationId`);
          setTakeoverMode('spectator');
        }
      } catch (error) {
        console.error('❌ [ChatPanel] Error cargando modo takeover:', error);
        setTakeoverMode('spectator');
      } finally {
        setIsLoadingTakeoverMode(false);
      }
    };

    loadTakeoverMode();
  }, [currentChat]);

  // Determinar si el input debe estar deshabilitado
  const isInputDisabled = takeoverMode === 'spectator' || isTyping || isUploading;

  // WhatsApp number effect
  useEffect(() => {
    if (currentChat && !whatsappNumber) {
      setWhatsappNumber(currentChat.clientPhone.replace(/[^0-9]/g, ''));
    }
  }, [currentChat, whatsappNumber]);

  const handleSendMessage = useCallback(async () => {
    if (!currentChat && !whatsappMode) return;
    
    try {
      if (whatsappMode) {
        // Modo WhatsApp: enviar a número específico
        if (!whatsappNumber) return;
        const phoneValidation = validatePhone(whatsappNumber);
        if (!phoneValidation.isValid) {
          alert(`Número inválido: ${phoneValidation.error}`);
          return;
        }

        await sendWhatsAppMessage({
          to: phoneValidation.formatted,
          message: newMessage
        });
      } else {
        // Modo chat normal
        await sendMessage(newMessage);
      }
      
      setNewMessage("");
      setShowMediaUpload(false);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  }, [currentChat, whatsappMode, whatsappNumber, newMessage, sendMessage, sendWhatsAppMessage, validatePhone]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Función de takeover
  const handleToggleTakeover = async () => {
    if (isChangingMode) return;

    setIsChangingMode(true);
    
    try {
      const conversationId = getCurrentConversationId();
      if (!conversationId) {
        alert('❌ No hay conversación activa para cambiar el modo takeover');
        return;
      }

      const newMode: 'spectator' | 'takeover' | 'ai_only' = takeoverMode === 'spectator' ? 'takeover' : 'spectator';
      
      // Llamar al backend para cambiar el modo takeover
      const response = await whatsappApi.setTakeoverMode({
        conversationId,
        mode: newMode,
        agentId: authState.user?.id,
        reason: newMode === 'takeover' ? 'Agente tomó control manualmente' : 'IA reactivada por agente'
      });

      if (response.success) {
        setTakeoverMode(newMode);
        
        // Actualizar el chat en el contexto
        if (currentChat) {
          updateChatTakeoverMode(currentChat.id, newMode);
        }
        
        console.log(`✅ Takeover cambiado a: ${newMode}`, response.data);
        
        // Mostrar notificación de éxito
        const message = newMode === 'takeover' 
          ? `✅ Control tomado por ${authState.user?.name?.split(' ')[0] || 'Usuario'}`
          : '✅ IA reactivada';
        alert(message);
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ Error en takeover:', error);
      alert('Error cambiando modo takeover. Inténtalo de nuevo.');
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    
    // Simular delay de generación
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // FUNCIONAMIENTO LOCAL (sin backend por ahora)
      const mockSummary = {
        clientInfo: {
          name: currentChat?.clientName || 'Cliente',
          phone: currentChat?.clientPhone || 'No especificado',
          location: 'México',
          postalCode: '00000'
        },
        productInfo: {
          product: 'Auto Parts',
          vehicle: 'Automóvil',
          details: 'Consulta sobre repuestos automotrices'
        },
        status: 'in_progress',
        nextAction: 'Seguimiento de consulta',
        generatedAt: new Date().toISOString(),
        totalMessages: messages.length
      };
      
      setConversationSummary(mockSummary);
      setShowSummaryModal(true);
      console.log('✅ Resumen generado exitosamente (local)');
      
    } catch (error) {
      console.error('❌ Error generando resumen:', error);
      alert('Error generando resumen. Inténtalo de nuevo.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!currentChat && !whatsappMode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-embler-dark text-white">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-embler-accent rounded-full flex items-center justify-center mx-auto mb-4">
            {authState.user && (
              <span className="text-2xl font-bold text-embler-dark">
                {authState.user?.name?.split(' ')[0] || 'Usuario'}
              </span>
            )}
          </div>
          <h2 className="text-xl font-semibold">Bienvenido a Embler Chat</h2>
          <p className="text-gray-400 max-w-md">
            Selecciona una conversación para comenzar o usa el modo WhatsApp para enviar mensajes directos.
          </p>
          <button
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
            onClick={() => setWhatsappMode(true)}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Abrir WhatsApp Business
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-embler-dark text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {whatsappMode ? 'WhatsApp Business' : currentChat?.clientName}
            </h2>
            <button
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${whatsappMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              onClick={() => setWhatsappMode(!whatsappMode)}
            >
              {whatsappMode ? '💬' : '📱'}
              {whatsappMode ? MESSAGES.INDICATORS.WHATSAPP_ON : MESSAGES.INDICATORS.WHATSAPP_OFF}
            </button>
          </div>
          
          {/* Indicadores de estado */}
          {!whatsappMode && currentChat?.status === 'assigned' && (
            <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">
              {MESSAGES.INDICATORS.ASSIGNED}
            </span>
          )}
          {!whatsappMode && currentChat?.priority === 'high' && (
            <span className="px-2 py-1 bg-red-600 text-xs rounded-full">
              {MESSAGES.INDICATORS.HIGH_PRIORITY}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {whatsappMode ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Estado: {connectionStatus}</span>
              <button 
                className="text-embler-yellow hover:text-yellow-400 transition-colors"
                onClick={checkWhatsAppConnection}
                title="Verificar conexión"
              >
                🔄
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* NUEVO: Botón de información de contacto */}
              <button
                onClick={() => setShowContactInfo(!showContactInfo)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors flex items-center gap-2"
                title="Información del cliente"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Cliente
              </button>

              {/* Botón de Takeover - Solo se muestra uno según el estado */}
              {!isLoadingTakeoverMode && currentChat && (
                takeoverMode === 'spectator' ? (
                  <button
                    onClick={handleToggleTakeover}
                    disabled={isChangingMode}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-semibold rounded-md transition-all duration-200 shadow-lg border-2 border-orange-400 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tomar control manual"
                  >
                    {isChangingMode ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Tomando Control...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👨‍💼</span>
                        <span>Tomar Control</span>
                      </div>
                    )}
                  </button>
                ) : takeoverMode === 'takeover' ? (
                  <button
                    onClick={handleToggleTakeover}
                    disabled={isChangingMode}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm font-semibold rounded-md transition-all duration-200 shadow-lg border-2 border-green-400 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Activar IA"
                  >
                    {isChangingMode ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Activando IA...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <span>Activar IA</span>
                      </div>
                    )}
                  </button>
                ) : null
              )}

              {/* Mostrar loading solo cuando esté cargando */}
              {isLoadingTakeoverMode && currentChat && (
                <button
                  disabled
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-semibold rounded-md transition-all duration-200 shadow-lg border-2 border-gray-400 opacity-50 cursor-not-allowed"
                  title="Cargando modo takeover..."
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando...</span>
                  </div>
                </button>
              )}

              {/* Botón de Resumen - Siempre visible */}
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold rounded-md transition-all duration-200 shadow-lg border-2 border-blue-400 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                title="Generar resumen de conversación"
              >
                {isGeneratingSummary ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span>Resumen</span>
                  </div>
                )}
              </button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Agente:</span>
                <span className="font-medium">
                  {authState.user?.name?.split(' ')[0] || 'Usuario'}
                </span>
              </div>
            </div>
          )}
          
          <button
            className="text-gray-400 hover:text-red-400 transition-colors"
            onClick={() => {
              logout();
            }}
          >
            🚪 Salir
          </button>
        </div>
      </div>

      {/* NUEVO: Panel lateral de información de contacto */}
      {showContactInfo && currentChat && !whatsappMode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-10 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Información del Cliente</h3>
              <button
                onClick={() => setShowContactInfo(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
                              <ContactInfoComponent
                    phoneNumber={currentChat.clientPhone || ''}
                    onContactUpdate={(contact) => {
                      console.log('Contacto actualizado:', contact);
                      // Aquí podrías actualizar el estado global si es necesario
                    }}
                  />
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-embler-accent scrollbar-track-embler-dark messages-container relative">
        {!whatsappMode && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>{MESSAGES.WELCOME.NO_MESSAGES}</p>
              <p className="text-sm text-gray-500">
                {MESSAGES.WHATSAPP.INSTRUCTIONS}
              </p>
            </div>
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwnMessage(message)}
              getRelativeTime={getRelativeTime}
            />
          ))
        )}
        <div ref={messagesEndRef} />
        
        {/* Botones de navegación de scroll */}
        {messages.length > 5 && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={scrollToTop}
              className="p-2 bg-embler-dark/80 text-embler-yellow rounded-full hover:bg-embler-dark transition-colors shadow-lg"
              title="Ir al inicio"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={scrollToBottom}
              className="p-2 bg-embler-dark/80 text-embler-yellow rounded-full hover:bg-embler-dark transition-colors shadow-lg"
              title="Ir al final"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Input de WhatsApp Number */}
      {whatsappMode && (
        <div className="px-6 py-2 border-t border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Para:</span>
            <input
              type="tel"
              placeholder="Número de WhatsApp"
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white focus:border-embler-yellow focus:outline-none"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <span className="text-xs text-gray-500">
              {whatsappNumber ? formatPhone(whatsappNumber) : ''}
            </span>
          </div>
        </div>
      )}

      {/* Input de mensaje */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex items-end gap-4">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 mb-2">
              <button
                className={`p-2 rounded-lg transition-colors ${showMediaUpload ? 'bg-embler-yellow text-embler-dark' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                disabled={isUploading}
              >
                📎
              </button>
              {isUploading && (
                <span className="text-sm text-embler-yellow">
                  Subiendo archivo...
                </span>
              )}
            </div>
            
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                whatsappMode 
                  ? MESSAGES.INPUT.PLACEHOLDER_WHATSAPP 
                  : MESSAGES.INPUT.PLACEHOLDER_CHAT
              }
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white resize-none focus:border-embler-yellow focus:outline-none"
              rows={3}
              disabled={isInputDisabled}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isInputDisabled}
            className="px-6 py-3 bg-embler-yellow text-embler-dark rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTyping ? (
              <>
                <div className="w-4 h-4 border-2 border-embler-dark border-t-transparent rounded-full animate-spin"></div>
                {MESSAGES.INPUT.BUTTON_SENDING}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {MESSAGES.INPUT.BUTTON_SEND}
              </>
            )}
          </button>
        </div>

        {/* Mensaje cuando está en modo spectator */}
        {!isLoadingTakeoverMode && currentChat && takeoverMode === 'spectator' && (
          <div className="mt-3 p-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg border-2 border-gray-600">
            <div className="text-center text-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">👁️</span>
                <span className="font-semibold text-gray-300">Modo Espectador</span>
              </div>
              <p className="text-gray-400 text-xs">
                {MESSAGES.TAKEOVER.SPECTATOR_MODE}
              </p>
            </div>
          </div>
        )}

        {/* Mensaje cuando está en modo takeover */}
        {!isLoadingTakeoverMode && currentChat && takeoverMode === 'takeover' && (
          <div className="mt-3 p-3 bg-gradient-to-r from-green-700 to-green-800 rounded-lg border-2 border-green-600">
            <div className="text-center text-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-lg">👨‍💼</span>
                <span className="font-semibold text-green-300">Modo Control Manual</span>
              </div>
              <p className="text-green-400 text-xs">
                {MESSAGES.TAKEOVER.TAKEOVER_MODE}
              </p>
            </div>
          </div>
        )}

        {/* Mensaje de carga del modo takeover */}
        {isLoadingTakeoverMode && currentChat && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-700 to-blue-800 rounded-lg border-2 border-blue-600">
            <div className="text-center text-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="font-semibold text-blue-300">Cargando modo...</span>
              </div>
              <p className="text-blue-400 text-xs">
                Verificando configuración de la conversación
              </p>
            </div>
          </div>
        )}

        {/* Media Upload */}
        {showMediaUpload && (
          <div className="mt-4">
            <MediaUpload 
              onUpload={(file) => {
                console.log('File uploaded:', file);
                setShowMediaUpload(false);
              }}
              onUploadAndSend={(file, caption) => {
                console.log('File uploaded and sent:', file, caption);
                setShowMediaUpload(false);
              }}
              isUploading={isUploading}
              contactId={currentChat?.id}
            />
          </div>
        )}
      </div>

      {/* Modal de Resúmenes */}
      {showSummaryModal && conversationSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-embler-dark border border-gray-600 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  📋 Resumen de Conversación
                </h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Información del Cliente */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-embler-yellow mb-3">
                    👤 Información del Cliente
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Nombre:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.clientInfo?.name || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Teléfono:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.clientInfo?.phone || currentChat?.clientPhone}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Ubicación:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.clientInfo?.location || 'No especificada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">CP:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.clientInfo?.postalCode || 'No especificado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Producto/Servicio */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-embler-yellow mb-3">
                    🔧 Producto/Servicio
                  </h4>
                  <div className="text-sm">
                    <div className="mb-2">
                      <span className="text-gray-400">Producto:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.productInfo?.product || 'No especificado'}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-400">Vehículo:</span>
                      <span className="ml-2 text-white">
                        {conversationSummary.productInfo?.vehicle || 'No especificado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Detalles:</span>
                      <div className="ml-2 text-white mt-1">
                        {conversationSummary.productInfo?.details || 'Sin detalles específicos'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estado y Próxima Acción */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-embler-yellow mb-3">
                    📊 Estado y Próxima Acción
                  </h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-400">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        conversationSummary.status === 'completed' ? 'bg-green-600' :
                        conversationSummary.status === 'in_progress' ? 'bg-yellow-600' :
                        conversationSummary.status === 'pending' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        {conversationSummary.status || 'No determinado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Próxima acción:</span>
                      <div className="ml-2 text-white mt-1">
                        {conversationSummary.nextAction || 'Sin acciones pendientes'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-embler-yellow mb-3">
                    ℹ️ Información Adicional
                  </h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>
                      Generado: {new Date(conversationSummary.generatedAt || Date.now()).toLocaleString()}
                    </div>
                    <div>
                      Conversación ID: {getCurrentConversationId()}
                    </div>
                    <div>
                      Total mensajes: {messages.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(conversationSummary, null, 2));
                    alert('Resumen copiado al portapapeles');
                  }}
                  className="px-4 py-2 bg-embler-yellow hover:bg-yellow-400 text-embler-dark rounded-lg transition-colors"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPanel; 