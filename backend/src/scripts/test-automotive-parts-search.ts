import { AutomotivePartsSearchService } from '../services/automotive-parts-search.service';
import { AutomotivePartsConversationService } from '../services/conversation/automotive-parts-conversation.service';

async function testAutomotivePartsSearch() {
  console.log('🧪 Iniciando pruebas de búsqueda de piezas automotrices...\n');

  const partsSearchService = new AutomotivePartsSearchService();
  const conversationService = new AutomotivePartsConversationService();

  // Casos de prueba
  const testCases = [
    {
      name: 'Búsqueda directa - Balatas Toyota Corolla',
      message: 'Necesito balatas para mi Toyota Corolla 2018',
      expected: {
        marca: 'toyota',
        modelo: 'corolla',
        pieza: 'balatas'
      }
    },
    {
      name: 'Búsqueda con términos coloquiales',
      message: 'Busco pastillas de freno para Honda Civic',
      expected: {
        marca: 'honda',
        modelo: 'civic',
        pieza: 'pastillas de freno'
      }
    },
    {
      name: 'Búsqueda sin año específico',
      message: 'Quiero filtros para Nissan Sentra',
      expected: {
        marca: 'nissan',
        modelo: 'sentra',
        pieza: 'filtros'
      }
    },
    {
      name: 'Búsqueda con año específico',
      message: 'Necesito batería para Ford Focus 2020',
      expected: {
        marca: 'ford',
        modelo: 'focus',
        pieza: 'batería'
      }
    }
  ];

  console.log('📋 Ejecutando casos de prueba...\n');

  for (const testCase of testCases) {
    console.log(`\n🔍 Probando: ${testCase.name}`);
    console.log(`Mensaje: "${testCase.message}"`);

    try {
      // Probar extracción de información
      const { carInfo, partName } = (conversationService as any).extractCarAndPartInfo(testCase.message);
      
      if (carInfo && partName) {
        console.log(`✅ Extracción exitosa:`);
        console.log(`   Marca: ${carInfo.marca}`);
        console.log(`   Modelo: ${carInfo.modelo}`);
        console.log(`   Año: ${carInfo.año || 'No especificado'}`);
        console.log(`   Pieza: ${partName}`);

        // Realizar búsqueda
        const searchResult = await partsSearchService.searchAutomotiveParts(partName, carInfo);
        
        if (searchResult.success && searchResult.results.length > 0) {
          console.log(`✅ Búsqueda exitosa: ${searchResult.results.length} resultados`);
          searchResult.results.forEach((result, index) => {
            console.log(`   ${index + 1}. Clave: ${result.clave} | Marca: ${result.marca} | Compatible: ${result.carCompatibility}`);
          });
        } else {
          console.log(`❌ Sin resultados para: ${partName} - ${carInfo.marca} ${carInfo.modelo}`);
          console.log(`   Término normalizado: ${searchResult.normalizedTerm}`);
        }
      } else {
        console.log(`❌ No se pudo extraer información completa del mensaje`);
        console.log(`   CarInfo:`, carInfo);
        console.log(`   PartName:`, partName);
      }

    } catch (error) {
      console.error(`❌ Error en prueba:`, error);
    }
  }

  // Probar búsqueda directa con datos conocidos
  console.log('\n🔧 Probando búsqueda directa...\n');
  
  const directTestCases = [
    {
      name: 'Balatas Toyota Corolla',
      partName: 'balatas',
      carInfo: { marca: 'toyota', modelo: 'corolla', año: 2018 }
    },
    {
      name: 'Filtros Honda Civic',
      partName: 'filtros',
      carInfo: { marca: 'honda', modelo: 'civic', año: 2019 }
    },
    {
      name: 'Batería Nissan Sentra',
      partName: 'batería',
      carInfo: { marca: 'nissan', modelo: 'sentra', año: 2020 }
    }
  ];

  for (const testCase of directTestCases) {
    console.log(`\n🔍 Búsqueda directa: ${testCase.name}`);
    
    try {
      const searchResult = await partsSearchService.searchAutomotiveParts(
        testCase.partName, 
        testCase.carInfo,
        { limit: 3, minConfidence: 0.3 }
      );

      if (searchResult.success && searchResult.results.length > 0) {
        console.log(`✅ Encontrados ${searchResult.results.length} resultados:`);
        searchResult.results.forEach((result, index) => {
          console.log(`   ${index + 1}. Clave: ${result.clave} | Marca: ${result.marca}`);
          console.log(`      Descripción: ${result.nombre}`);
          console.log(`      Confianza: ${(result.confidence * 100).toFixed(1)}% | Compatible: ${result.carCompatibility}`);
        });
      } else {
        console.log(`❌ Sin resultados para ${testCase.partName} - ${testCase.carInfo.marca} ${testCase.carInfo.modelo}`);
      }
    } catch (error) {
      console.error(`❌ Error en búsqueda directa:`, error);
    }
  }

  console.log('\n🎉 Pruebas completadas');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAutomotivePartsSearch()
    .then(() => {
      console.log('\n✅ Todas las pruebas ejecutadas exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando pruebas:', error);
      process.exit(1);
    });
}

export { testAutomotivePartsSearch };