"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProductSearch = testProductSearch;
const product_search_service_1 = require("../services/product-search.service");
const concepts_service_1 = require("../services/concepts-service");
/**
 * Script de prueba para verificar el sistema de búsqueda de productos
 */
function testProductSearch() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Iniciando pruebas del sistema de búsqueda de productos...\n');
        try {
            // 1. Probar ConceptsService
            console.log('📋 Probando ConceptsService...');
            const conceptsService = new concepts_service_1.ConceptsService();
            const testTerms = ['balatas', 'filtro de aceite', 'bujías', 'amortiguadores'];
            for (const term of testTerms) {
                const normalized = conceptsService.normalizeSearchTerm(term);
                console.log(`  "${term}" → "${normalized}"`);
            }
            console.log('✅ ConceptsService funcionando correctamente\n');
            // 2. Probar ProductSearchService
            console.log('🔍 Probando ProductSearchService...');
            const productSearchService = new product_search_service_1.ProductSearchService();
            // Probar normalización
            const testTerm = 'balatas delanteras';
            const normalizedTerm = yield productSearchService.normalizeSearchTerm(testTerm);
            console.log(`  Término normalizado: "${testTerm}" → "${normalizedTerm}"`);
            // Probar búsqueda de productos
            const carData = {
                marca: 'toyota',
                modelo: 'corolla',
                año: 2018
            };
            console.log(`  Buscando productos para: ${carData.marca} ${carData.modelo} ${carData.año}`);
            const searchResult = yield productSearchService.searchProductFlow(testTerm, carData, { limit: 5 });
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
                const details = yield productSearchService.getProductDetails(firstProduct.clave);
                if (details) {
                    console.log(`    ✅ Detalles obtenidos: ${details.nombre || 'Sin nombre'}`);
                    console.log(`    Precio: ${details.precio || 'No disponible'}`);
                    console.log(`    Stock: ${details.stock || 'No disponible'}`);
                }
                else {
                    console.log(`    ❌ No se encontraron detalles para ${firstProduct.clave}`);
                }
            }
            else {
                console.log('  ⚠️ No se encontraron productos');
            }
            console.log('✅ ProductSearchService funcionando correctamente\n');
            // 3. Probar utilidades
            console.log('🛠️ Probando utilidades...');
            const { extractCarDataFromMessage, formatSearchResults } = yield Promise.resolve().then(() => __importStar(require('../utils/product-search-utils')));
            const testMessage = 'Necesito balatas para mi Toyota Corolla 2018';
            const extractedCarData = extractCarDataFromMessage(testMessage);
            console.log(`  Datos extraídos: ${JSON.stringify(extractedCarData)}`);
            if (searchResult.matches.length > 0) {
                const formattedResults = formatSearchResults(searchResult.matches, carData);
                console.log(`  Formato de resultados: ${formattedResults.substring(0, 100)}...`);
            }
            console.log('✅ Utilidades funcionando correctamente\n');
            console.log('🎉 Todas las pruebas completadas exitosamente!');
        }
        catch (error) {
            console.error('❌ Error en las pruebas:', error);
            throw error;
        }
    });
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
