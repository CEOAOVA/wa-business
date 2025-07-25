#!/usr/bin/env node

/**
 * Script de emergencia para limpiar rate limiting
 * Úsalo solo si necesitas resetear el rate limiting en producción
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 SCRIPT DE EMERGENCIA - LIMPIAR RATE LIMITING');
console.log('⚠️  Este script solo debe usarse en emergencias\n');

// Verificar si estamos en producción
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 Detectado entorno de PRODUCCIÓN');
  console.log('⚠️  ¿Estás seguro de que quieres limpiar el rate limiting?');
  console.log('   Esto puede exponer temporalmente el sistema a ataques.\n');
  
  // En producción, solo mostrar instrucciones
  console.log('📋 Para limpiar rate limiting en producción:');
  console.log('1. Ve al dashboard de Coolify');
  console.log('2. Encuentra tu aplicación backend');
  console.log('3. Ve a "Environment Variables"');
  console.log('4. Agrega temporalmente: CLEAR_RATE_LIMIT=true');
  console.log('5. Redeploya la aplicación');
  console.log('6. Después de 5 minutos, remueve la variable');
  console.log('\n💡 Alternativa: Espera 15 minutos para que se resetee automáticamente');
  
} else {
  console.log('🔍 Detectado entorno de DESARROLLO');
  console.log('✅ Rate limiting se resetea automáticamente en desarrollo');
  console.log('💡 Si necesitas resetear manualmente:');
  console.log('   - Reinicia el servidor backend');
  console.log('   - O espera 15 minutos para el reset automático');
}

console.log('\n📊 Estado actual del rate limiting:');
console.log('- Auth rate limit: 20 intentos por 15 minutos (producción)');
console.log('- General rate limit: 300 requests por minuto (producción)');
console.log('- Webhook rate limit: 200 requests por minuto');

console.log('\n🔧 Configuración recomendada para producción:');
console.log('RATE_LIMIT_WINDOW_MS=60000');
console.log('RATE_LIMIT_MAX_REQUESTS=300');
console.log('RATE_LIMIT_AUTH_MAX=20');
console.log('RATE_LIMIT_WEBHOOK_MAX=200');

console.log('\n✅ Script completado'); 