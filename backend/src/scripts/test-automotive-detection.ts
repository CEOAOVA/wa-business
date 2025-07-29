/**
 * Script de prueba para verificar la detección de mensajes automotrices
 * y el uso del servicio especializado
 */

import { ChatbotService } from '../services/chatbot.service';

async function testAutomotiveDetection() {
  console.log('🚗 Probando detección de mensajes automotrices...\n');

  const chatbotService = new ChatbotService();

  // Casos de prueba
  const testCases = [
    {
      message: "mi nombre es karol, vivo en el codigo postal 54170, necesito FUNDA PALANCA VELOCIDADES TRANSMISION ESTANDAR SPRINTER W906 VW CRAFTER 2006 MARCA FREY, no tengo mas información para darte",
      expectedType: "automotive",
      description: "Mensaje completo con pieza específica y datos del auto"
    },
    {
      message: "Necesito pastillas de freno para mi Honda Civic 2020",
      expectedType: "automotive",
      description: "Mensaje con pieza y datos del auto"
    },
    {
      message: "Hola, ¿cómo estás?",
      expectedType: "general",
      description: "Mensaje general de saludo"
    },
    {
      message: "Busco filtro de aceite para Toyota Corolla",
      expectedType: "automotive",
      description: "Mensaje con pieza y marca de auto"
    },
    {
      message: "¿Cuál es el horario de atención?",
      expectedType: "general",
      description: "Mensaje de consulta general"
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Probando: "${testCase.description}"`);
    console.log(`   Mensaje: "${testCase.message.substring(0, 80)}..."`);
    
    try {
      // Simular el procesamiento del mensaje
      const response = await chatbotService.processWhatsAppMessage('5512345678', testCase.message);
      
      console.log(`   ✅ Respuesta generada: ${response.response.substring(0, 100)}...`);
      console.log(`   📊 Tipo detectado: ${testCase.expectedType}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Pruebas completadas');
}

// Ejecutar pruebas
testAutomotiveDetection().catch(console.error); 