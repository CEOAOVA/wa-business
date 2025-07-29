import axios from 'axios';

/**
 * Script rápido para probar la API de OpenRouter
 */
async function testOpenRouterAPI(): Promise<void> {
  console.log('🧪 Probando API de OpenRouter...\n');

  const apiKey = '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';
  const baseURL = 'https://openrouter.ai/api/v1';
  const model = 'google/gemini-2.5-flash-lite-preview-06-17';

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
          content: 'Hola, ¿cómo estás?'
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

    // Test 2: Llamada con funciones
    console.log('🔍 Test 2: Llamada con funciones de búsqueda de productos');
    const functionPayload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Eres un vendedor de refacciones. Cuando el cliente mencione un producto, usa las funciones disponibles.'
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
            description: 'Buscar productos en el catálogo',
            parameters: {
              type: 'object',
              properties: {
                termino: {
                  type: 'string',
                  description: 'Término de búsqueda'
                },
                datosAuto: {
                  type: 'object',
                  description: 'Datos del auto',
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

    console.log('🎉 ¡Todos los tests exitosos! La API key es válida.');

  } catch (error: any) {
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

// Ejecutar si se llama directamente
if (require.main === module) {
  testOpenRouterAPI()
    .then(() => {
      console.log('\n✅ Prueba de API completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en prueba de API:', error);
      process.exit(1);
    });
}

export { testOpenRouterAPI };