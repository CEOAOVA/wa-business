/**
 * Script de prueba para verificar la búsqueda simplificada de piezas automotrices
 * Sin sobre-ingeniería específica para casos particulares
 */

import { AutomotivePartsSearchService } from '../services/automotive-parts-search.service';
import { AutomotivePartsConversationService } from '../services/conversation/automotive-parts-conversation.service';

async function testSimplifiedPartsSearch() {
  console.log('🚗 Probando búsqueda simplificada de piezas automotrices...\n');

  const searchService = new AutomotivePartsSearchService();
  const conversationService = new AutomotivePartsConversationService();

  // Casos de prueba genéricos
  const testCases = [
    {
      message: "Necesito pastillas de freno para mi Honda Civic 2020",
      expectedPart: "pastillas de freno",
      expectedCar: { marca: "honda", modelo: "civic" }
    },
    {
      message: "Busco filtro de aceite para Toyota Corolla",
      expectedPart: "filtro de aceite",
      expectedCar: { marca: "toyota", modelo: "corolla" }
    },
    {
      message: "Quiero funda de palanca de velocidades para VW Jetta",
      expectedPart: "funda de palanca de velocidades",
      expectedCar: { marca: "vw", modelo: "jetta" }
    },
    {
      message: "Necesito batería para Nissan Sentra",
      expectedPart: "bateria",
      expectedCar: { marca: "nissan", modelo: "sentra" }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Probando: "${testCase.message}"`);
    
    try {
      // Extraer información
      const extracted = conversationService['extractCarAndPartInfo'](testCase.message);
      const partName = conversationService['extractPartNameFromMessage'](testCase.message);
      
      console.log(`   🚗 Auto extraído: ${extracted.carInfo?.marca} ${extracted.carInfo?.modelo}`);
      console.log(`   🔧 Pieza extraída: ${partName}`);
      
      // Verificar extracción
      if (extracted.carInfo?.marca && extracted.carInfo?.modelo && partName) {
        console.log(`   ✅ Información extraída correctamente`);
        
        // Realizar búsqueda
        const searchResult = await searchService.searchAutomotiveParts(
          partName,
          extracted.carInfo,
          { limit: 3, minConfidence: 0.3 }
        );
        
        console.log(`   🔍 Resultados: ${searchResult.results.length} encontrados`);
        if (searchResult.results.length > 0) {
          searchResult.results.forEach((result, index) => {
            console.log(`      ${index + 1}. Clave: ${result.clave} | Marca: ${result.marca}`);
          });
        }
      } else {
        console.log(`   ❌ Información incompleta`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Pruebas completadas');
}

// Ejecutar pruebas
testSimplifiedPartsSearch().catch(console.error); 