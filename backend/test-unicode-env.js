// Test del nuevo sistema de carga de variables Unicode
const { loadEnvWithUnicodeSupport, getEnvDebugInfo } = require('./dist/config/env-loader');

console.log('🧪 Probando carga de variables Unicode...');
console.log('=====================================');

// Cargar variables con el nuevo sistema
loadEnvWithUnicodeSupport();

// Mostrar información de debug
const debugInfo = getEnvDebugInfo();
console.log('📊 Estado de variables:', debugInfo);

console.log('=====================================');
console.log('🔍 Test específico del WEBHOOK_VERIFY_TOKEN:');
console.log('WEBHOOK_VERIFY_TOKEN existe:', !!process.env.WEBHOOK_VERIFY_TOKEN);
console.log('WEBHOOK_VERIFY_TOKEN valor:', JSON.stringify(process.env.WEBHOOK_VERIFY_TOKEN));
console.log('WEBHOOK_VERIFY_TOKEN longitud:', process.env.WEBHOOK_VERIFY_TOKEN?.length);

// Test de comparación
const expectedToken = 'verify_embler_token_2025@';
const actualToken = process.env.WEBHOOK_VERIFY_TOKEN;

console.log('=====================================');
console.log('🔍 Comparación de tokens:');
console.log('Token esperado:', JSON.stringify(expectedToken));
console.log('Token actual:', JSON.stringify(actualToken));
console.log('¿Son iguales?:', expectedToken === actualToken);
console.log('¿Son iguales (trimmed)?:', expectedToken === actualToken?.trim());

if (actualToken) {
  console.log('Primeros 10 chars:', JSON.stringify(actualToken.substring(0, 10)));
  console.log('Últimos 10 chars:', JSON.stringify(actualToken.substring(actualToken.length - 10)));
} 