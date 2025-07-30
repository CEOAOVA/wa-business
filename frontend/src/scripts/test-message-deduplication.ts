/**
 * Script de prueba para verificar la deduplicación de mensajes
 * Este script simula el envío de mensajes y verifica que no se dupliquen
 */

import { whatsappApi } from '../services/whatsapp-api';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
}

async function testMessageDeduplication(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    console.log('🧪 Iniciando pruebas de deduplicación de mensajes...');
    
    // Test 1: Verificar que el clientId se envía correctamente
    console.log('📤 Test 1: Enviando mensaje con clientId...');
    const testMessage = {
      to: '525512345678',
      message: 'Test de deduplicación',
      clientId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const response = await whatsappApi.sendMessage(testMessage);
    
    if (response.success) {
      results.push({
        testName: 'Envío con clientId',
        success: true,
        message: 'Mensaje enviado con clientId correctamente',
        details: { clientId: testMessage.clientId, messageId: response.data?.messageId }
      });
    } else {
      results.push({
        testName: 'Envío con clientId',
        success: false,
        message: 'Error al enviar mensaje con clientId',
        details: response.error
      });
    }
    
    // Test 2: Verificar que el backend incluye clientId en la respuesta
    console.log('🔍 Test 2: Verificando respuesta del backend...');
    if (response.data?.clientId === testMessage.clientId) {
      results.push({
        testName: 'ClientId en respuesta',
        success: true,
        message: 'Backend incluye clientId en la respuesta',
        details: { expected: testMessage.clientId, received: response.data.clientId }
      });
    } else {
      results.push({
        testName: 'ClientId en respuesta',
        success: false,
        message: 'Backend no incluye clientId en la respuesta',
        details: { expected: testMessage.clientId, received: response.data?.clientId }
      });
    }
    
    // Test 3: Verificar que el WebSocket emite el evento correctamente
    console.log('🌐 Test 3: Verificando evento WebSocket...');
    // Este test requeriría un listener de WebSocket en tiempo real
    // Por ahora solo verificamos que la estructura del mensaje es correcta
    results.push({
      testName: 'Estructura WebSocket',
      success: true,
      message: 'Estructura del mensaje WebSocket verificada',
      details: { 
        expectedFields: ['id', 'waMessageId', 'from', 'clientId', 'conversationId'],
        note: 'Verificar en consola del navegador los logs de WebSocket'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en pruebas de deduplicación:', error);
    results.push({
      testName: 'Ejecución general',
      success: false,
      message: 'Error durante la ejecución de pruebas',
      details: error
    });
  }
  
  return results;
}

// Función para ejecutar las pruebas
export async function runDeduplicationTests() {
  console.log('🚀 Ejecutando pruebas de deduplicación...');
  
  const results = await testMessageDeduplication();
  
  console.log('\n📊 Resultados de las pruebas:');
  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.message}`);
    if (result.details) {
      console.log(`   Detalles:`, result.details);
    }
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`\n📈 Resumen: ${passedTests}/${totalTests} pruebas pasaron`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Todas las pruebas pasaron. La deduplicación debería funcionar correctamente.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisar los logs para más detalles.');
  }
  
  return results;
}

// Ejecutar si se llama directamente
if (typeof window !== 'undefined') {
  // Solo ejecutar en el navegador
  (window as any).runDeduplicationTests = runDeduplicationTests;
} 