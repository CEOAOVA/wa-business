import React, { useState, useEffect, useRef } from "react";
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

interface ConversationSummary {
  summary: string;
  keyPoints: {
    clientName?: string;
    product?: string;
    vehicle?: {
      brand?: string;
      model?: string;
      year?: number;
      engine?: string;
    };
    location?: {
      postalCode?: string;
      city?: string;
    };
    status?: string;
    nextAction?: string;
    estimatedValue?: string;
  };
  isFromCache: boolean;
  messageCount: number;
  generatedAt: string;
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
      ? "self-start bg-gray-600 text-white border border-gray-500"
      : "self-start bg-embler-accent text-white";

  const timeClass = isOwn 
    ? "text-embler-dark/60" 
    : "text-gray-400";

  // Check if this is a media message
  const isMediaMessage = message.mediaUrl && message.mediaType;

  if (isMediaMessage) {
    // Transform message for MediaMessage component
    const mediaMessage = {
      id: message.id,
      type: message.mediaType!,
      mediaUrl: message.mediaUrl,
      mediaCaption: message.mediaCaption,
      content: message.content,
      timestamp: message.timestamp,
      isOwn: isOwn
    };

    // Use MediaMessage component for media messages
    return (
      <div className={`max-w-[70%] mb-3 ${isOwn ? 'self-end' : 'self-start'}`}>
        <MediaMessage 
          message={mediaMessage}
          onDownload={(mediaUrl, filename) => {
            // Handle download
            const link = document.createElement('a');
            link.href = mediaUrl;
            link.download = filename;
            link.click();
          }}
        />
        
        {/* Message info for media messages */}
        <div className={`text-xs mt-1 flex items-center justify-between px-2 ${timeClass}`}>
          <span>{getRelativeTime(message.timestamp)}</span>
          
          {/* Indicadores de estado (solo para mensajes propios) */}
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.isDelivered && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {message.isRead && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-sm mb-3 transition-all duration-200 hover:shadow-md ${bubbleClass}`}>
      {/* Indicador de mensaje de bot */}
      {message.isFromBot && (
        <div className="flex items-center gap-1 mb-1 text-xs opacity-75">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
          </svg>
          <span>Asistente IA</span>
        </div>
      )}
      
      {/* Contenido del mensaje */}
      <div className="leading-relaxed">{message.content}</div>
      
      {/* Información del mensaje */}
      <div className={`text-xs mt-2 flex items-center justify-between ${timeClass}`}>
        <span>{getRelativeTime(message.timestamp)}</span>
        
        {/* Indicadores de estado (solo para mensajes propios) */}
        {isOwn && (
          <div className="flex items-center gap-1">
            {message.isDelivered && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {message.isRead && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// NUEVO: Modal para mostrar resumen de conversación
const SummaryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  summary: ConversationSummary | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate: () => void;
}> = ({ isOpen, onClose, summary, isLoading, error, onRegenerate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-embler-dark border border-embler-accent rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-embler-accent">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            Resumen de Conversación
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-embler-accent text-white rounded hover:bg-embler-accent/80 disabled:opacity-50"
            >
              {isLoading ? '⟳' : '🔄'} Regenerar
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
              title="Cerrar resumen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-embler-yellow"></div>
              <span className="ml-3 text-gray-300">Generando resumen con IA...</span>
            </div>
          ) : error ? (
            <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded p-4">
              <strong>Error:</strong> {error}
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Resumen principal */}
              <div>
                <h4 className="text-white font-medium mb-2">📄 Resumen</h4>
                <p className="text-gray-300 leading-relaxed bg-gray-800/50 rounded p-3">
                  {summary.summary}
                </p>
              </div>

              {/* Puntos clave */}
              <div>
                <h4 className="text-white font-medium mb-3">🔍 Información Clave</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {summary.keyPoints.clientName && (
                    <div className="bg-gray-800/50 rounded p-3">
                      <span className="text-embler-yellow font-medium">👤 Cliente:</span>
                      <span className="text-gray-300 ml-2">{summary.keyPoints.clientName}</span>
                    </div>
                  )}

                  {summary.keyPoints.product && (
                    <div className="bg-gray-800/50 rounded p-3">
                      <span className="text-embler-yellow font-medium">🔧 Producto:</span>
                      <span className="text-gray-300 ml-2">{summary.keyPoints.product}</span>
                    </div>
                  )}

                  {summary.keyPoints.vehicle && Object.keys(summary.keyPoints.vehicle).length > 0 && (
                    <div className="bg-gray-800/50 rounded p-3 md:col-span-2">
                      <span className="text-embler-yellow font-medium">🚗 Vehículo:</span>
                      <div className="text-gray-300 ml-2 mt-1">
                        {summary.keyPoints.vehicle.brand && summary.keyPoints.vehicle.model && 
                          `${summary.keyPoints.vehicle.brand} ${summary.keyPoints.vehicle.model}`}
                        {summary.keyPoints.vehicle.year && ` (${summary.keyPoints.vehicle.year})`}
                        {summary.keyPoints.vehicle.engine && ` - ${summary.keyPoints.vehicle.engine}`}
                      </div>
                    </div>
                  )}

                  {summary.keyPoints.location?.postalCode && (
                    <div className="bg-gray-800/50 rounded p-3">
                      <span className="text-embler-yellow font-medium">📍 Ubicación:</span>
                      <span className="text-gray-300 ml-2">
                        CP {summary.keyPoints.location.postalCode}
                        {summary.keyPoints.location.city && `, ${summary.keyPoints.location.city}`}
                      </span>
                    </div>
                  )}

                  {summary.keyPoints.status && (
                    <div className="bg-gray-800/50 rounded p-3">
                      <span className="text-embler-yellow font-medium">📊 Estado:</span>
                      <span className="text-gray-300 ml-2">{summary.keyPoints.status}</span>
                    </div>
                  )}

                  {summary.keyPoints.nextAction && (
                    <div className="bg-gray-800/50 rounded p-3 md:col-span-2">
                      <span className="text-embler-yellow font-medium">➡️ Próxima acción:</span>
                      <span className="text-gray-300 ml-2">{summary.keyPoints.nextAction}</span>
                    </div>
                  )}

                  {summary.keyPoints.estimatedValue && (
                    <div className="bg-gray-800/50 rounded p-3">
                      <span className="text-embler-yellow font-medium">💰 Valor estimado:</span>
                      <span className="text-gray-300 ml-2">{summary.keyPoints.estimatedValue}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
                📊 {summary.messageCount} mensajes analizados • 
                {summary.isFromCache ? ' 📋 Desde caché' : ' 🆕 Generado'} • 
                {new Date(summary.generatedAt).toLocaleString('es-MX')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">
              No hay resumen disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const { currentChat, messages, sendMessage, markAsRead } = useChat();
  const { user } = useAuth();
  const { sendMessage: sendWhatsAppMessage } = useWhatsApp();
  const { uploadAndSend, isUploading, uploadProgress, error: uploadError } = useMediaUpload({
    apiBaseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002',
  });

  // States existentes
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // NUEVOS: Estados para takeover y resúmenes
  const [aiMode, setAiMode] = useState<AIMode>({ aiMode: 'active' });
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // NUEVOS: Funciones para takeover y resúmenes
  const getCurrentConversationId = (): string | null => {
    if (!currentChat?.clientPhone) return null;
    return whatsappApi.formatConversationId(currentChat.clientPhone);
  };

  const loadAIMode = async () => {
    const conversationId = getCurrentConversationId();
    if (!conversationId) return;

    try {
      const response = await whatsappApi.getConversationMode(conversationId);
      if (response.success && response.data) {
        setAiMode({
          aiMode: response.data.aiMode,
          assignedAgentId: response.data.assignedAgentId
        });
      }
    } catch (error) {
      console.error('Error cargando modo IA:', error);
    }
  };

  const handleToggleAI = async () => {
    const conversationId = getCurrentConversationId();
    if (!conversationId || isChangingMode) return;

    setIsChangingMode(true);
    try {
      const newMode = aiMode.aiMode === 'active' ? 'inactive' : 'active';
      const agentId = newMode === 'inactive' ? user?.id || 'agent-1' : undefined;

      const response = await whatsappApi.setConversationMode(conversationId, newMode, agentId);
      
      if (response.success && response.data) {
        setAiMode({
          aiMode: response.data.aiMode,
          assignedAgentId: response.data.assignedAgentId
        });
        
        console.log(`✅ Modo IA cambiado a: ${newMode}`);
      } else {
        console.error('Error cambiando modo IA:', response.error);
      }
    } catch (error) {
      console.error('Error en toggleAI:', error);
    } finally {
      setIsChangingMode(false);
    }
  };

  const handleGenerateSummary = async (forceRegenerate: boolean = false) => {
    const conversationId = getCurrentConversationId();
    if (!conversationId) return;

    setIsSummaryLoading(true);
    setSummaryError(null);
    
    try {
      const response = await whatsappApi.generateConversationSummary(conversationId, forceRegenerate);
      
      if (response.success && response.data) {
        setConversationSummary(response.data);
        setShowSummaryModal(true);
      } else {
        setSummaryError(response.error || 'Error generando resumen');
      }
    } catch (error: any) {
      setSummaryError(error.message || 'Error de conexión');
    } finally {
      setIsSummaryLoading(false);
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

  // Simular indicador de escritura
  useEffect(() => {
    if (newMessage.trim()) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsTyping(false);
    }
  }, [newMessage]);

  // Auto-llenar número de WhatsApp desde el chat actual
  useEffect(() => {
    if (currentChat && !whatsappNumber) {
      setWhatsappNumber(currentChat.clientPhone.replace(/[^0-9]/g, ''));
    }
  }, [currentChat, whatsappNumber]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (whatsappMode) {
      // Modo WhatsApp
      if (!whatsappNumber) {
        alert('Por favor ingresa un número de WhatsApp');
        return;
      }

      const phoneValidation = validatePhone(whatsappNumber);
      if (!phoneValidation.isValid) {
        alert(`Número inválido: ${phoneValidation.error}`);
        return;
      }

      const success = await sendWhatsAppMessage({
        to: phoneValidation.formatted,
        message: newMessage.trim()
      });

      if (success) {
        setNewMessage("");
      }
    } else {
      // Modo chat normal - ahora también es async
      if (!currentChat) return;
      
      try {
        await sendMessage(newMessage.trim());
        setNewMessage("");
      } catch (error) {
        console.error('Error enviando mensaje:', error);
        // El error ya se maneja en el AppContext con notificaciones
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Handle media upload completion
  const handleMediaUploadComplete = async (file: File, caption?: string) => {
    if (!currentChat && !whatsappMode) return;

    try {
      if (whatsappMode) {
        // WhatsApp mode
        if (!whatsappNumber) return;
        const phoneValidation = validatePhone(whatsappNumber);
        if (!phoneValidation.isValid) return;
        
        await uploadAndSend(file, phoneValidation.formatted, caption);
      } else {
        // Regular chat mode - for now, use the current chat's phone number
        // TODO: Implement proper chat-based media upload
        if (!currentChat) return;
        await uploadAndSend(file, currentChat.clientPhone, caption);
      }

      setShowMediaUpload(false);
    } catch (error) {
      console.error('Error uploading media:', error);
    }
  };

  // Función para obtener el color del indicador de WhatsApp
  const getWhatsAppIndicatorColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Si no hay chat seleccionado
  if (!currentChat && !whatsappMode) {
    return (
      <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-embler-dark to-embler-accent relative">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 max-w-md">
            <svg className="w-24 h-24 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">{MESSAGES.WELCOME.TITLE}</h3>
            <p className="text-gray-400 mb-4">{MESSAGES.WELCOME.SUBTITLE}</p>
            {authState.user && (
              <p className="text-sm text-embler-yellow mt-4">
                Conectado como: {authState.user.name}
              </p>
            )}
            
            {/* Botón para activar modo WhatsApp */}
            <button
              onClick={() => setWhatsappMode(true)}
              className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
              </svg>
              {MESSAGES.WHATSAPP.BUTTON_TEXT}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Generar iniciales para el avatar del cliente
  const clientInitials = currentChat 
    ? currentChat.clientName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
    : 'WA';

  const avatarColor = currentChat 
    ? (currentChat.priority === 'high' 
        ? 'bg-red-500' 
        : currentChat.unreadCount > 0 
          ? 'bg-embler-yellow text-embler-dark' 
          : 'bg-gray-500')
    : 'bg-green-500';

  return (
    <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-embler-dark to-embler-accent relative">
      {/* Header del chat */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-embler-accent sticky top-0 bg-embler-accent/90 backdrop-blur-sm z-10 shadow-sm">
        {/* Avatar del cliente / WhatsApp */}
        <div className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold ${avatarColor} transition-all hover:scale-105`}>
          {whatsappMode ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
            </svg>
          ) : (
            clientInitials
          )}
        </div>
        
        {/* Información del cliente / WhatsApp */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white text-lg">
              {whatsappMode ? 'WhatsApp Business' : currentChat?.clientName}
            </span>
            
            {/* Toggle WhatsApp */}
            <button
              onClick={() => setWhatsappMode(!whatsappMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                whatsappMode 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-500 text-white hover:bg-gray-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${getWhatsAppIndicatorColor()}`}></div>
              {whatsappMode ? MESSAGES.INDICATORS.WHATSAPP_ON : MESSAGES.INDICATORS.WHATSAPP_OFF}
            </button>
            
            {/* Indicadores de estado */}
            <div className="flex items-center gap-2">
              {!whatsappMode && currentChat?.status === 'assigned' && (
                <span className="text-xs text-embler-yellow bg-embler-yellow/20 px-2 py-1 rounded-full flex items-center gap-1">
                  <div className="w-2 h-2 bg-embler-yellow rounded-full animate-pulse"></div>
                  {MESSAGES.INDICATORS.ASSIGNED}
                </span>
              )}
              
              {!whatsappMode && currentChat?.priority === 'high' && (
                <span className="text-xs text-red-400 bg-red-400/20 px-2 py-1 rounded-full">
                  {MESSAGES.INDICATORS.HIGH_PRIORITY}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {whatsappMode ? (
              <div className="flex items-center gap-2">
                <span>Estado: {connectionStatus}</span>
                <span>•</span>
                <button 
                  onClick={checkWhatsAppConnection}
                  className="text-embler-yellow hover:underline"
                >
                  {MESSAGES.WHATSAPP.RECONNECT}
                </button>
              </div>
            ) : (
              <>
                <span>{currentChat?.clientPhone}</span>
                <span>•</span>
                <span>{currentChat?.tags.join(', ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Acciones del header */}
        <div className="flex items-center gap-2">
          {/* Avatar del usuario */}
          {authState.user && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-embler-dark/20">
              <div className="w-6 h-6 bg-embler-yellow text-embler-dark rounded-full flex items-center justify-center text-xs font-bold">
                {authState.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-white text-sm font-medium hidden sm:inline">
                {authState.user.name.split(' ')[0]}
              </span>
            </div>
          )}
          
          {/* Botón de información */}
          <button 
            className="p-2 rounded-lg hover:bg-embler-dark/20 transition-colors text-gray-400 hover:text-white"
            title="Información del chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* Botón de logout */}
          <button 
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                logout();
              }
            }}
            className="p-2 rounded-lg hover:bg-embler-dark/20 transition-colors text-gray-400 hover:text-white group"
            title="Cerrar sesión"
          >
            <svg className="w-5 h-5 group-hover:text-embler-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-embler-accent scrollbar-track-embler-dark">
        {!whatsappMode && currentMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>{MESSAGES.WELCOME.NO_MESSAGES}</p>
              <p className="text-sm mt-1">{MESSAGES.WELCOME.SEND_FIRST}</p>
            </div>
          </div>
        ) : whatsappMode ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400 max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">{MESSAGES.WHATSAPP.MODE_TITLE}</h3>
              <p className="text-gray-400 mb-4">
                Estado: <span className={`font-medium ${connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  {connectionStatus === 'connected' ? MESSAGES.WHATSAPP.STATUS_CONNECTED : MESSAGES.WHATSAPP.STATUS_DISCONNECTED}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                {MESSAGES.WHATSAPP.INSTRUCTIONS}
              </p>
            </div>
          </div>
        ) : (
          currentMessages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwnMessage(message)}
              getRelativeTime={getRelativeTime}
            />
          ))
        )}
        
