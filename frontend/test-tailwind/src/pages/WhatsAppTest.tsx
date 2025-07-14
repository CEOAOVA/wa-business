import React, { useState, useEffect } from 'react';
import whatsappApi from '../services/whatsapp-api';
import chatbotApi from '../services/chatbot-api';
import { useApp } from '../context/AppContext';
import { MESSAGES } from '../constants/messages';

interface TestResult {
  id: string;
  timestamp: Date;
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

const WhatsAppTest: React.FC = () => {
  const { injectTestWhatsAppMessage, injectTestOutgoingMessage, addSentWhatsAppMessage } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState('hello_world');
  const [language, setLanguage] = useState('es');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Estados para el chatbot
  const [chatbotStats, setChatbotStats] = useState<any>(null);
  const [chatbotConversation, setChatbotConversation] = useState<any>(null);
  const [isChatbotConnected, setIsChatbotConnected] = useState(false);

  // Función para agregar resultado
  const addResult = (action: string, success: boolean, data?: any, error?: string) => {
    const result: TestResult = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      success,
      data,
      error
    };
    setResults(prev => [result, ...prev]);
  };

  // Verificar conexión al cargar
  useEffect(() => {
    checkStatus();
    checkChatbotStatus();
  }, []);

  // Verificar estado
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const [connectionOk, statusResponse] = await Promise.all([
        whatsappApi.checkConnection(),
        whatsappApi.getStatus()
      ]);

