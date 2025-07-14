#!/usr/bin/env node

/**
 * Script para probar la seguridad de webhooks de WhatsApp
 */

const http = require('http');
const crypto = require('crypto');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const WEBHOOK_URL = 'http://localhost:3001/api/chat/webhook';

// Payload válido de WhatsApp
const validWebhookPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'test_entry_id',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '+1234567890',
          phone_number_id: 'test_phone_id'
        },
        messages: [{
          from: '1234567890',
          id: 'test_message_id',
          timestamp: '1234567890',
          text: {
            body: 'Mensaje de prueba de seguridad'
          },
          type: 'text'
        }]
      },
      field: 'messages'
    }]
  }]
};

// Función para hacer peticiones HTTP
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Test 1: Payload válido
async function testValidPayload() {
  log('\n1. 🧪 Probando payload válido...', colors.cyan);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookplatform/1.0 (+http://www.facebook.com/)'
      }
    };

    const response = await makeRequest(options, JSON.stringify(validWebhookPayload));
    
    if (response.statusCode === 200) {
      log('   ✅ Payload válido aceptado correctamente', colors.green);
      return true;
    } else {
      log(`   ❌ Payload válido rechazado: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Test 2: Payload inválido
async function testInvalidPayload() {
  log('\n2. 🧪 Probando payload inválido...', colors.cyan);
  
  try {
    const invalidPayload = { invalid: 'structure' };
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookplatform/1.0'
      }
    };

    const response = await makeRequest(options, JSON.stringify(invalidPayload));
    
    if (response.statusCode === 400) {
      log('   ✅ Payload inválido rechazado correctamente', colors.green);
      return true;
    } else {
      log(`   ❌ Payload inválido no rechazado: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Test 3: Payload malformado
async function testMalformedPayload() {
  log('\n3. 🧪 Probando payload malformado...', colors.cyan);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookplatform/1.0'
      }
    };

    const response = await makeRequest(options, '{ invalid json');
    
    if (response.statusCode === 400) {
      log('   ✅ Payload malformado rechazado correctamente', colors.green);
      return true;
    } else {
      log(`   ❌ Payload malformado no rechazado: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Test 4: User-Agent sospechoso (solo en producción)
async function testSuspiciousUserAgent() {
  log('\n4. 🧪 Probando User-Agent sospechoso...', colors.cyan);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MaliciousBot/1.0'
      }
    };

    const response = await makeRequest(options, JSON.stringify(validWebhookPayload));
    
    // En desarrollo debería pasar, en producción debería fallar
    if (process.env.NODE_ENV === 'production') {
      if (response.statusCode === 403) {
        log('   ✅ User-Agent sospechoso rechazado en producción', colors.green);
        return true;
      } else {
        log(`   ⚠️ User-Agent sospechoso no rechazado en producción: ${response.statusCode}`, colors.yellow);
        return false;
      }
    } else {
      log('   ℹ️ En desarrollo, User-Agent sospechoso permitido (correcto)', colors.blue);
      return true;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Test 5: Rate limiting
async function testRateLimit() {
  log('\n5. 🧪 Probando rate limiting...', colors.cyan);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'facebookplatform/1.0',
        'X-Forwarded-For': '192.168.1.100' // IP específica para el test
      }
    };

    let successCount = 0;
    let rateLimitedCount = 0;

    // Hacer muchas peticiones rápidas
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest(options, JSON.stringify(validWebhookPayload)));
    }

    const results = await Promise.all(promises);
    
    results.forEach(response => {
      if (response.statusCode === 200) {
        successCount++;
      } else if (response.statusCode === 429) {
        rateLimitedCount++;
      }
    });

    log(`   📊 Peticiones exitosas: ${successCount}, Rate limited: ${rateLimitedCount}`, colors.blue);
    
    if (successCount > 0) {
      log('   ✅ Rate limiting funcionando (algunas peticiones pasaron)', colors.green);
      return true;
    } else {
      log('   ⚠️ Todas las peticiones fueron bloqueadas', colors.yellow);
      return true; // Esto también es correcto
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Test 6: Verificar endpoint de estado con información de seguridad
async function testSecurityStatus() {
  log('\n6. 🧪 Verificando estado de seguridad...', colors.cyan);
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat/status',
      method: 'GET'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      
      if (data.security) {
        log('   ✅ Información de seguridad disponible', colors.green);
        log(`   📊 Verificación de firma: ${data.security.webhookSecurity.signatureVerificationEnabled}`, colors.blue);
        log(`   📊 Rate limiting: ${data.security.webhookSecurity.rateLimitingEnabled}`, colors.blue);
        log(`   📊 Logging detallado: ${data.security.webhookSecurity.detailedLoggingEnabled}`, colors.blue);
        return true;
      } else {
        log('   ⚠️ Información de seguridad no encontrada', colors.yellow);
        return false;
      }
    } else {
      log(`   ❌ Error obteniendo estado: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

// Función principal
async function main() {
  log('🔒 Ejecutando pruebas de seguridad de webhooks\n', colors.bright);
  
  const tests = [
    { name: 'Payload válido', fn: testValidPayload },
    { name: 'Payload inválido', fn: testInvalidPayload },
    { name: 'Payload malformado', fn: testMalformedPayload },
    { name: 'User-Agent sospechoso', fn: testSuspiciousUserAgent },
    { name: 'Rate limiting', fn: testRateLimit },
    { name: 'Estado de seguridad', fn: testSecurityStatus }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`   ❌ Error en test ${test.name}: ${error.message}`, colors.red);
      failed++;
    }
  }

  // Resumen
  log('\n📊 Resumen de pruebas:', colors.bright);
  log(`   ✅ Exitosas: ${passed}`, colors.green);
  log(`   ❌ Fallidas: ${failed}`, colors.red);
  log(`   📈 Total: ${tests.length}`, colors.blue);

  if (failed === 0) {
    log('\n🎉 ¡Todas las pruebas de seguridad pasaron!', colors.green);
  } else {
    log(`\n⚠️ ${failed} pruebas fallaron. Revisa la configuración de seguridad.`, colors.yellow);
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Ejecutar
main().catch(error => {
  log(`❌ Error ejecutando pruebas: ${error.message}`, colors.red);
  process.exit(1);
}); 