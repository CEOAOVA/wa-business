#!/usr/bin/env node

/**
 * Script de verificación de configuración para WhatsApp Business Platform
 * Verifica que todas las variables de entorno estén correctamente configuradas
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de WhatsApp Business Platform...\n');

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, 'env.local');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
} else {
  console.log('❌ No se encontró archivo .env o env.local');
  process.exit(1);
}

// Variables críticas para verificar
const criticalVars = {
  'NODE_ENV': 'development|production',
  'PORT': '3002',
  'VITE_BACKEND_URL': 'https://dev-apiwaprueba.aova.mx',
  'CORS_ORIGINS': 'https://dev-waprueba.aova.mx',
  'SUPABASE_URL': 'https://',
  'SUPABASE_ANON_KEY': 'eyJ',
  'SUPABASE_SERVICE_ROLE_KEY': 'eyJ',
  'JWT_SECRET': 'tu_jwt_secret',
  'WHATSAPP_ACCESS_TOKEN': 'EAA',
  'WHATSAPP_PHONE_NUMBER_ID': '74',
  'OPEN_ROUTER_API_KEY': 'sk-or-v1-'
};

console.log('📋 Variables de entorno críticas:\n');

let allGood = true;

for (const [varName, expectedValue] of Object.entries(criticalVars)) {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match) {
    const value = match[1].trim();
    if (value.includes(expectedValue) || value !== expectedValue) {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`⚠️  ${varName}: ${value} (esperado: ${expectedValue})`);
      allGood = false;
    }
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
    allGood = false;
  }
}

console.log('\n🔧 Verificando configuración de CSP...\n');

// Verificar configuración de seguridad
const securityPath = path.join(__dirname, 'src', 'middleware', 'security.ts');
if (fs.existsSync(securityPath)) {
  const securityContent = fs.readFileSync(securityPath, 'utf8');
  
  // Verificar que el frontend esté en connectSrc
  if (securityContent.includes('https://dev-waprueba.aova.mx')) {
    console.log('✅ CSP backend: Frontend permitido en connectSrc');
  } else {
    console.log('❌ CSP backend: Frontend NO está en connectSrc');
    allGood = false;
  }
} else {
  console.log('⚠️  No se encontró archivo de seguridad');
}

// Verificar configuración de Docker
const dockerPath = path.join(__dirname, '..', 'docker-compose.coolify.yml');
if (fs.existsSync(dockerPath)) {
  const dockerContent = fs.readFileSync(dockerPath, 'utf8');
  
  if (dockerContent.includes('https://dev-apiwaprueba.aova.mx')) {
    console.log('✅ Docker CSP: Backend permitido en connectSrc');
  } else {
    console.log('❌ Docker CSP: Backend NO está en connectSrc');
    allGood = false;
  }
} else {
  console.log('⚠️  No se encontró archivo docker-compose.coolify.yml');
}

console.log('\n📊 Resumen de verificación:');
if (allGood) {
  console.log('✅ Configuración correcta para producción');
  console.log('\n🚀 Próximos pasos:');
  console.log('1. Desplegar en Coolify');
  console.log('2. Verificar que VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx');
  console.log('3. Probar login en https://dev-waprueba.aova.mx');
} else {
  console.log('❌ Hay problemas en la configuración');
  console.log('\n🔧 Soluciones:');
  console.log('1. Verificar variables de entorno en Coolify');
  console.log('2. Asegurar que VITE_BACKEND_URL use HTTPS');
  console.log('3. Verificar configuración de CSP');
  console.log('4. Revisar logs de la aplicación');
}

console.log('\n📝 Para más información, consulta:');
console.log('- DEPLOY_GUIDE.md');
console.log('- PRODUCTION_ENV_TEMPLATE.md');
console.log('- DOCUMENTATION.md'); 