        {/* Indicador de escritura */}
        {isTyping && (
          <div className="self-start bg-embler-accent/50 text-white px-4 py-2 rounded-2xl text-sm italic animate-pulse">
            Escribiendo...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <form onSubmit={handleSendMessage} className="flex items-end gap-3 px-6 py-4 border-t border-embler-accent bg-embler-gray/50 backdrop-blur-sm sticky bottom-0">
        {/* Campo de número para WhatsApp */}
        {whatsappMode && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Número WhatsApp:</label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="Número de WhatsApp"
              className="w-32 px-3 py-2 rounded-lg bg-embler-accent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow text-sm"
            />
            <span className="text-xs text-gray-500">
              {whatsappNumber ? formatPhone(whatsappNumber) : ''}
            </span>
          </div>
        )}
        
        {/* Campo de texto */}
        <div className="flex-1 relative">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={whatsappMode ? "Mensaje para WhatsApp..." : "Escribe un mensaje..."}
            className="w-full px-4 py-3 rounded-xl bg-embler-accent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow transition-all duration-200 resize-none min-h-[3rem] max-h-32"
            rows={1}
          />
          
          {/* Contador de caracteres */}
          <div className="absolute bottom-1 right-2 text-xs text-gray-500">
            {newMessage.length}/1000
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {/* Botón de archivos multimedia */}
          <button
            type="button"
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            className={`p-3 rounded-xl transition-colors ${
              showMediaUpload 
                ? 'bg-embler-yellow text-embler-dark' 
                : 'hover:bg-embler-accent text-gray-400 hover:text-white'
            }`}
            title="Adjuntar archivo multimedia"
            disabled={isUploading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* Botón de enviar */}
          <button
            type="submit"
            disabled={!newMessage.trim() || (whatsappMode && !whatsappNumber) || isUploading}
            className={`font-semibold rounded-xl px-6 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              whatsappMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-embler-yellow hover:bg-embler-yellow/80 text-embler-dark'
            }`}
          >
            <span>{isUploading ? 'Enviando...' : whatsappMode ? 'WhatsApp' : 'Enviar'}</span>
            {whatsappMode ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Media Upload Component */}
      {showMediaUpload && (
        <div className="px-6 py-4 border-t border-embler-accent bg-embler-gray/50">
          <MediaUpload
            onUpload={(file) => handleMediaUploadComplete(file)}
            onUploadAndSend={(file, caption) => handleMediaUploadComplete(file, caption)}
            isUploading={isUploading}
            contactId={whatsappMode ? whatsappNumber : currentChat?.id}
          />
        </div>
      )}
    </main>
  );
};

export default ChatPanel; 