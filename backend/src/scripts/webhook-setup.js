#!/usr/bin/env node

/**
 * Script para configurar y verificar webhooks de WhatsApp con ngrok
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Verificar si ngrok está instalado
function checkNgrokInstalled() {
  try {
    execSync('ngrok version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Obtener información de ngrok
async function getNgrokInfo() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout connecting to ngrok API'));
    });
  });
}

// Verificar variables de entorno
function checkEnvironmentVariables() {
  const envPath = path.join(__dirname, '../../.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ Archivo .env no encontrado en backend/', colors.red);
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WEBHOOK_VERIFY_TOKEN'
  ];

  const missing = requiredVars.filter(varName => {
    return !envContent.includes(`${varName}=`) || envContent.includes(`${varName}=tu_`);
  });

  if (missing.length > 0) {
    log('❌ Variables de entorno faltantes o con valores por defecto:', colors.red);
    missing.forEach(varName => log(`   - ${varName}`, colors.red));
    return false;
  }

  log('✅ Variables de entorno configuradas correctamente', colors.green);
  return true;
}

// Verificar conectividad del backend
async function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.status === 'ok');
        } catch (error) {
          resolve(false);
        }
      });
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Función principal
async function main() {
  log('🔧 Verificando configuración de webhooks de WhatsApp\n', colors.cyan);

  // 1. Verificar ngrok
  log('1. Verificando ngrok...', colors.bright);
  if (!checkNgrokInstalled()) {
    log('❌ ngrok no está instalado. Instalalo desde https://ngrok.com/download', colors.red);
    log('   O con: npm install -g ngrok', colors.yellow);
    process.exit(1);
  }
  log('✅ ngrok está instalado', colors.green);

  // 2. Verificar variables de entorno
  log('\n2. Verificando variables de entorno...', colors.bright);
  if (!checkEnvironmentVariables()) {
    log('\n💡 Guía de configuración:', colors.yellow);
    log('   1. Copia el archivo .env.example a .env', colors.yellow);
    log('   2. Configura tus tokens de WhatsApp Business API', colors.yellow);
    log('   3. Ve a: https://developers.facebook.com/', colors.yellow);
    process.exit(1);
  }

  // 3. Verificar backend
  log('\n3. Verificando backend...', colors.bright);
  const backendRunning = await checkBackendHealth();
  if (!backendRunning) {
    log('❌ Backend no está ejecutándose en puerto 3001', colors.red);
    log('   Ejecuta: npm run dev (en el directorio backend)', colors.yellow);
    process.exit(1);
  }
  log('✅ Backend está ejecutándose correctamente', colors.green);

  // 4. Verificar ngrok
  log('\n4. Verificando túnel ngrok...', colors.bright);
  try {
    const ngrokInfo = await getNgrokInfo();
    const tunnel = ngrokInfo.tunnels.find(t => t.config.addr === 'http://localhost:3001');
    
    if (!tunnel) {
      log('❌ No se encontró túnel de ngrok para puerto 3001', colors.red);
      log('   Ejecuta: ngrok http 3001', colors.yellow);
      process.exit(1);
    }

    const webhookUrl = `${tunnel.public_url}/api/chat/webhook`;
    log('✅ Túnel ngrok activo:', colors.green);
    log(`   URL pública: ${tunnel.public_url}`, colors.cyan);
    log(`   Webhook URL: ${webhookUrl}`, colors.cyan);

    // 5. Generar comandos útiles
    log('\n📋 Próximos pasos:', colors.bright);
    log(`   1. Configura webhook en Meta Developers:`, colors.yellow);
    log(`      URL: ${webhookUrl}`, colors.cyan);
    log(`      Token: [usa el valor de WEBHOOK_VERIFY_TOKEN]`, colors.cyan);
    
    log('\n   2. Prueba el webhook:', colors.yellow);
    log(`      curl -X GET "${webhookUrl}?hub.mode=subscribe&hub.challenge=test&hub.verify_token=TU_TOKEN"`, colors.cyan);

    log('\n   3. Envía un mensaje de prueba al número de WhatsApp Business', colors.yellow);
    
    log('\n🚀 Sistema listo para recibir webhooks de WhatsApp!', colors.green);

  } catch (error) {
    log('❌ Error conectando con ngrok API:', colors.red);
    log(`   ${error.message}`, colors.red);
    log('   Asegúrate de que ngrok esté ejecutándose: ngrok http 3001', colors.yellow);
    process.exit(1);
  }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  log(`❌ Error inesperado: ${error.message}`, colors.red);
  process.exit(1);
});

// Ejecutar
main().catch((error) => {
  log(`❌ Error: ${error.message}`, colors.red);
  process.exit(1);
}); 