"use strict";
/**
 * Script de prueba para verificar la búsqueda simplificada de piezas automotrices
 * Sin sobre-ingeniería específica para casos particulares
 */
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
const automotive_parts_search_service_1 = require("../services/automotive-parts-search.service");
const automotive_parts_conversation_service_1 = require("../services/conversation/automotive-parts-conversation.service");
function testSimplifiedPartsSearch() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        console.log('🚗 Probando búsqueda simplificada de piezas automotrices...\n');
        const searchService = new automotive_parts_search_service_1.AutomotivePartsSearchService();
        const conversationService = new automotive_parts_conversation_service_1.AutomotivePartsConversationService();
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
                console.log(`   🚗 Auto extraído: ${(_a = extracted.carInfo) === null || _a === void 0 ? void 0 : _a.marca} ${(_b = extracted.carInfo) === null || _b === void 0 ? void 0 : _b.modelo}`);
                console.log(`   🔧 Pieza extraída: ${partName}`);
                // Verificar extracción
                if (((_c = extracted.carInfo) === null || _c === void 0 ? void 0 : _c.marca) && ((_d = extracted.carInfo) === null || _d === void 0 ? void 0 : _d.modelo) && partName) {
                    console.log(`   ✅ Información extraída correctamente`);
                    // Realizar búsqueda
                    const searchResult = yield searchService.searchAutomotiveParts(partName, extracted.carInfo, { limit: 3, minConfidence: 0.3 });
                    console.log(`   🔍 Resultados: ${searchResult.results.length} encontrados`);
                    if (searchResult.results.length > 0) {
                        searchResult.results.forEach((result, index) => {
                            console.log(`      ${index + 1}. Clave: ${result.clave} | Marca: ${result.marca}`);
                        });
                    }
                }
                else {
                    console.log(`   ❌ Información incompleta`);
                }
            }
            catch (error) {
                console.error(`   ❌ Error: ${error}`);
            }
            console.log('');
        }
        console.log('✅ Pruebas completadas');
    });
}
// Ejecutar pruebas
testSimplifiedPartsSearch().catch(console.error);
