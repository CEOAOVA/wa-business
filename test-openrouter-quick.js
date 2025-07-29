const axios = require('axios');

/**
 * Script rápido para probar la API de OpenRouter
 * Usa la API key proporcionada por el usuario
 */
async function testOpenRouterAPI() {
  console.log('🧪 Probando API de OpenRouter...\n');

  // API key del usuario
  const apiKey = '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';
  const baseURL = 'https://openrouter.ai/api/v1';
  const model = 'google/gemini-flash-1.5';

  try {
    console.log('📡 Configuración:');
    console.log('  API Key:', apiKey.substring(0, 20) + '...');
    console.log('  Modelo:', model);
    console.log('  URL:', baseURL);
    console.log('');

    // Test 1: Llamada simple sin funciones
    console.log('🔍 Test 1: Llamada simple sin funciones');
    const simplePayload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: 'Hola, ¿cómo estás? Responde en español.'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    };

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

    console.log('✅ Test 1 exitoso');
    console.log('  Respuesta:', simpleResponse.data.choices[0]?.message?.content);
    console.log('  Tokens usados:', simpleResponse.data.usage);
    console.log('');

    // Test 2: Llamada con funciones para chatbot de repuestos
    console.log('🔍 Test 2: Llamada con funciones de búsqueda de productos');
    const functionPayload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Eres un vendedor de refacciones automotrices. Cuando el cliente mencione un producto, usa las funciones disponibles para buscar en el catálogo.'
        },
        {
          role: 'user',
          content: 'Necesito balatas para mi Toyota Corolla 2018'
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'buscarProductoPorTermino',
            description: 'Buscar productos en el catálogo de refacciones',
            parameters: {
              type: 'object',
              properties: {
                termino: {
                  type: 'string',
                  description: 'Término de búsqueda del producto'
                },
                datosAuto: {
                  type: 'object',
                  description: 'Datos del automóvil',
                  properties: {
                    marca: { type: 'string' },
                    modelo: { type: 'string' },
                    año: { type: 'number' }
                  }
                }
              },
              required: ['termino']
            }
          }
        }
      ],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500
    };

    const functionResponse = await axios.post(
      `${baseURL}/chat/completions`,
      functionPayload,
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
    console.log('  Respuesta:', functionResponse.data.choices[0]?.message?.content);
    console.log('  Tool calls:', functionResponse.data.choices[0]?.message?.tool_calls);
    console.log('  Tokens usados:', functionResponse.data.usage);
    console.log('');

    // Test 3: Verificar créditos disponibles
    console.log('🔍 Test 3: Verificar créditos disponibles');
    const creditsResponse = await axios.get(
      `${baseURL}/auth/key`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Test 3 exitoso');
    console.log('  Créditos disponibles:', creditsResponse.data);
    console.log('');

    console.log('🎉 ¡Todos los tests exitosos! La API key es válida y funcional.');
    console.log('✅ La API key está lista para usar en tu proyecto.');

  } catch (error) {
    console.error('❌ Error en la prueba:');
    console.error('  Status:', error.response?.status);
    console.error('  Message:', error.response?.data?.error?.message || error.message);
    console.error('  Code:', error.response?.data?.error?.code);
    
    if (error.response?.status === 401) {
      console.error('\n🔑 La API key no es válida o ha expirado.');
      console.error('   Verifica que la key sea correcta y tenga créditos disponibles.');
    } else if (error.response?.status === 429) {
      console.error('\n⏰ Rate limit alcanzado. Espera un momento antes de intentar de nuevo.');
    } else {
      console.error('\n🔧 Error de configuración o red.');
    }
  }
}

// Ejecutar la prueba
testOpenRouterAPI()
  .then(() => {
    console.log('\n✅ Prueba de API completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en prueba de API:', error);
    process.exit(1);
  });