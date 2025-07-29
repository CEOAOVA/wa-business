import { ChatbotService } from '../services/chatbot.service';

/**
 * Script para probar la integración del chatbot con las nuevas funciones
 */
async function testChatbotIntegration(): Promise<void> {
  console.log('🧪 Probando integración del chatbot con búsqueda de productos...\n');

  try {
    const chatbotService = new ChatbotService();

    // Simular un mensaje de WhatsApp
    const phoneNumber = '5512345678';
    const testMessage = 'Necesito balatas para mi Toyota Corolla 2018';

    console.log(`📱 Mensaje de prueba: "${testMessage}"`);
    console.log(`📞 Número: ${phoneNumber}\n`);

    // Procesar el mensaje
    const result = await chatbotService.processWhatsAppMessage(phoneNumber, testMessage);

    console.log('📤 Respuesta del chatbot:');
    console.log('✅ Éxito:', result.shouldSend);
    console.log('💬 Mensaje:', result.response);
    
    if (result.error) {
      console.log('❌ Error:', result.error);
    }

    if (result.conversationState) {
      console.log('\n📊 Estado de la conversación:');
      console.log('  ID:', result.conversationState.conversationId);
      console.log('  Estado:', result.conversationState.status);
      console.log('  Datos del cliente:', JSON.stringify(result.conversationState.clientInfo, null, 2));
      console.log('  Mensajes:', result.conversationState.messages.length);
    }

    console.log('\n🎉 Prueba completada!');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testChatbotIntegration()
    .then(() => {
      console.log('✅ Prueba de integración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en prueba de integración:', error);
      process.exit(1);
    });
}

export { testChatbotIntegration };