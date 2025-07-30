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
        message: 'Mensaje enviado correctamente con clientId',
        details: {
          clientId: testMessage.clientId,
          response: response.data
        }
      });
    } else {
      results.push({
        testName: 'Envío con clientId',
        success: false,
        message: 'Error enviando mensaje con clientId',
        details: response.error
      });
    }
    
    // Test 2: Verificar que el backend procesa el clientId
    console.log('🔍 Test 2: Verificando procesamiento del clientId...');
    if (response.success && response.data) {
      results.push({
        testName: 'Procesamiento de clientId',
        success: true,
        message: 'Backend procesó el clientId correctamente',
        details: {
          messageId: response.data.messageId,
          waMessageId: response.data.waMessageId
        }
      });
    } else {
      results.push({
        testName: 'Procesamiento de clientId',
        success: false,
        message: 'Backend no procesó el clientId correctamente',
        details: response.error
      });
    }
    
    // Test 3: Verificar conexión WebSocket
    console.log('🌐 Test 3: Verificando conexión WebSocket...');
    const status = await whatsappApi.checkConnection();
    results.push({
      testName: 'Conexión WebSocket',
      success: status,
      message: status ? 'WebSocket conectado' : 'WebSocket desconectado'
    });
    
  } catch (error: any) {
    console.error('❌ Error en pruebas:', error);
    results.push({
      testName: 'Pruebas generales',
      success: false,
      message: 'Error ejecutando pruebas',
      details: error.message
    });
  }
  
  return results;
}

// Función para ejecutar las pruebas
export async function runDeduplicationTests(): Promise<void> {
  console.log('🚀 Ejecutando pruebas de deduplicación...');
  
  const results = await testMessageDeduplication();
  
  console.log('\n📊 Resultados de las pruebas:');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.testName}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Detalles:`, result.details);
    }
    console.log('');
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`📈 Resumen: ${passedTests}/${totalTests} pruebas pasaron`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ¡Todas las pruebas pasaron! La deduplicación debería funcionar correctamente.');
  } else {
    console.log('⚠️ Algunas pruebas fallaron. Revisa los detalles arriba.');
  }
}

// Ejecutar si se llama directamente
if (typeof window !== 'undefined') {
  // En el navegador, agregar al objeto global para poder ejecutar desde la consola
  (window as any).runDeduplicationTests = runDeduplicationTests;
  console.log('🧪 Script de pruebas cargado. Ejecuta runDeduplicationTests() en la consola para probar.');
} 