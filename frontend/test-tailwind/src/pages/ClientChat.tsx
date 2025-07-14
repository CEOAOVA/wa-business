import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChatbot } from "../chatbot/hooks/useChatbot";
import { MESSAGES } from "../constants/messages";
import type { ChatbotMessage } from "../chatbot/types/chatbot";

interface ChatMessage {
  id: string;
  text: string;
  sender: 'client' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
}

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Integrar chatbot real
  const {
    sendMessage,
    getConversationHistory,
    isThinking,
    error,
    clientInfo,
    collectionProgress,
    resetConversation
  } = useChatbot('client-simulator');

  // Convertir mensajes del chatbot al formato del componente
  const messages: ChatMessage[] = getConversationHistory().map((msg: ChatbotMessage) => ({
    id: msg.id,
    text: msg.content,
    sender: msg.role === 'user' ? 'client' : 'bot',
    timestamp: msg.timestamp
  }));

  // Auto-scroll al final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manejar envío de mensajes con chatbot real
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isThinking) return;
    
    const messageText = inputValue.trim();
    setInputValue('');
    
    try {
      // Enviar mensaje al chatbot real
      await sendMessage(messageText);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  };

  const handleQuickResponse = (text: string) => {
    setInputValue(text);
  };

  const quickResponses = MESSAGES.CLIENT_CHAT.QUICK_RESPONSES;

  return (
    <div className="min-h-screen bg-embler-dark flex flex-col">
      {/* Header Fijo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-embler-gray shadow-sm border-b border-embler-accent p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="p-2 rounded-lg hover:bg-embler-dark/50 transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-embler-yellow rounded-full flex items-center justify-center">
                <span className="text-embler-dark font-bold text-lg">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Embler Support</h1>
                <div className="flex items-center gap-1 text-sm text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>En línea</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 flex items-center gap-3">
            <span className="bg-embler-yellow/20 text-embler-yellow px-2 py-1 rounded-full text-xs font-medium border border-embler-yellow/30">
              Chatbot Real - Repuestos Automotrices
            </span>
            {collectionProgress.progressPercentage > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-embler-dark rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-embler-yellow transition-all duration-300"
                    style={{ width: `${collectionProgress.progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs text-embler-yellow font-medium">
                  {collectionProgress.progressPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Espaciador para el header fijo */}
      <div className="h-20"></div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full bg-embler-gray shadow-lg border border-embler-accent">
        
        {/* Messages Area - Solo esta parte hace scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 240px)' }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'client' 
                  ? 'bg-embler-yellow text-embler-dark' 
                  : 'bg-embler-dark text-gray-200'
              }`}>
                <p className="whitespace-pre-line">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'client' ? 'text-embler-dark/70' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-embler-dark text-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-embler-yellow rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-embler-yellow rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-embler-yellow rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">{MESSAGES.SYSTEM.PROCESSING.toLowerCase()}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area Fija - Siempre visible en la parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-embler-gray border-t border-embler-accent">
        <div className="max-w-4xl mx-auto">
          {/* Quick Responses */}
          {messages.length <= 3 && (
            <div className="p-4 border-b border-embler-accent bg-embler-dark/30">
              <p className="text-sm text-gray-300 mb-2">{MESSAGES.CLIENT_CHAT.QUICK_RESPONSES_LABEL}</p>
              <div className="flex flex-wrap gap-2">
                {quickResponses.map((response, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickResponse(response)}
                    className="px-3 py-1 bg-embler-gray border border-embler-accent rounded-full text-sm text-gray-300 hover:border-embler-yellow hover:text-embler-yellow transition-colors"
                  >
                    {response}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 bg-embler-dark border border-embler-accent rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow focus:border-transparent"
                disabled={isThinking}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isThinking}
                className="px-6 py-2 bg-embler-yellow text-embler-dark font-medium rounded-lg hover:bg-embler-yellow/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Espaciador para el footer fijo */}
      <div className="h-32"></div>

      {/* Debug Panel - Solo en desarrollo */}
      {import.meta.env.MODE === 'development' && (
        <div className="p-4 bg-embler-dark border-t border-embler-accent">
          <div className="max-w-4xl mx-auto">
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-embler-yellow transition-colors flex items-center gap-2">
                <span>🔧 Panel de Debug del Chatbot</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              <div className="mt-3 p-3 bg-embler-gray rounded-lg border border-embler-accent">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Progreso de recopilación */}
                  <div>
                    <h4 className="text-embler-yellow font-medium mb-2">Progreso ({collectionProgress.progressPercentage}%)</h4>
                    <div className="space-y-1">
                      <div className="text-green-400">
                        ✅ Completados: {collectionProgress.completedFields.length}
                      </div>
                      <div className="text-red-400">
                        ❌ Faltantes: {collectionProgress.missingFields.length}
                      </div>
                      <div className="text-gray-400">
                        📊 Estado: {collectionProgress.status}
                      </div>
                    </div>
                  </div>

                  {/* Información del cliente */}
                  <div>
                    <h4 className="text-embler-yellow font-medium mb-2">Datos del Cliente</h4>
                    <div className="space-y-1 text-gray-300">
                      <div>👤 Nombre: {clientInfo.nombre || 'Sin datos'}</div>
                      <div>🔧 Pieza: {clientInfo.piezaNecesaria || 'Sin datos'}</div>
                      {clientInfo.vehiculo && (
                        <>
                          <div>🚗 Marca: {clientInfo.vehiculo.marca || 'Sin datos'}</div>
                          <div>🏷️ Modelo: {clientInfo.vehiculo.modelo || 'Sin datos'}</div>
                          <div>📅 Año: {clientInfo.vehiculo.año || 'Sin datos'}</div>
                          <div>⚡ Motor: {clientInfo.vehiculo.litraje || 'Sin datos'}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Estado del sistema */}
                  <div>
                    <h4 className="text-embler-yellow font-medium mb-2">Estado del Sistema</h4>
                    <div className="space-y-1">
                      <div className={`${isThinking ? 'text-embler-yellow' : 'text-green-400'}`}>
                        🤖 {isThinking ? MESSAGES.SYSTEM.PROCESSING : MESSAGES.SYSTEM.READY}
                      </div>
                      <div className={`${error ? 'text-red-400' : 'text-green-400'}`}>
                        🔌 {error ? MESSAGES.SYSTEM.ERROR : MESSAGES.SYSTEM.CONNECTED}
                      </div>
                      <div className="text-gray-400">
                        💬 Mensajes: {messages.length}
                      </div>
                      <button 
                        onClick={resetConversation}
                        className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        {MESSAGES.SYSTEM.RESET_CHAT}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-400 text-xs">
                    ⚠️ Error: {error}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 text-center bg-embler-dark border-t border-embler-accent">
        <p className="text-xs text-gray-400">
          {MESSAGES.CLIENT_CHAT.FOOTER_TEXT}
        </p>
      </div>
    </div>
  );
};

export default ClientChat; 