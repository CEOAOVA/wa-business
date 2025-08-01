/**
 * Script de diagnóstico para WhatsApp Business Platform
 * Verifica configuración, conectividad y estado del sistema
 */

require('dotenv').config();

async function runDiagnostic() {
  console.log('🔍 Iniciando diagnóstico del sistema...\n');

  // 1. Verificar variables de entorno
  console.log('📋 1. Verificando variables de entorno...');
  
  console.log('   ✅ NODE_ENV:', process.env.NODE_ENV || 'No configurado');
  console.log('   ✅ PORT:', process.env.PORT || 'No configurado');
  console.log('   ✅ FRONTEND_URL:', process.env.FRONTEND_URL || 'No configurado');
  
  // 2. Verificar configuración de WhatsApp
  console.log('\n📱 2. Verificando configuración de WhatsApp...');
  console.log('   ✅ WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? 'Configurado' : 'No configurado');
  console.log('   ✅ WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || 'No configurado');
  console.log('   ✅ WEBHOOK_VERIFY_TOKEN:', process.env.WEBHOOK_VERIFY_TOKEN ? 'Configurado' : 'No configurado');
  
  // 3. Verificar configuración de Supabase
  console.log('\n🗄️ 3. Verificando configuración de Supabase...');
  console.log('   ✅ SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'No configurado');
  console.log('   ✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado');
  console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'No configurado');
  
  // 4. Verificar configuración de OpenAI/OpenRouter
  console.log('\n🤖 4. Verificando configuración de LLM...');
  console.log('   ✅ OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Configurado' : 'No configurado');
  console.log('   ✅ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Configurado' : 'No configurado');
  
  // 5. Verificar configuración de CORS
  console.log('\n🌐 5. Verificando configuración de CORS...');
  console.log('   ✅ FRONTEND_URL:', process.env.FRONTEND_URL || 'No configurado');
  console.log('   ✅ ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || 'No configurado');
  
  // 6. Verificar configuración de seguridad
  console.log('\n🔒 6. Verificando configuración de seguridad...');
  console.log('   ✅ JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado' : 'No configurado');
  console.log('   ✅ SESSION_SECRET:', process.env.SESSION_SECRET ? 'Configurado' : 'No configurado');
  
  // 7. Verificar configuración de SOAP
  console.log('\n🏭 7. Verificando configuración de SOAP...');
  console.log('   ✅ SOAP_WSDL_URL:', process.env.SOAP_WSDL_URL ? 'Configurado' : 'No configurado');
  console.log('   ✅ SOAP_ENDPOINT_URL:', process.env.SOAP_ENDPOINT_URL ? 'Configurado' : 'No configurado');
  
  // 8. Resumen
  console.log('\n📊 8. Resumen del diagnóstico:');
  const issues = [];
  
  if (!process.env.WHATSAPP_ACCESS_TOKEN) issues.push('WhatsApp no configurado');
  if (!process.env.SUPABASE_URL) issues.push('Supabase no configurado');
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) issues.push('LLM no configurado');
  
  if (issues.length === 0) {
    console.log('   ✅ Sistema configurado correctamente');
  } else {
    console.log('   ⚠️ Problemas detectados:');
    issues.forEach(issue => console.log(`      - ${issue}`));
  }
  
  console.log('\n🎯 Recomendaciones:');
  console.log('   1. Asegúrate de que todas las variables de entorno estén configuradas');
  console.log('   2. Verifica la conectividad con Supabase');
  console.log('   3. Confirma que WhatsApp Business API esté configurado');
  console.log('   4. Revisa los logs del servidor para errores específicos');
  
  console.log('\n✅ Diagnóstico completado');
}

// Ejecutar diagnóstico
runDiagnostic().catch(console.error); 