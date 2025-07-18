/**
 * Script para diagnosticar la configuración de WhatsApp
 * Ejecutar con: node src/scripts/debug-whatsapp-config.js
 */

const { loadEnvWithUnicodeSupport } = require('../config/env-loader');

// Cargar variables de entorno
loadEnvWithUnicodeSupport();

console.log('🔍 Diagnóstico de Configuración de WhatsApp\n');

// Verificar variables de entorno
const config = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
  baseUrl: process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com'
};

console.log('📋 Variables de Entorno:');
console.log('├─ WHATSAPP_ACCESS_TOKEN:', config.accessToken ? `${config.accessToken.substring(0, 20)}...` : '❌ NO CONFIGURADO');
console.log('├─ WHATSAPP_PHONE_NUMBER_ID:', config.phoneNumberId || '❌ NO CONFIGURADO');
console.log('├─ WEBHOOK_VERIFY_TOKEN:', config.verifyToken ? `${config.verifyToken.substring(0, 10)}...` : '❌ NO CONFIGURADO');
console.log('├─ WHATSAPP_API_VERSION:', config.apiVersion);
console.log('└─ WHATSAPP_BASE_URL:', config.baseUrl);

// Validar configuración
const isConfigured = !!(config.accessToken && config.phoneNumberId && config.verifyToken);
console.log('\n✅ Estado de Configuración:', isConfigured ? 'CONFIGURADO' : '❌ NO CONFIGURADO');

if (!isConfigured) {
  console.log('\n⚠️ Para configurar WhatsApp, agrega estas variables a tu archivo .env:');
  console.log('WHATSAPP_ACCESS_TOKEN=tu_token_aqui');
  console.log('WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui');
  console.log('WEBHOOK_VERIFY_TOKEN=tu_verify_token_aqui');
  process.exit(1);
}

// Validar formato del token
if (config.accessToken) {
  console.log('\n🔐 Análisis del Token de Acceso:');
  console.log('├─ Longitud:', config.accessToken.length);
  console.log('├─ Formato válido:', config.accessToken.startsWith('EAA') ? '✅ SÍ' : '❌ NO');
  console.log('└─ Contiene caracteres especiales:', /[^A-Za-z0-9]/.test(config.accessToken) ? '✅ SÍ' : '❌ NO');
  
  if (!config.accessToken.startsWith('EAA')) {
    console.log('\n⚠️ El token no tiene el formato esperado. Los tokens de WhatsApp Business API suelen comenzar con "EAA"');
  }
}

// Validar formato del Phone Number ID
if (config.phoneNumberId) {
  console.log('\n📞 Análisis del Phone Number ID:');
  console.log('├─ Longitud:', config.phoneNumberId.length);
  console.log('├─ Es numérico:', /^\d+$/.test(config.phoneNumberId) ? '✅ SÍ' : '❌ NO');
  console.log('└─ Formato válido:', config.phoneNumberId.length > 10 ? '✅ SÍ' : '❌ NO');
}

// Construir URL de ejemplo
const exampleUrl = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
console.log('\n🔗 URL de Ejemplo:');
console.log(exampleUrl);

// Headers de ejemplo
const headers = {
  'Authorization': `Bearer ${config.accessToken}`,
  'Content-Type': 'application/json'
};

console.log('\n📋 Headers de Ejemplo:');
console.log('Authorization:', `Bearer ${config.accessToken.substring(0, 20)}...`);
console.log('Content-Type:', headers['Content-Type']);

console.log('\n✅ Diagnóstico completado'); 