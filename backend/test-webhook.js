const http = require('http');
const https = require('https');

// Configuración del test
const BASE_URL = 'http://localhost:3003';
const WEBHOOK_PATH = '/api/chat/webhook';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookplatform/1.0'  // User-Agent de Meta/Facebook que siempre está permitido
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testWebhook() {
  console.log('🧪 Iniciando pruebas del webhook...\n');
  
  try {
    // Test 1: Verificar que el servidor está corriendo
    console.log('📡 Test 1: Verificar estado del servidor');
    try {
      const healthResponse = await makeRequest('GET', '/api/chat/webhook/health');
      console.log(`✅ Servidor corriendo - Status: ${healthResponse.statusCode}`);
      if (healthResponse.statusCode === 200) {
        const health = JSON.parse(healthResponse.body);
        console.log(`   Healthy: ${health.healthy}`);
        console.log(`   Webhook URL: ${health.webhook?.getEndpoint || 'No configurado'}`);
        console.log(`   Token configurado: ${health.webhook?.verifyTokenConfigured || false}`);
      }
    } catch (error) {
      console.log(`❌ Error conectando al servidor: ${error.message}`);
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Verificación de webhook (GET)
    console.log('🔐 Test 2: Verificación de webhook (GET)');
    const verifyParams = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.challenge': 'test_challenge_123',
      'hub.verify_token': 'verify_embler_token_2025@' // Cambia este valor por tu token real
    });
    
    try {
      const verifyResponse = await makeRequest('GET', `${WEBHOOK_PATH}?${verifyParams}`);
      console.log(`Status: ${verifyResponse.statusCode} ${verifyResponse.statusMessage}`);
      console.log(`Response: ${verifyResponse.body}`);
      
      if (verifyResponse.statusCode === 200 && verifyResponse.body === 'test_challenge_123') {
        console.log('✅ Verificación del webhook exitosa');
      } else if (verifyResponse.statusCode === 403) {
        console.log('❌ Token de verificación incorrecto');
        console.log('💡 Asegúrate de que hub.verify_token coincida con WEBHOOK_VERIFY_TOKEN en tu .env');
      } else {
        console.log('⚠️ Respuesta inesperada del webhook');
      }
    } catch (error) {
      console.log(`❌ Error en verificación: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Webhook POST (mensaje simulado)
    console.log('📨 Test 3: Webhook POST (mensaje simulado)');
    const webhookMessage = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_test',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: 'test_phone_id'
                },
                contacts: [
                  {
                    profile: { name: 'Test User' },
                    wa_id: '123456789'
                  }
                ],
                messages: [
                  {
                    from: '123456789',
                    id: 'test_message_id',
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: 'Hola, este es un mensaje de prueba' },
                    type: 'text'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    try {
      const postResponse = await makeRequest('POST', WEBHOOK_PATH, webhookMessage);
      console.log(`Status: ${postResponse.statusCode} ${postResponse.statusMessage}`);
      console.log(`Response: ${postResponse.body}`);
      
      if (postResponse.statusCode === 200) {
        console.log('✅ Webhook POST procesado exitosamente');
      } else {
        console.log('❌ Error procesando webhook POST');
      }
    } catch (error) {
      console.log(`❌ Error en webhook POST: ${error.message}`);
    }

  } catch (error) {
    console.log(`💥 Error general: ${error.message}`);
  }

  console.log('\n🏁 Pruebas completadas');
}

// Ejecutar las pruebas
testWebhook(); 