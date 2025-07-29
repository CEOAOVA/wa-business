import { getConfig } from '../config';
import { openAIClient } from '../config/openai-client';

/**
 * Script para verificar la configuración de OpenRouter
 */
async function testOpenRouterConfig(): Promise<void> {
  console.log('🧪 Verificando configuración de OpenRouter...\n');

  try {
    // 1. Verificar configuración
    const config = getConfig();
    console.log('📋 Configuración LLM:');
    console.log(`  Base URL: ${config.llm.openRouterBaseUrl}`);
    console.log(`  Modelo: ${config.llm.openRouterModel}`);
    console.log(`  Temperatura: ${config.llm.defaultTemperature}`);
    console.log(`  Max Tokens: ${config.llm.defaultMaxTokens}`);
    console.log(`  Timeout: ${config.llm.timeout}ms`);
    console.log(`  API Key: ${config.llm.openRouterApiKey ? '✅ Configurada' : '❌ No configurada'}`);

    // 2. Verificar cliente OpenAI
    console.log('\n🤖 Verificando cliente OpenAI...');
    console.log('✅ Cliente OpenAI creado');

    // 3. Probar conexión
    console.log('\n🔗 Probando conexión con OpenRouter...');
    const connectionTest = await openAIClient.testConnection();
    
    if (connectionTest.success) {
      console.log(`✅ Conexión exitosa (latencia: ${connectionTest.latency}ms)`);
    } else {
      console.log(`❌ Error de conexión: ${connectionTest.error}`);
    }

    // 4. Probar llamada completa
    console.log('\n📝 Probando llamada completa...');
    try {
      const response = await openAIClient.createChatCompletion({
        messages: [
          { role: 'system', content: 'Eres un asistente útil.' },
          { role: 'user', content: 'Hola, ¿cómo estás?' }
        ],
        max_tokens: 50
      });
      
      console.log('✅ Llamada exitosa');
      console.log(`  Respuesta: ${response.content}`);
      console.log(`  Modelo usado: ${response.model || 'No especificado'}`);
      
    } catch (error) {
      console.log('❌ Error en llamada completa:', (error as Error).message);
    }

    console.log('\n🎉 Verificación de OpenRouter completada!');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testOpenRouterConfig()
    .then(() => {
      console.log('✅ Verificación de OpenRouter completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { testOpenRouterConfig };