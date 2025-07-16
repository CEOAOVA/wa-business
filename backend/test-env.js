const { loadEnvWithUnicodeSupport } = require('./dist/config/env-loader');

// Cargar variables de entorno con soporte Unicode
loadEnvWithUnicodeSupport();

console.log('🔍 Verificando variables de entorno:');
console.log('=====================================');
console.log('WEBHOOK_VERIFY_TOKEN:', JSON.stringify(process.env.WEBHOOK_VERIFY_TOKEN));
console.log('WEBHOOK_VERIFY_TOKEN length:', process.env.WEBHOOK_VERIFY_TOKEN?.length);
console.log('WEBHOOK_VERIFY_TOKEN type:', typeof process.env.WEBHOOK_VERIFY_TOKEN);

if (process.env.WEBHOOK_VERIFY_TOKEN) {
  console.log('Character codes:', process.env.WEBHOOK_VERIFY_TOKEN.split('').map(c => c.charCodeAt(0)));
}

// Test de comparación
const testToken = 'verify_embler_token_2025@';
const envToken = process.env.WEBHOOK_VERIFY_TOKEN;

console.log('=====================================');
console.log('Test comparison:');
console.log('Expected token:', JSON.stringify(testToken));
console.log('Env token:', JSON.stringify(envToken));
console.log('Are equal?:', testToken === envToken);
console.log('Are equal (trimmed)?:', testToken === envToken?.trim());

// También verificar si hay caracteres especiales o espacios
if (envToken) {
  console.log('Starts with quote?:', envToken.startsWith("'") || envToken.startsWith('"'));
  console.log('Ends with quote?:', envToken.endsWith("'") || envToken.endsWith('"'));
} 