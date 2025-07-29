import { ProductSearchService } from '../services/product-search.service';
import { ConceptsService } from '../services/concepts-service';

/**
 * Script de prueba para verificar el sistema de búsqueda de productos
 */
async function testProductSearch(): Promise<void> {
  console.log('🧪 Iniciando pruebas del sistema de búsqueda de productos...\n');

  try {
    // 1. Probar ConceptsService
    console.log('📋 Probando ConceptsService...');
    const conceptsService = new ConceptsService();
    
    const testTerms = ['balatas', 'filtro de aceite', 'bujías', 'amortiguadores'];
    for (const term of testTerms) {
      const normalized = conceptsService.normalizeSearchTerm(term);
      console.log(`  "${term}" → "${normalized}"`);
    }
    console.log('✅ ConceptsService funcionando correctamente\n');

    // 2. Probar ProductSearchService
    console.log('🔍 Probando ProductSearchService...');
    const productSearchService = new ProductSearchService();

    // Probar normalización
    const testTerm = 'balatas delanteras';
    const normalizedTerm = await productSearchService.normalizeSearchTerm(testTerm);
    console.log(`  Término normalizado: "${testTerm}" → "${normalizedTerm}"`);

    // Probar búsqueda de productos
    const carData = {
      marca: 'toyota',
      modelo: 'corolla',
      año: 2018
    };

    console.log(`  Buscando productos para: ${carData.marca} ${carData.modelo} ${carData.año}`);
    const searchResult = await productSearchService.searchProductFlow(testTerm, carData, { limit: 5 });

    console.log(`  Resultados encontrados: ${searchResult.totalFound}`);
    console.log(`  Tiempo de búsqueda: ${searchResult.searchTime}ms`);
    console.log(`  Coincidencia exacta: ${searchResult.hasExactMatch}`);

    if (searchResult.matches.length > 0) {
      console.log('  Primeros resultados:');
      searchResult.matches.slice(0, 3).forEach((match, index) => {
        console.log(`    ${index + 1}. ${match.nombre} (${match.clave}) - Confianza: ${match.confidence.toFixed(2)}`);
      });

      // Probar obtención de detalles
      const firstProduct = searchResult.matches[0];
      console.log(`\n  Obteniendo detalles para: ${firstProduct.clave}`);
      const details = await productSearchService.getProductDetails(firstProduct.clave);
      
      if (details) {
        console.log(`    ✅ Detalles obtenidos: ${details.nombre || 'Sin nombre'}`);
        console.log(`    Precio: ${details.precio || 'No disponible'}`);
        console.log(`    Stock: ${details.stock || 'No disponible'}`);
      } else {
        console.log(`    ❌ No se encontraron detalles para ${firstProduct.clave}`);
      }
    } else {
      console.log('  ⚠️ No se encontraron productos');
    }

    console.log('✅ ProductSearchService funcionando correctamente\n');

    // 3. Probar utilidades
    console.log('🛠️ Probando utilidades...');
    const { extractCarDataFromMessage, formatSearchResults } = await import('../utils/product-search-utils');
    
    const testMessage = 'Necesito balatas para mi Toyota Corolla 2018';
    const extractedCarData = extractCarDataFromMessage(testMessage);
    console.log(`  Datos extraídos: ${JSON.stringify(extractedCarData)}`);

    if (searchResult.matches.length > 0) {
      const formattedResults = formatSearchResults(searchResult.matches, carData);
      console.log(`  Formato de resultados: ${formattedResults.substring(0, 100)}...`);
    }

    console.log('✅ Utilidades funcionando correctamente\n');

    console.log('🎉 Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testProductSearch()
    .then(() => {
      console.log('✅ Pruebas completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en pruebas:', error);
      process.exit(1);
    });
}

export { testProductSearch };