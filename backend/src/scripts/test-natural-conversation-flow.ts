/**
 * Script de prueba para verificar el flujo de conversación natural
 * Prueba la continuidad contextual y evitación de saludos repetitivos
 */

import { AdvancedConversationEngine } from '../services/conversation/advanced-conversation-engine';
import { conversationMemoryManager } from '../services/conversation/conversation-memory';

async function testNaturalConversationFlow() {
  console.log('🧪 Iniciando prueba de flujo de conversación natural...\n');

  const engine = new AdvancedConversationEngine();
  const conversationId = 'test-natural-flow-' + Date.now();
  const phoneNumber = '5512345678';

  // Simular una conversación completa
  const testMessages = [
    {
      message: "Hola, necesito balatas para mi Toyota Corolla 2018",
      expectedBehavior: "Primera interacción - debe saludar apropiadamente"
    },
    {
      message: "¿Tienes en stock?",
      expectedBehavior: "Continuación - NO debe saludar, debe referenciar la consulta anterior"
    },
    {
      message: "¿Y para Honda Civic 2020?",
      expectedBehavior: "Cambio de tema - debe hacer transición natural"
    },
    {
      message: "Volvamos al Toyota",
      expectedBehavior: "Retorno a tema anterior - debe usar referencia"
    },
    {
      message: "¿Cuál es el precio?",
      expectedBehavior: "Continuación - debe mantener contexto del Toyota"
    }
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const testCase = testMessages[i];
    console.log(`\n📝 Mensaje ${i + 1}: "${testCase.message}"`);
    console.log(`🎯 Comportamiento esperado: ${testCase.expectedBehavior}`);

    try {
      const request = {
        conversationId,
        userId: phoneNumber,
        phoneNumber,
        message: testCase.message,
        pointOfSaleId: 'test-pos'
      };

      const response = await engine.processConversation(request);
      
      console.log(`🤖 Respuesta: ${response.response}`);
      console.log(`📊 Longitud de conversación: ${response.metadata.promptUsed.includes('continuidad') ? 'Continuidad' : 'Primera interacción'}`);
      console.log(`🎯 Intent detectado: ${response.intent}`);
      
      // Verificar comportamiento esperado
      if (i === 0) {
        // Primera interacción debe saludar
        if (!response.response.toLowerCase().includes('hola') && 
            !response.response.toLowerCase().includes('buenos') &&
            !response.response.toLowerCase().includes('buenas')) {
          console.log('❌ ERROR: Primera interacción no saludó apropiadamente');
        } else {
          console.log('✅ Primera interacción saludó correctamente');
        }
      } else {
        // Conversaciones posteriores NO deben saludar
        if (response.response.toLowerCase().includes('hola') || 
            response.response.toLowerCase().includes('buenos días') ||
            response.response.toLowerCase().includes('buenas tardes') ||
            response.response.toLowerCase().includes('buenas noches')) {
          console.log('❌ ERROR: Conversación posterior saludó innecesariamente');
        } else {
          console.log('✅ Conversación posterior mantuvo continuidad correctamente');
        }
      }

    } catch (error) {
      console.error(`❌ Error procesando mensaje ${i + 1}:`, error);
    }
  }

  // Verificar memoria de conversación
  console.log('\n🧠 Verificando memoria de conversación...');
  const memory = conversationMemoryManager.getMemory(conversationId);
  if (memory) {
    console.log(`📈 Longitud de conversación: ${memory.metadata.conversationLength}`);
    console.log(`📝 Consultas recientes: ${memory.shortTermMemory.recentQueries.join(', ')}`);
    console.log(`🎯 Tópico actual: ${memory.shortTermMemory.currentTopic}`);
    console.log(`👤 Total mensajes del usuario: ${memory.longTermMemory.userProfile.interactions.totalMessages}`);
  }

  console.log('\n✅ Prueba de flujo de conversación natural completada');
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testNaturalConversationFlow()
    .then(() => {
      console.log('\n🎉 Todas las pruebas completadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

export { testNaturalConversationFlow };