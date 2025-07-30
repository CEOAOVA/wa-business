/**
 * Script de prueba para verificar el funcionamiento del takeover mode
 * Este script simula el flujo completo de carga y cambio de modo takeover
 */

import { whatsappApi } from '../services/whatsapp-api';

// Función para simular la carga de takeover mode
async function testTakeoverModeLoading() {
  console.log('🧪 [Test] Iniciando prueba de takeover mode...');
  
  // Simular conversationId
  const testConversationId = 'test-conversation-123';
  
  try {
    console.log(`🔍 [Test] Consultando modo takeover para: ${testConversationId}`);
    
    const response = await whatsappApi.getTakeoverMode(testConversationId);
    
    console.log('📋 [Test] Respuesta del servidor:', response);
    
    if (response.success) {
      console.log(`✅ [Test] Modo takeover obtenido: ${response.data?.takeoverMode}`);
    } else {
      console.log(`❌ [Test] Error obteniendo takeover mode:`, response.error);
    }
    
  } catch (error) {
    console.error('❌ [Test] Error en la prueba:', error);
  }
}

// Función para simular cambio de takeover mode
async function testTakeoverModeChange() {
  console.log('🧪 [Test] Iniciando prueba de cambio de takeover mode...');
  
  const testData = {
    conversationId: 'test-conversation-123',
    mode: 'takeover' as const,
    agentId: 'test-agent-456',
    reason: 'Prueba manual'
  };
  
  try {
    console.log(`🔄 [Test] Cambiando modo takeover:`, testData);
    
    const response = await whatsappApi.setTakeoverMode(testData);
    
    console.log('📋 [Test] Respuesta del servidor:', response);
    
    if (response.success) {
      console.log(`✅ [Test] Modo takeover cambiado exitosamente a: ${response.data?.takeoverMode}`);
    } else {
      console.log(`❌ [Test] Error cambiando takeover mode:`, response.error);
    }
    
  } catch (error) {
    console.error('❌ [Test] Error en la prueba:', error);
  }
}

// Función para simular el flujo completo
async function testCompleteTakeoverFlow() {
  console.log('🚀 [Test] Iniciando flujo completo de takeover mode...');
  
  // 1. Cargar modo inicial
  await testTakeoverModeLoading();
  
  // 2. Cambiar a takeover
  await testTakeoverModeChange();
  
  // 3. Verificar cambio
  await testTakeoverModeLoading();
  
  console.log('✅ [Test] Flujo completo completado');
}

// Ejecutar pruebas si se ejecuta directamente
if (typeof window !== 'undefined') {
  // En el navegador, agregar al objeto global para acceso desde consola
  (window as any).testTakeoverMode = {
    loading: testTakeoverModeLoading,
    change: testTakeoverModeChange,
    complete: testCompleteTakeoverFlow
  };
  
  console.log('🧪 [Test] Script de prueba cargado. Usar:');
  console.log('  - window.testTakeoverMode.loading()');
  console.log('  - window.testTakeoverMode.change()');
  console.log('  - window.testTakeoverMode.complete()');
}

export {
  testTakeoverModeLoading,
  testTakeoverModeChange,
  testCompleteTakeoverFlow
}; 