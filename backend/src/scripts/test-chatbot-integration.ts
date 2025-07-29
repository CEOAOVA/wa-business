import { ChatbotService } from '../services/chatbot.service';

/**
 * Script para probar la integración del ChatbotService con AdvancedConversationEngine
 */
async function testChatbotIntegration(): Promise<void> {
  console.log('🧪 Probando integración ChatbotService + AdvancedConversationEngine...\n');

  try {
    const chatbotService = new ChatbotService();

    // Simular mensajes de prueba
    const testMessages = [
      // 1. Solo saludo - no debe buscar productos
      "Hola",
      
      // 2. Solo pieza - debe preguntar por datos del auto
      "Necesito balatas",
      
      // 3. Solo datos del auto - debe preguntar qué pieza busca
      "Tengo un Toyota Corolla 2018",
      
      // 4. Información completa - debe buscar productos
      "Necesito balatas para mi Toyota Corolla 2018",
      
      // 5. Información completa con marca específica
      "Busco filtro de aceite para Honda Civic 2020"
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n📝 Mensaje ${i + 1}: "${message}"`);
      
      try {
        const result = await chatbotService.processWhatsAppMessage('1234567890', message);
        
        console.log(`  ✅ Respuesta: ${result.response.substring(0, 100)}...`);
        console.log(`  Intent: ${result.conversationState?.status}`);
        console.log(`  Debe enviar: ${result.shouldSend}`);
        
        if (result.error) {
          console.log(`  ❌ Error: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error procesando mensaje: ${error}`);
      }
    }

    console.log('\n🎉 Pruebas de integración completadas!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testChatbotIntegration()
    .then(() => {
      console.log('✅ Pruebas de integración completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en pruebas:', error);
      process.exit(1);
    });
}

export { testChatbotIntegration };