      setIsConnected(connectionOk);
      if (statusResponse.success) {
        setStatus(statusResponse.data?.status);
        addResult('Status Check', true, statusResponse.data?.status);
      } else {
        addResult('Status Check', false, null, statusResponse.error);
      }
    } catch (error: any) {
      addResult('Status Check', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      addResult('Send Message', false, null, 'Número y mensaje son requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const result = await whatsappApi.sendMessage({
        to: phoneNumber,
        message
      });

      addResult('Send Message', result.success, result, result.error);
      
      // Si el mensaje se envió exitosamente, agregarlo al historial del chat
      if (result.success) {
        addSentWhatsAppMessage(phoneNumber, message, result.data?.messageId);
        console.log(`✅ [WhatsAppTest] Mensaje enviado agregado al historial: ${message}`);
      }
    } catch (error: any) {
      addResult('Send Message', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar template
  const handleSendTemplate = async () => {
    if (!phoneNumber || !template) {
      addResult('Send Template', false, null, 'Número y template son requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const result = await whatsappApi.sendTemplate({
        to: phoneNumber,
        template,
        language
      });

      addResult('Send Template', result.success, result, result.error);
    } catch (error: any) {
      addResult('Send Template', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener información del número
  const handleGetPhoneInfo = async () => {
    setIsLoading(true);
    try {
      const result = await whatsappApi.getPhoneInfo();
      addResult('Phone Info', result.success, result.data, result.error);
    } catch (error: any) {
      addResult('Phone Info', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Ejecutar prueba rápida
  const handleQuickTest = async () => {
    if (!phoneNumber.trim()) {
      addResult('Quick Test', false, null, 'Número de teléfono requerido');
      return;
    }

    if (!message.trim()) {
      addResult('Quick Test', false, null, 'Mensaje requerido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await whatsappApi.runTest({
        to: phoneNumber,
        message: message
      });

      addResult('Quick Test', result.success, result, result.error);
    } catch (error: any) {
      addResult('Quick Test', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Forzar carga de mensajes
  const handleDebugLoad = async () => {
    console.log('🧪 [WhatsAppTest] Iniciando debug de carga de mensajes...');
    setIsLoading(true);
    
    try {
      // Intentar obtener mensajes directamente
      console.log('🧪 [WhatsAppTest] Obteniendo mensajes del backend...');
      const messages = await whatsappApi.getIncomingMessages(10, 0);
      console.log('🧪 [WhatsAppTest] Respuesta de mensajes:', messages);
      
      addResult('Debug Load Messages', messages.success, messages, messages.success ? undefined : 'Error obteniendo mensajes');
      
      // También verificar el estado del servicio
      console.log('🧪 [WhatsAppTest] Verificando estado del servicio...');
      const status = await whatsappApi.getStatus();
      console.log('🧪 [WhatsAppTest] Estado del servicio:', status);
      
      addResult('Service Status', status.success, status, status.success ? undefined : 'Error obteniendo estado');
      
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error en debug:', error);
      addResult('Debug Load', false, undefined, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Simular mensaje
  const handleSimulateMessage = async () => {
    console.log('🧪 [WhatsAppTest] Simulando mensaje...');
    setIsLoading(true);
    
    try {
      const simulateBody = {
        from: '525549679734',
        message: MESSAGES.TESTING.DEBUG_MESSAGE,
        name: MESSAGES.TESTING.DEBUG_NAME
      };
      
      console.log('🧪 [WhatsAppTest] Enviando solicitud de simulación:', simulateBody);
      
      const response = await fetch('http://localhost:3002/api/chat/simulate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simulateBody)
      });
      
      const result = await response.json();
      console.log('🧪 [WhatsAppTest] Respuesta de simulación:', result);
      
      addResult('Simulate Message', result.success, result, result.success ? undefined : result.error);
      
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error simulando mensaje:', error);
      addResult('Simulate Message', false, undefined, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Manual: Simular mensaje RECIBIDO de un cliente
  const handleManualIncomingTest = () => {
    console.log('🧪 [WhatsAppTest] Simulando mensaje RECIBIDO...');
    
    try {
      injectTestWhatsAppMessage(
        '525549679734',
        MESSAGES.TESTING.SIMULATE_INCOMING,
        MESSAGES.TESTING.CLIENT_SIMULATED
      );
      
      addResult('Simulate Incoming Message', true, { 
        from: '525549679734', 
        message: 'Mensaje recibido simulado exitosamente' 
      });
      
      console.log('✅ [WhatsAppTest] Mensaje recibido simulado exitosamente');
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error simulando mensaje recibido:', error);
      addResult('Simulate Incoming Message', false, undefined, error.message);
    }
  };

  // Test Manual: Simular mensaje ENVIADO por nosotros
  const handleManualOutgoingTest = () => {
    console.log('🧪 [WhatsAppTest] Simulando mensaje ENVIADO...');
    
    try {
      injectTestOutgoingMessage(
        '525549679734',
        MESSAGES.TESTING.SIMULATE_OUTGOING,
        MESSAGES.TESTING.CLIENT_SIMULATED
      );
      
      addResult('Simulate Outgoing Message', true, { 
        to: '525549679734', 
        message: 'Mensaje enviado simulado exitosamente' 
      });
      
      console.log('✅ [WhatsAppTest] Mensaje enviado simulado exitosamente');
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error simulando mensaje enviado:', error);
      addResult('Simulate Outgoing Message', false, undefined, error.message);
    }
  };

  // Test Manual: Crear múltiples mensajes
  const handleMultipleMessages = () => {
    console.log('🧪 [WhatsAppTest] Creando múltiples mensajes...');
    
    try {
      const messages = [
        { from: '525549679734', message: MESSAGES.TESTING.TEST_MESSAGE_1, name: MESSAGES.TESTING.CLIENT_ONE },
        { from: '525555123456', message: MESSAGES.TESTING.TEST_MESSAGE_2, name: MESSAGES.TESTING.CLIENT_TWO },
        { from: '525549679734', message: MESSAGES.TESTING.TEST_MESSAGE_3, name: MESSAGES.TESTING.CLIENT_ONE }
      ];
      
      messages.forEach((msg, index) => {
        setTimeout(() => {
          injectTestWhatsAppMessage(msg.from, msg.message, msg.name);
        }, index * 500); // Espaciar mensajes por 500ms
      });
      
      addResult('Multiple Test Messages', true, { 
        count: messages.length,
        message: 'Múltiples mensajes creados' 
      });
      
      console.log('✅ [WhatsAppTest] Múltiples mensajes creados exitosamente');
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error creando múltiples mensajes:', error);
      addResult('Multiple Test Messages', false, undefined, error.message);
    }
  };

  // Limpiar resultados
  const clearResults = () => {
    setResults([]);
  };

  // ============================================
  // FUNCIONES DEL CHATBOT CON IA
  // ============================================

  // Verificar estado del chatbot
  const checkChatbotStatus = async () => {
    try {
      const [connectionOk, statsResponse] = await Promise.all([
        chatbotApi.checkConnection(),
        chatbotApi.getStats()
      ]);

      setIsChatbotConnected(connectionOk);
      if (statsResponse.success) {
        setChatbotStats(statsResponse.stats);
        addResult('Chatbot Status Check', true, statsResponse.stats);
      } else {
        addResult('Chatbot Status Check', false, null, statsResponse.error);
      }
    } catch (error: any) {
      addResult('Chatbot Status Check', false, null, error.message);
    }
  };

  // Enviar mensaje al chatbot y generar respuesta con IA
  const handleChatbotSendMessage = async () => {
    console.log('🧪 [DEBUG] handleChatbotSendMessage ejecutándose...', { phoneNumber, message });
    
    if (!phoneNumber || !message) {
      console.log('❌ [DEBUG] Faltan datos en sendMessage:', { phoneNumber, message });
      addResult('Chatbot Send Message', false, null, 'Número y mensaje son requeridos');
      return;
    }

    console.log('✅ [DEBUG] Iniciando llamada a chatbotApi.sendMessage...');
    setIsLoading(true);
    try {
      const result = await chatbotApi.sendMessage({
        phoneNumber: phoneNumber,
        message: message
      });

      addResult('Chatbot Send Message', result.success, result, result.error);
      
      // Actualizar conversación si existe
      if (result.conversationState) {
        setChatbotConversation(result.conversationState);
      }
    } catch (error: any) {
      addResult('Chatbot Send Message', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Probar respuesta de IA sin enviar por WhatsApp
  const handleTestAI = async () => {
    console.log('🧪 [DEBUG] handleTestAI ejecutándose...', { phoneNumber, message });
    
    if (!phoneNumber || !message) {
      console.log('❌ [DEBUG] Faltan datos:', { phoneNumber, message });
      addResult('Test AI Response', false, null, 'Número y mensaje son requeridos');
      return;
    }

    console.log('✅ [DEBUG] Iniciando llamada a chatbotApi.testAI...');
    setIsLoading(true);
    try {
      const result = await chatbotApi.testAI({
        phoneNumber: phoneNumber,
        message: message
      });

      addResult('Test AI Response', result.success, result, result.error);
      
      // Actualizar conversación si existe
      if (result.conversationState) {
        setChatbotConversation(result.conversationState);
      }
    } catch (error: any) {
      addResult('Test AI Response', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener conversación del chatbot
  const handleGetConversation = async () => {
    if (!phoneNumber) {
      addResult('Get Conversation', false, null, 'Número de teléfono requerido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await chatbotApi.getConversation(phoneNumber);

      addResult('Get Conversation', result.success, result.conversation, result.message);
      
      if (result.conversation) {
        setChatbotConversation(result.conversation);
      }
    } catch (error: any) {
      addResult('Get Conversation', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Simular webhook entrante con chatbot
  const handleChatbotWebhook = async () => {
    if (!phoneNumber || !message) {
      addResult('Chatbot Webhook', false, null, 'Número y mensaje son requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const result = await chatbotApi.processWebhook({
        phoneNumber: phoneNumber,
        message: message,
        contactName: 'Cliente de Prueba'
      });

      addResult('Chatbot Webhook', result.success, result, result.error);
      
      // Actualizar conversación si existe
      if (result.conversationState) {
        setChatbotConversation(result.conversationState);
      }
    } catch (error: any) {
      addResult('Chatbot Webhook', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar estadísticas del chatbot
  const handleRefreshChatbotStats = async () => {
    setIsLoading(true);
    try {
      const result = await chatbotApi.getStats();

      if (result.success) {
        setChatbotStats(result.stats);
        addResult('Refresh Chatbot Stats', true, result.stats);
      } else {
        addResult('Refresh Chatbot Stats', false, null, result.error);
      }
    } catch (error: any) {
      addResult('Refresh Chatbot Stats', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const validation = whatsappApi.validatePhoneNumber(phone);
    return validation.isValid ? whatsappApi.formatPhoneForDisplay(validation.formatted) : phone;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WhatsApp Business API - Pruebas
          </h1>
          <p className="text-gray-600">
            Interfaz de pruebas para la integración de WhatsApp Business API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel de Control */}
          <div className="space-y-6">
            {/* Estado del Chatbot con IA */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🤖 Chatbot con IA</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Backend AI:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    isChatbotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isChatbotConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {chatbotStats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Conversaciones Activas:</span>
                      <span className="text-sm font-mono">{chatbotStats.activeConversations}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Total Mensajes:</span>
                      <span className="text-sm font-mono">{chatbotStats.totalMessages}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Promedio por Conversación:</span>
                      <span className="text-sm font-mono">{chatbotStats.avgMessagesPerConversation?.toFixed(1) || '0.0'}</span>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={checkChatbotStatus}
                    disabled={isLoading}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {isLoading ? 'Verificando...' : 'Verificar Estado'}
                  </button>
                  
                  <button
                    onClick={handleRefreshChatbotStats}
                    disabled={isLoading}
                    className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {isLoading ? 'Actualizando...' : 'Actualizar Stats'}
                  </button>
                </div>
              </div>
            </div>

            {/* Acciones del Chatbot */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🧠 Acciones del Chatbot</h2>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleTestAI}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-medium"
                >
                  🤖 Probar Respuesta de IA (Solo Test)
                </button>

                <button
                  onClick={handleChatbotSendMessage}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded hover:from-green-700 hover:to-blue-700 disabled:opacity-50 font-medium"
                >
                  💬 Generar IA + Enviar WhatsApp
                </button>

                <button
                  onClick={handleChatbotWebhook}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded hover:from-orange-700 hover:to-red-700 disabled:opacity-50 font-medium"
                >
                  🔄 Simular Webhook + Respuesta IA
                </button>

                <button
                  onClick={handleGetConversation}
                  disabled={isLoading}
                  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  📋 Ver Conversación
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Tip:</strong> Para probar el chatbot, configura un número de teléfono y escribe un mensaje como "Necesito un filtro de aceite para mi Toyota Corolla 2018"
                </p>
              </div>
            </div>

            {/* Conversación Actual */}
            {chatbotConversation && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">💬 Conversación Actual</h2>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Teléfono:</span>
                    <span className="text-sm font-mono">{chatbotConversation.phoneNumber}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado:</span>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">{chatbotConversation.status}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mensajes:</span>
                    <span className="text-sm">{chatbotConversation.messagesCount || 0}</span>
                  </div>
                  
                  {chatbotConversation.clientInfo && Object.keys(chatbotConversation.clientInfo).length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <h4 className="text-sm font-medium mb-2">Información del Cliente:</h4>
                      <div className="space-y-1">
                        {Object.entries(chatbotConversation.clientInfo).map(([key, value], index) => {
                          if (!value) return null;
                          return (
                            <div key={`client-info-${key}-${index}`} className="flex items-center justify-between">
                              <span className="text-xs font-medium capitalize">{key}:</span>
                              <span className="text-xs">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Segundo Panel - Configuración Original */}
          <div className="space-y-6">
            {/* Estado de Conexión */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Estado de Conexión</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Backend:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {status && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>WhatsApp:</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        status.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.configured ? 'Configurado' : 'No Configurado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Phone ID:</span>
                      <span className="text-sm font-mono">{status.phoneId}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>API Version:</span>
                      <span className="text-sm">{status.apiVersion}</span>
                    </div>
                  </>
                )}

                <button
                  onClick={checkStatus}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verificando...' : 'Verificar Estado'}
                </button>
              </div>
            </div>

            {/* Configuración de Pruebas */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Configuración</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Teléfono
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Número de teléfono"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato detectado: {formatPhone(phoneNumber)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template
                    </label>
                    <input
                      type="text"
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Idioma
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="en_US">English (US)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Acciones de Prueba</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Enviar Mensaje
                </button>

                <button
                  onClick={handleSendTemplate}
                  disabled={isLoading}
                  className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Enviar Template
                </button>

                <button
                  onClick={handleGetPhoneInfo}
                  disabled={isLoading}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Info del Número
                </button>

                <button
                  onClick={handleQuickTest}
                  disabled={isLoading}
                  className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Prueba Rápida
                </button>
                
                <button
                  onClick={handleDebugLoad}
                  disabled={isLoading}
                  className="bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  🧪 Debug Load
                </button>

                <button
                  onClick={handleSimulateMessage}
                  disabled={isLoading}
                  className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  🧪 Simular Mensaje
                </button>
              </div>
              
              {/* Sección de Tests Manuales */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tests Manuales (Sin Backend)</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={handleManualIncomingTest}
                    disabled={isLoading}
                    className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                  >
                    📥 Simular Mensaje RECIBIDO (Cliente → Agente)
                  </button>

                  <button
                    onClick={handleManualOutgoingTest}
                    disabled={isLoading}
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    📤 Simular Mensaje ENVIADO (Agente → Cliente)
                  </button>

                  <button
                    onClick={handleMultipleMessages}
                    disabled={isLoading}
                    className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
                  >
                    📱 Crear Múltiples Chats
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Resultados de Pruebas</h2>
              <button
                onClick={clearResults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay resultados aún. Ejecuta una prueba para ver los resultados.
                </p>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    className={`border rounded-lg p-3 ${
                      result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{result.action}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'Éxito' : 'Error'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {result.timestamp.toLocaleString()}
                    </p>

                    {result.error && (
                      <p className="text-sm text-red-600 mb-2">
                        Error: {result.error}
                      </p>
                    )}

                    {result.data && (
                      <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTest; 