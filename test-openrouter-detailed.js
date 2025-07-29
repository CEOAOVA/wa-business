const axios = require('axios');

/**
 * Script detallado para probar la API de OpenRouter
 * Incluye debugging completo de headers y respuestas
 */
async function testOpenRouterDetailed() {
  console.log('🧪 Test Detallado de OpenRouter API...\n');

  const apiKey = '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';
  const baseURL = 'https://openrouter.ai/api/v1';
  const model = 'google/gemini-flash-1.5';

  console.log('📡 Configuración:');
  console.log('  API Key:', apiKey.substring(0, 20) + '...');
  console.log('  Modelo:', model);
  console.log('  URL:', baseURL);
  console.log('');

  // Test 1: Verificar la API key primero
  console.log('🔍 Test 1: Verificar API key');
  try {
    const authResponse = await axios.get(`${baseURL}/auth/key`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ API key válida');
    console.log('  Respuesta:', JSON.stringify(authResponse.data, null, 2));
    console.log('');

  } catch (error) {
    console.log('❌ Error verificando API key:');
    console.log('  Status:', error.response?.status);
    console.log('  Headers enviados:', {
      'Authorization': `Bearer ${apiKey.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    });
    console.log('  Error completo:', error.response?.data || error.message);
    console.log('');
    return;
  }

  // Test 2: Llamada simple
  console.log('🔍 Test 2: Llamada simple');
  try {
    const simplePayload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: 'Hola, responde solo "OK"'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    };

    console.log('  Payload:', JSON.stringify(simplePayload, null, 2));
    console.log('  Headers:', {
      'Authorization': `Bearer ${apiKey.substring(0, 20)}...`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3002',
      'X-Title': 'Embler WhatsApp Chatbot'
    });

    const simpleResponse = await axios.post(
      `${baseURL}/chat/completions`,
      simplePayload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3002',
          'X-Title': 'Embler WhatsApp Chatbot'
        },
        timeout: 30000
      }
    );

    console.log('✅ Test 2 exitoso');
    console.log('  Respuesta:', simpleResponse.data.choices[0]?.message?.content);
    console.log('  Tokens usados:', simpleResponse.data.usage);
    console.log('');

  } catch (error) {
    console.log('❌ Error en llamada simple:');
    console.log('  Status:', error.response?.status);
    console.log('  Error:', error.response?.data || error.message);
    console.log('');
  }

  // Test 3: Probar con diferentes headers
  console.log('🔍 Test 3: Probar con headers alternativos');
  try {
    const altPayload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: 'Test'
        }
      ],
      max_tokens: 10
    };

    const altResponse = await axios.post(
      `${baseURL}/chat/completions`,
      altPayload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ Test 3 exitoso');
    console.log('  Respuesta:', altResponse.data.choices[0]?.message?.content);
    console.log('');

  } catch (error) {
    console.log('❌ Error en test alternativo:');
    console.log('  Status:', error.response?.status);
    console.log('  Error:', error.response?.data || error.message);
    console.log('');
  }

  console.log('🎯 Resumen:');
  console.log('  - Si todos los tests fallan con 401, la API key no es válida');
  console.log('  - Si algunos tests funcionan, hay un problema de configuración');
  console.log('  - Verifica que la key tenga créditos en: https://openrouter.ai/keys');
}

// Ejecutar el test
testOpenRouterDetailed()
  .then(() => {
    console.log('\n✅ Test detallado completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en test detallado:', error);
    process.exit(1);
  });