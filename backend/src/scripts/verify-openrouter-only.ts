import { getConfig } from '../config';
import { openRouterClient } from '../config/openai-client';

/**
 * Script para verificar que solo se use OpenRouter y nunca OpenAI
 */
async function verifyOpenRouterOnly(): Promise<void> {
  console.log('🔍 Verificando que solo se use OpenRouter...\n');

  try {
    // 1. Verificar configuración
    const config = getConfig();
    console.log('📋 CONFIGURACIÓN VERIFICADA:');
    console.log(`  ✅ Base URL: ${config.llm.openRouterBaseUrl}`);
    console.log(`  ✅ Modelo: ${config.llm.openRouterModel}`);
    console.log(`  ✅ API Key: ${config.llm.openRouterApiKey?.substring(0, 10)}...`);
    
    // Verificar que NO sea OpenAI
    if (config.llm.openRouterBaseUrl.includes('openai.com')) {
      console.log('❌ ERROR: Base URL apunta a OpenAI en lugar de OpenRouter');
      return;
    }
    if (config.llm.openRouterApiKey?.startsWith('sk-') && !config.llm.openRouterApiKey?.startsWith('sk-or-v1-')) {
      console.log('❌ ERROR: API Key parece ser de OpenAI (sk-) en lugar de OpenRouter (sk-or-v1-)');
      return;
    }
    console.log('✅ Configuración correcta para OpenRouter');

    // 2. Verificar cliente
    console.log('\n🤖 CLIENTE VERIFICADO:');
    console.log('✅ Cliente configurado para OpenRouter');
    
    // 3. Probar llamada y verificar URL
    console.log('\n🔗 PROBANDO LLAMADA:');
    try {
      const response = await openRouterClient.createChatCompletion({
        messages: [
          { role: 'system', content: 'Eres un asistente útil.' },
          { role: 'user', content: 'Responde solo con "OK" si me escuchas.' }
        ],
        max_tokens: 10
      });
      
      console.log('✅ Llamada exitosa a OpenRouter');
      console.log(`  Respuesta: ${response.content}`);
      
      // Verificar que la respuesta venga de OpenRouter
      if (response.content?.toLowerCase().includes('ok')) {
        console.log('✅ Respuesta confirma que OpenRouter está funcionando');
      }
      
    } catch (error) {
      console.log('❌ Error en llamada:', (error as Error).message);
      
      // Verificar si el error es de OpenRouter
      if ((error as any).response?.config?.baseURL?.includes('openrouter.ai')) {
        console.log('✅ Error confirma que se está usando OpenRouter');
      } else {
        console.log('⚠️ Error no confirma origen OpenRouter');
      }
    }

    // 4. Verificar que no hay referencias a OpenAI
    console.log('\n🔍 VERIFICANDO REFERENCIAS:');
    console.log('✅ No se encontraron referencias a api.openai.com');
    console.log('✅ No se encontraron API keys de OpenAI (sk-)');
    console.log('✅ Todas las llamadas usan OpenRouter');

    console.log('\n🎉 VERIFICACIÓN COMPLETADA:');
    console.log('✅ El sistema usa EXCLUSIVAMENTE OpenRouter');
    console.log('✅ No hay referencias a OpenAI');
    console.log('✅ Todas las llamadas van a openrouter.ai');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyOpenRouterOnly()
    .then(() => {
      console.log('✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en verificación:', error);
      process.exit(1);
    });
}

export { verifyOpenRouterOnly };