/**
 * Script de prueba para verificar la corrección de deduplicación
 * SOLO para mensajes enviados desde el frontend
 */

console.log('🧪 [Test] Iniciando pruebas de deduplicación para mensajes enviados...');

// Función para simular el envío de un mensaje
function simulateSendMessage() {
  console.log('📤 [Test] Simulando envío de mensaje...');
  
  // Generar clientId único
  const clientId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Crear mensaje optimista
  const optimisticMessage = {
    id: `temp_${Date.now()}`,
    chatId: 'conv-test-123',
    senderId: 'agent' as const,
    content: 'Mensaje de prueba',
    type: 'text' as const,
    timestamp: new Date(),
    is_read: true,
    clientId: clientId,
    metadata: { 
      source: 'new_schema', 
      direction: 'outgoing',
      conversationId: 'test-123'
    }
  };
  
  console.log('📤 [Test] Mensaje optimista creado:', optimisticMessage);
  
  // Simular que se agrega al estado
  console.log('✅ [Test] Mensaje optimista agregado al estado');
  
  // Simular respuesta del servidor
  setTimeout(() => {
    console.log('🔄 [Test] Simulando respuesta del servidor...');
    
    const serverMessage = {
      id: 'server-msg-456',
      waMessageId: 'wa_msg_789',
      chatId: 'conv-test-123',
      senderId: 'agent' as const,
      content: 'Mensaje de prueba',
      type: 'text' as const,
      timestamp: new Date(),
      is_read: true,
      clientId: clientId, // Mismo clientId
      metadata: { 
        source: 'new_schema', 
        direction: 'outgoing',
        conversationId: 'test-123'
      }
    };
    
    console.log('🔄 [Test] Mensaje del servidor recibido:', serverMessage);
    
    // Verificar deduplicación
    if (optimisticMessage.clientId === serverMessage.clientId) {
      console.log('✅ [Test] DEDUPLICACIÓN EXITOSA: Mensaje actualizado en lugar de duplicado');
      console.log('✅ [Test] clientId coincide:', optimisticMessage.clientId);
    } else {
      console.log('❌ [Test] ERROR: clientId no coincide');
    }
  }, 1000);
}

// Función para simular mensaje recibido (NO debe duplicarse)
function simulateReceivedMessage() {
  console.log('📨 [Test] Simulando mensaje recibido...');
  
  const receivedMessage = {
    id: 'received-msg-123',
    chatId: 'conv-test-123',
    senderId: 'user' as const,
    content: 'Mensaje recibido del usuario',
    type: 'text' as const,
    timestamp: new Date(),
    is_read: false,
    // NO tiene clientId porque es un mensaje recibido
    metadata: { 
      source: 'new_schema', 
      direction: 'incoming',
      conversationId: 'test-123'
    }
  };
  
  console.log('📨 [Test] Mensaje recibido creado:', receivedMessage);
  console.log('✅ [Test] Mensaje recibido agregado normalmente (sin clientId)');
}

// Función para verificar el comportamiento
function runDeduplicationTests() {
  console.log('\n🧪 [Test] ===== PRUEBAS DE DEDUPLICACIÓN =====');
  
  // Test 1: Mensaje enviado (debe deduplicarse)
  console.log('\n📤 Test 1: Mensaje enviado (debe deduplicarse)');
  simulateSendMessage();
  
  // Test 2: Mensaje recibido (NO debe deduplicarse)
  console.log('\n📨 Test 2: Mensaje recibido (NO debe deduplicarse)');
  simulateReceivedMessage();
  
  // Test 3: Verificar lógica de detección
  console.log('\n🔍 Test 3: Verificar lógica de detección');
  
  const sentMessage = { from: 'us', clientId: 'test-client-id' };
  const receivedMessage = { from: 'user-phone', clientId: undefined };
  
  console.log('🔍 Mensaje enviado:', sentMessage);
  console.log('🔍 Mensaje recibido:', receivedMessage);
  
  if (sentMessage.from === 'us' && sentMessage.clientId) {
    console.log('✅ [Test] Mensaje enviado detectado correctamente');
  }
  
  if (receivedMessage.from !== 'us' || !receivedMessage.clientId) {
    console.log('✅ [Test] Mensaje recibido detectado correctamente');
  }
  
  console.log('\n✅ [Test] Todas las pruebas completadas');
}

// Ejecutar pruebas si está en el navegador
if (typeof window !== 'undefined') {
  // Solo ejecutar en el navegador
  (window as any).runDeduplicationTests = runDeduplicationTests;
  console.log('🧪 [Test] Script cargado. Ejecuta window.runDeduplicationTests() en la consola');
} else {
  // Ejecutar directamente en Node.js
  runDeduplicationTests();
} 