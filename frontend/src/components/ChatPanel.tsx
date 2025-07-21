import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../context/AuthContext";
import { useWhatsApp } from "../hooks/useWhatsApp";
import { useMediaUpload } from "../hooks/useMediaUpload";
import { MESSAGES } from "../constants/messages";
import MediaMessage from "./MediaMessage";
import MediaUpload from "./MediaUpload";
import whatsappApi from "../services/whatsapp-api"; // NUEVO: Import para takeover y resúmenes
import type { Message } from "../types";

// NUEVOS: Interfaces para takeover y resúmenes
interface AIMode {
  aiMode: 'active' | 'inactive';
  assignedAgentId?: string;
}

// Componente para una burbuja de mensaje individual
const MessageBubble: React.FC<{ 
  message: Message; 
  isOwn: boolean;
  getRelativeTime: (date: Date) => string;
}> = ({ message, isOwn, getRelativeTime }) => {
  const bubbleClass = isOwn 
    ? "self-end bg-embler-yellow text-embler-dark" 
    : message.isFromBot 
      ? "self-start bg-blue-600 text-white"
      : "self-start bg-gray-700 text-white";

  const senderName = isOwn 
    ? "Tú" 
    : message.isFromBot 
      ? "🤖 IA Asistente"
      : "Cliente";

  return (
    <div className={`flex flex-col ${bubbleClass} rounded-lg px-4 py-2 max-w-[70%] break-words`}>
      <div className="text-xs opacity-75 mb-1 font-medium">
        {senderName}
      </div>
      
      {message.type === 'text' ? (
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        <MediaMessage message={{
          ...message, 
          isOwn,
          type: message.type.toUpperCase() as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER'
        }} />
      )}
      
      <div className="text-xs opacity-70 mt-1 text-right">
        {getRelativeTime(message.timestamp)}
      </div>
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const { currentChat, currentMessages: messages, sendMessage, getRelativeTime, isOwnMessage } = useChat();
  const { state: authState, logout } = useAuth();
  const { 
    sendMessage: sendWhatsAppMessage, 
    checkConnection: checkWhatsAppConnection,
    connectionStatus
  } = useWhatsApp();
  const { isUploading } = useMediaUpload({
    apiBaseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002',
  });

  // States existentes
  const [newMessage, setNewMessage] = useState("");
  const [isTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados para WhatsApp
  const [whatsappMode, setWhatsappMode] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showMediaUpload, setShowMediaUpload] = useState(false);

  // NUEVOS: Estados para takeover y resúmenes
  const [aiMode, setAiMode] = useState<AIMode>({ aiMode: 'active' });
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<any>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

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

  // NUEVOS: Funciones para takeover y resúmenes
  const getCurrentConversationId = (): string | null => {
    if (!currentChat?.clientPhone) return null;
    return `conv-${currentChat.clientPhone.replace(/[^0-9]/g, '')}`;
  };

  // Función para cargar el modo IA actual
  const loadAIMode = async () => {
    const conversationId = getCurrentConversationId();
    if (!conversationId) return;

    try {
      const response = await whatsappApi.getConversationMode(conversationId);
      if (response.success && response.data) {
        setAiMode(response.data);
      }
    } catch (error) {
      console.error('Error cargando modo IA:', error);
    }
  };

  // Cargar modo IA al cambiar de chat
  useEffect(() => {
    if (currentChat) {
      loadAIMode();
    }
  }, [currentChat?.id]);

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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



  // NUEVOS: Handlers restaurados para takeover y resúmenes
  const _handleToggleAI = async () => {
    const conversationId = getCurrentConversationId();
    if (!conversationId || isChangingMode) return;

    setIsChangingMode(true);
    try {
      const newMode = aiMode.aiMode === 'active' ? 'inactive' : 'active';
      const agentId = authState.user?.id || 'agent-001';
      
      const response = await whatsappApi.setConversationMode(conversationId, newMode, agentId);
      
      if (response.success) {
        setAiMode({
          aiMode: newMode,
          assignedAgentId: newMode === 'inactive' ? agentId : undefined
        });
        
        console.log(`✅ [Takeover] Modo cambiado a: ${newMode}`);
      } else {
        throw new Error(response.error || 'Error cambiando modo');
      }
    } catch (error) {
      console.error('❌ [Takeover] Error:', error);
      alert('Error cambiando modo IA. Inténtalo de nuevo.');
    } finally {
      setIsChangingMode(false);
    }
  };

  const _handleGenerateSummary = async () => {
    const conversationId = getCurrentConversationId();
    if (!conversationId || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    try {
      const response = await whatsappApi.generateConversationSummary(conversationId);
      
      if (response.success && response.data) {
        setConversationSummary(response.data);
        setShowSummaryModal(true);
        console.log('✅ [Summary] Resumen generado exitosamente');
      } else {
        throw new Error(response.error || 'Error generando resumen');
      }
    } catch (error) {
      console.error('❌ [Summary] Error:', error);
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
              {/* NUEVO: Indicador de modo IA */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                aiMode.aiMode === 'active' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-orange-600 text-white'
              }`}>
                {aiMode.aiMode === 'active' ? '🤖 IA Activa' : '👨‍💼 Control Manual'}
                {aiMode.assignedAgentId && (
                  <span className="text-xs opacity-75">
                    (Agente: {aiMode.assignedAgentId})
                  </span>
                )}
              </div>

              {/* RESTAURADO: Botones de Takeover y Resúmenes */}
              <div className="flex items-center gap-2">
                <button
                  onClick={_handleToggleAI}
                  disabled={isChangingMode}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    aiMode.aiMode === 'active'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={aiMode.aiMode === 'active' ? 'Tomar control manual' : 'Activar IA'}
                >
                  {isChangingMode ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    aiMode.aiMode === 'active' ? '👨‍💼 Tomar Control' : '🤖 Activar IA'
                  )}
                </button>

                <button
                  onClick={_handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generar resumen de conversación"
                >
                  {isGeneratingSummary ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    '📋 Resumen'
                  )}
                </button>
              </div>

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

      {/* Mensajes */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-embler-accent scrollbar-track-embler-dark">
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
              disabled={isTyping || isUploading}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isTyping || isUploading}
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

      {/* RESTAURADO: Modal de Resúmenes */}
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