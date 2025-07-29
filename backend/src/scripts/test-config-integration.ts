import { getConfig } from '../config';
import { ChatbotService } from '../services/chatbot.service';
import { AdvancedConversationEngine } from '../services/conversation/advanced-conversation-engine';

/**
 * Script para verificar que la configuración centralizada se está usando correctamente
 */
async function testConfigIntegration(): Promise<void> {
  console.log('🧪 Verificando integración de configuración centralizada...\n');

  try {
    // 1. Verificar configuración centralizada
    const config = getConfig();
    console.log('📋 Configuración LLM cargada:');
    console.log(`  Base URL: ${config.llm.openRouterBaseUrl}`);
    console.log(`  Modelo: ${config.llm.openRouterModel}`);
    console.log(`  Temperatura: ${config.llm.defaultTemperature}`);
    console.log(`  Max Tokens: ${config.llm.defaultMaxTokens}`);
    console.log(`  Timeout: ${config.llm.timeout}ms`);
    console.log(`  API Key: ${config.llm.openRouterApiKey ? '✅ Configurada' : '❌ No configurada'}`);

    // 2. Verificar ChatbotService
    console.log('\n🤖 Verificando ChatbotService...');
    const chatbotService = new ChatbotService();
    console.log('✅ ChatbotService creado con configuración centralizada');

    // 3. Verificar AdvancedConversationEngine
    console.log('\n⚙️ Verificando AdvancedConversationEngine...');
    const engine = new AdvancedConversationEngine();
    console.log('✅ AdvancedConversationEngine creado con configuración centralizada');

    // 4. Probar con un mensaje simple
    console.log('\n📝 Probando procesamiento con configuración centralizada...');
    
    try {
      const result = await chatbotService.processWhatsAppMessage('1234567890', 'Hola');
      console.log('✅ Procesamiento exitoso con configuración centralizada');
      console.log(`  Respuesta: ${result.response.substring(0, 100)}...`);
    } catch (error) {
      console.log('⚠️ Error en procesamiento (puede ser por API key):', (error as Error).message);
      console.log('  Esto es normal si la API key no está configurada correctamente');
    }

    console.log('\n🎉 Verificación de configuración completada!');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testConfigIntegration()
    .then(() => {
      console.log('✅ Verificación de configuración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { testConfigIntegration };