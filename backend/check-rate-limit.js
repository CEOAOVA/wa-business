#!/usr/bin/env node

/**
 * Script de diagnóstico de Rate Limiting
 * Verifica la configuración y estado del rate limiting
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnóstico de Rate Limiting...\n');

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, 'env.local');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📁 Usando archivo: .env');
} else if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  console.log('📁 Usando archivo: env.local');
} else {
  console.log('❌ No se encontró archivo .env o env.local');
  console.log('💡 Verificando variables de entorno del sistema...');
}

// Variables de rate limiting
const rateLimitVars = {
  'NODE_ENV': 'development/production',
  'RATE_LIMIT_WINDOW_MS': '60000',
  'RATE_LIMIT_MAX_REQUESTS': '100/300',
  'RATE_LIMIT_AUTH_MAX': '5/20',
  'RATE_LIMIT_WEBHOOK_WINDOW': '60000',
  'RATE_LIMIT_WEBHOOK_MAX': '200'
};

console.log('\n📋 Variables de Rate Limiting:\n');

let allGood = true;
const foundVars = {};

for (const [varName, expectedValue] of Object.entries(rateLimitVars)) {
  // Buscar en archivo .env
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match) {
    const value = match[1].trim();
    console.log(`✅ ${varName}: ${value}`);
    foundVars[varName] = value;
  } else {
    // Verificar en variables de entorno del sistema
    const envValue = process.env[varName];
    if (envValue) {
      console.log(`✅ ${varName}: ${envValue} (del sistema)`);
      foundVars[varName] = envValue;
    } else {
      console.log(`⚠️  ${varName}: NO CONFIGURADA (usando valor por defecto)`);
      allGood = false;
    }
  }
}

console.log('\n🔧 Configuración actual del Rate Limiting:\n');

const nodeEnv = foundVars.NODE_ENV || process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

console.log(`🌍 Entorno: ${nodeEnv} ${isProduction ? '(PRODUCCIÓN)' : '(DESARROLLO)'}`);

// Rate limiting general
const generalWindow = parseInt(foundVars.RATE_LIMIT_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || '60000');
const generalMax = isProduction ? 300 : parseInt(foundVars.RATE_LIMIT_MAX_REQUESTS || process.env.RATE_LIMIT_MAX_REQUESTS || '100');
console.log(`📊 Rate Limiting General: ${generalMax} requests por ${generalWindow/1000} segundos`);

// Rate limiting de autenticación
const authMax = isProduction ? 20 : 5;
const authWindow = 15 * 60 * 1000; // 15 minutos
console.log(`🔐 Rate Limiting Auth: ${authMax} intentos por ${authWindow/1000/60} minutos`);

// Rate limiting de webhooks
const webhookWindow = parseInt(foundVars.RATE_LIMIT_WEBHOOK_WINDOW || process.env.RATE_LIMIT_WEBHOOK_WINDOW || '60000');
const webhookMax = parseInt(foundVars.RATE_LIMIT_WEBHOOK_MAX || process.env.RATE_LIMIT_WEBHOOK_MAX || '200');
console.log(`🔗 Rate Limiting Webhook: ${webhookMax} requests por ${webhookWindow/1000} segundos`);

console.log('\n📊 Resumen de diagnóstico:');
if (allGood) {
  console.log('✅ Configuración de Rate Limiting correcta');
} else {
  console.log('⚠️  Algunas variables no están configuradas (usando valores por defecto)');
}

console.log('\n🚀 Próximos pasos:');
if (isProduction) {
  console.log('1. Verificar que las variables estén en Coolify');
  console.log('2. Redeployar el backend');
  console.log('3. Probar login nuevamente');
  console.log('4. Si persiste el error 429, esperar 15 minutos o usar clear-rate-limit.js');
} else {
  console.log('1. Reiniciar el servidor backend');
  console.log('2. Probar login nuevamente');
}

console.log('\n📝 Variables recomendadas para Coolify:');
console.log('NODE_ENV=production');
console.log('RATE_LIMIT_WINDOW_MS=60000');
console.log('RATE_LIMIT_MAX_REQUESTS=300');
console.log('RATE_LIMIT_AUTH_MAX=20');
console.log('RATE_LIMIT_WEBHOOK_WINDOW=60000');
console.log('RATE_LIMIT_WEBHOOK_MAX=200');

console.log('\n✅ Diagnóstico completado'); 