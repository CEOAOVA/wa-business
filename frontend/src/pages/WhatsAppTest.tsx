import React, { useState, useEffect } from 'react';
import whatsappApi from '../services/whatsapp-api';
import chatbotApi from '../services/chatbot-api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MESSAGES } from '../constants/messages';

// Estilos específicos para ocultar elementos decorativos en WhatsAppTest
const whatsappTestStyles = `
  .whatsapp-test-page {
    background: white !important;
    position: relative;
    z-index: 9999;
    isolation: isolate;
  }
  
  .whatsapp-test-page::before,
  .whatsapp-test-page::after {
    display: none !important;
  }
  
  .whatsapp-test-page .absolute {
    display: none !important;
  }
  
  .whatsapp-test-page .animate-float {
    display: none !important;
  }
`;

interface TestResult {
  id: string;
  timestamp: Date;
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

const WhatsAppTest: React.FC = () => {
  const { logout } = useAuth();
  const { injectTestWhatsAppMessage, injectTestOutgoingMessage, addSentWhatsAppMessage } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState('hello_world');
  const [language, setLanguage] = useState('es');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
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

  // Inyectar estilos para ocultar elementos decorativos
  useEffect(() => {
    // Crear y agregar estilos
    const styleElement = document.createElement('style');
    styleElement.textContent = whatsappTestStyles;
    document.head.appendChild(styleElement);

    // Limpiar al desmontar
    return () => {
      document.head.removeChild(styleElement);
    };
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
      
      const response = await fetch('/api/chat/simulate-message', {
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

  // Test Manual: Simular mensaje ENVIADO por un agente
  const handleManualOutgoingTest = () => {
    console.log('🧪 [WhatsAppTest] Simulando mensaje ENVIADO...');
    
    try {
      injectTestOutgoingMessage(
        '525549679734',
        MESSAGES.TESTING.SIMULATE_OUTGOING,
        'Agente Test'
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

  // Test Manual: Crear múltiples chats
  const handleMultipleMessages = () => {
    console.log('🧪 [WhatsAppTest] Creando múltiples chats...');
    
    try {
      const testNumbers = ['525549679734', '525512345678', '525598765432'];
      const testMessages = [
        'Hola, necesito información sobre repuestos',
        '¿Tienen filtros de aceite?',
        'Quiero cotizar una batería'
      ];
      
      testNumbers.forEach((number, index) => {
        injectTestWhatsAppMessage(
          number,
          testMessages[index],
          `Cliente Test ${index + 1}`
        );
      });
      
      addResult('Create Multiple Chats', true, { 
        count: testNumbers.length,
        numbers: testNumbers 
      });
      
      console.log('✅ [WhatsAppTest] Múltiples chats creados exitosamente');
    } catch (error: any) {
      console.error('❌ [WhatsAppTest] Error creando múltiples chats:', error);
      addResult('Create Multiple Chats', false, undefined, error.message);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const checkChatbotStatus = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatbotSendMessage = async () => {
    if (!phoneNumber || !message) {
      addResult('Chatbot Send', false, null, 'Número y mensaje son requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const result = await chatbotApi.sendMessage({
        phoneNumber: phoneNumber,
        message: message
      });

      addResult('Chatbot Send', result.success, result, result.error);
    } catch (error: any) {
      addResult('Chatbot Send', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAI = async () => {
    if (!phoneNumber || !message) {
      addResult('Test AI', false, null, 'Número y mensaje son requeridos');
      return;
    }

    setIsLoading(true);
    try {
      const result = await chatbotApi.testAI({
        phoneNumber: phoneNumber,
        message: message
      });

      addResult('Test AI', result.success, result, result.error);
    } catch (error: any) {
      addResult('Test AI', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetConversation = async () => {
    if (!phoneNumber) {
      addResult('Get Conversation', false, null, 'Número requerido');
      return;
    }

    setIsLoading(true);
    try {
      const result = await chatbotApi.getConversation(phoneNumber);
      
      if (result.success) {
        setChatbotConversation(result.conversation);
        addResult('Get Conversation', true, result.conversation);
      } else {
        addResult('Get Conversation', false, null, result.message);
      }
    } catch (error: any) {
      addResult('Get Conversation', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error: any) {
      addResult('Chatbot Webhook', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshChatbotStats = async () => {
    setIsLoading(true);
    try {
      const result = await chatbotApi.getStats();
      
      if (result.success) {
        setChatbotStats(result.stats);
        addResult('Refresh Stats', true, result.stats);
      } else {
        addResult('Refresh Stats', false, null, result.error);
      }
    } catch (error: any) {
      addResult('Refresh Stats', false, null, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return 'No especificado';
    return phone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      // El logout redirigirá automáticamente al login
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-white whatsapp-test-page" 
      style={{ 
        background: 'white !important',
        position: 'relative',
        zIndex: 9999,
        isolation: 'isolate'
      }}
    >
      {/* Overlay sólido para ocultar completamente elementos decorativos */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: 'white',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
      
      <div 
        className="max-w-7xl mx-auto px-4 py-6 relative" 
        style={{ 
          zIndex: 2,
          position: 'relative'
        }}
      >
        {/* Header simple */}
        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                WhatsApp Business API - Pruebas
              </h1>
              <p className="text-gray-600 mt-1">
                Interfaz de pruebas para la integración de WhatsApp Business API
              </p>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {logoutLoading ? 'Cerrando...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Control - Chatbot */}
          <div className="space-y-4">
            {/* Estado del Chatbot */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">🤖 Chatbot con IA</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Backend AI:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    isChatbotConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isChatbotConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {chatbotStats && (
                  <>
                    <div className="flex justify-between">
                      <span>Conversaciones:</span>
                      <span className="font-mono">{chatbotStats.activeConversations}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Total Mensajes:</span>
                      <span className="font-mono">{chatbotStats.totalMessages}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Promedio:</span>
                      <span className="font-mono">{chatbotStats.avgMessagesPerConversation?.toFixed(1) || '0.0'}</span>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={checkChatbotStatus}
                    disabled={isLoading}
                    className="bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Verificando...' : 'Verificar'}
                  </button>
                  
                  <button
                    onClick={handleRefreshChatbotStats}
                    disabled={isLoading}
                    className="bg-purple-600 text-white py-1 px-2 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Actualizando...' : 'Stats'}
                  </button>
                </div>
              </div>
            </div>

            {/* Acciones del Chatbot */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">🧠 Acciones del Chatbot</h2>
              
              <div className="space-y-2">
                <button
                  onClick={handleTestAI}
                  disabled={isLoading}
                  className="w-full bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  🤖 Probar IA (Solo Test)
                </button>

                <button
                  onClick={handleChatbotSendMessage}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  💬 IA + Enviar WhatsApp
                </button>

                <button
                  onClick={handleChatbotWebhook}
                  disabled={isLoading}
                  className="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  🔄 Webhook + IA
                </button>

                <button
                  onClick={handleGetConversation}
                  disabled={isLoading}
                  className="w-full bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  📋 Ver Conversación
                </button>
              </div>
              
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>💡 Tip:</strong> Prueba con "Necesito un filtro de aceite para mi Toyota Corolla 2018"
              </div>
            </div>

            {/* Conversación Actual */}
            {chatbotConversation && (
              <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                <h2 className="text-lg font-semibold mb-3">💬 Conversación Actual</h2>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Teléfono:</span>
                    <span className="font-mono">{chatbotConversation.phoneNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{chatbotConversation.status}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Mensajes:</span>
                    <span>{chatbotConversation.messagesCount || 0}</span>
                  </div>
                  
                  {chatbotConversation.clientInfo && Object.keys(chatbotConversation.clientInfo).length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <h4 className="text-xs font-medium mb-1">Info Cliente:</h4>
                      <div className="space-y-1">
                        {Object.entries(chatbotConversation.clientInfo).map(([key, value], index) => {
                          if (!value) return null;
                          return (
                            <div key={`client-info-${key}-${index}`} className="flex justify-between text-xs">
                              <span className="capitalize">{key}:</span>
                              <span>{String(value)}</span>
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

          {/* Panel de Configuración */}
          <div className="space-y-4">
            {/* Estado de Conexión */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">Estado de Conexión</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Backend:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {status && (
                  <>
                    <div className="flex justify-between">
                      <span>WhatsApp:</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        status.configured ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status.configured ? 'Configurado' : 'No Configurado'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Phone ID:</span>
                      <span className="font-mono text-xs">{status.phoneId}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>API Version:</span>
                      <span className="text-xs">{status.apiVersion}</span>
                    </div>
                  </>
                )}

                <button
                  onClick={checkStatus}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verificando...' : 'Verificar Estado'}
                </button>
              </div>
            </div>

            {/* Configuración */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Configuración</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Teléfono
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Número de teléfono"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: {formatPhone(phoneNumber)}
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template
                    </label>
                    <input
                      type="text"
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Idioma
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Acciones de Prueba</h2>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Enviar Mensaje
                </button>

                <button
                  onClick={handleSendTemplate}
                  disabled={isLoading}
                  className="bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  Enviar Template
                </button>

                <button
                  onClick={handleGetPhoneInfo}
                  disabled={isLoading}
                  className="bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Info del Número
                </button>

                <button
                  onClick={handleQuickTest}
                  disabled={isLoading}
                  className="bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                >
                  Prueba Rápida
                </button>
                
                <button
                  onClick={handleDebugLoad}
                  disabled={isLoading}
                  className="bg-yellow-600 text-white py-2 px-3 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                >
                  🧪 Debug Load
                </button>

                <button
                  onClick={handleSimulateMessage}
                  disabled={isLoading}
                  className="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  🧪 Simular Mensaje
                </button>
              </div>
              
              {/* Tests Manuales */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tests Manuales (Sin Backend)</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleManualIncomingTest}
                    disabled={isLoading}
                    className="w-full bg-green-500 text-white py-2 px-3 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                  >
                    📥 Simular Mensaje RECIBIDO
                  </button>

                  <button
                    onClick={handleManualOutgoingTest}
                    disabled={isLoading}
                    className="w-full bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    📤 Simular Mensaje ENVIADO
                  </button>

                  <button
                    onClick={handleMultipleMessages}
                    disabled={isLoading}
                    className="w-full bg-purple-500 text-white py-2 px-3 rounded text-sm hover:bg-purple-600 disabled:opacity-50"
                  >
                    📱 Crear Múltiples Chats
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Resultados de Pruebas</h2>
              <button
                onClick={clearResults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">
                  No hay resultados aún. Ejecuta una prueba para ver los resultados.
                </p>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    className={`border rounded p-2 text-sm ${
                      result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{result.action}</span>
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'Éxito' : 'Error'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1">
                      {result.timestamp.toLocaleString()}
                    </p>

                    {result.error && (
                      <p className="text-xs text-red-600 mb-1">
                        Error: {result.error}
                      </p>
                    )}

                    {result.data && (
                      <pre className="text-xs bg-gray-100 rounded p-1 overflow-x-auto">
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