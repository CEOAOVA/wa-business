"use strict";
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
exports.AutomotivePartsConversationService = void 0;
const advanced_conversation_engine_1 = require("./advanced-conversation-engine");
const automotive_parts_search_service_1 = require("../automotive-parts-search.service");
const conversation_memory_1 = require("./conversation-memory");
class AutomotivePartsConversationService {
    constructor() {
        this.conversationEngine = new advanced_conversation_engine_1.AdvancedConversationEngine();
        this.partsSearchService = new automotive_parts_search_service_1.AutomotivePartsSearchService();
    }
    /**
     * Procesa conversación específica para búsqueda de piezas automotrices
     */
    processAutomotivePartsConversation(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                console.log(`[AutomotivePartsConversation] Procesando búsqueda de piezas: "${request.message}"`);
                // 1. Extraer información del auto y pieza del mensaje
                const { carInfo, partName } = this.extractCarAndPartInfo(request.message);
                // 2. Verificar si tenemos información completa
                if (this.hasCompleteInformation(carInfo, partName)) {
                    // 3. Realizar búsqueda directa
                    const searchResults = yield this.performDirectSearch(partName, carInfo);
                    // 4. Generar respuesta con resultados
                    const response = yield this.generateResultsResponse(searchResults, carInfo);
                    return Object.assign(Object.assign({}, response), { searchResults,
                        carInfo,
                        partName, metadata: Object.assign(Object.assign({}, response.metadata), { responseTime: Date.now() - startTime }) });
                }
                else {
                    // 5. Procesar con motor de conversación para obtener información faltante
                    const conversationResponse = yield this.conversationEngine.processConversation(request);
                    // 6. Verificar si ahora tenemos información completa
                    const updatedCarInfo = carInfo || this.extractCarInfoFromMemory(request.conversationId);
                    const updatedPartName = partName || this.extractPartNameFromMemory(request.conversationId);
                    if (this.hasCompleteInformation(updatedCarInfo, updatedPartName)) {
                        const searchResults = yield this.performDirectSearch(updatedPartName, updatedCarInfo);
                        return Object.assign(Object.assign({}, conversationResponse), { searchResults, carInfo: updatedCarInfo, partName: updatedPartName });
                    }
                    return Object.assign(Object.assign({}, conversationResponse), { carInfo: updatedCarInfo, partName: updatedPartName });
                }
            }
            catch (error) {
                console.error('[AutomotivePartsConversation] Error procesando conversación:', error);
                return this.generateErrorResponse(request, error);
            }
        });
    }
    /**
     * Extraer información del auto y pieza del mensaje
     */
    extractCarAndPartInfo(message) {
        const carInfo = {
            marca: '',
            modelo: ''
        };
        let partName;
        // Patrones para extraer información de marca
        const marcaPatterns = [
            /(?:para|de|mi)\s+(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai|bmw|mercedes|audi|kia|subaru|mitsubishi|suzuki|isuzu|jeep|dodge|vw|volkswagen)/i,
            /(toyota|honda|nissan|ford|chevrolet|volkswagen|mazda|hyundai|bmw|mercedes|audi|kia|subaru|mitsubishi|suzuki|isuzu|jeep|dodge|vw|volkswagen)\s+(corolla|civic|sentra|focus|cruze|golf|3|accent|camry|accord|altima|fusion|malibu|jetta|cx-5|elantra|sprinter|crafter)/i,
            // Patrones específicos para VW
            /(vw|volkswagen)\s+(crafter|sprinter)/i,
            /(crafter|sprinter)\s+(w906|w906)/i
        ];
        // Patrones para extraer información de modelo
        const modeloPatterns = [
            /(corolla|civic|sentra|focus|cruze|golf|accent|camry|accord|altima|fusion|malibu|jetta|cx-5|elantra|sprinter|crafter|w906)/i,
            // Patrones específicos para modelos VW
            /(sprinter\s+w906)/i,
            /(crafter\s+w906)/i,
            /(w906)/i
        ];
        // Patrones para extraer año
        const añoPatterns = [
            /(?:año|modelo|del)\s+(\d{4})/i,
            /(\d{4})/i
        ];
        // Extraer marca y modelo con mejor lógica
        let marcaFound = false;
        let modeloFound = false;
        // Buscar patrones específicos primero
        for (const pattern of marcaPatterns) {
            const match = message.match(pattern);
            if (match) {
                carInfo.marca = match[1].toLowerCase();
                marcaFound = true;
                break;
            }
        }
        // Buscar modelo específico
        for (const pattern of modeloPatterns) {
            const match = message.match(pattern);
            if (match) {
                carInfo.modelo = match[1].toLowerCase();
                modeloFound = true;
                break;
            }
        }
        // Si no se encontró marca, buscar en el texto completo
        if (!marcaFound) {
            const marcaKeywords = ['vw', 'volkswagen', 'toyota', 'honda', 'nissan', 'ford', 'chevrolet'];
            for (const keyword of marcaKeywords) {
                if (message.toLowerCase().includes(keyword)) {
                    carInfo.marca = keyword;
                    marcaFound = true;
                    break;
                }
            }
        }
        // Si no se encontró modelo, buscar en el texto completo
        if (!modeloFound) {
            const modeloKeywords = ['sprinter', 'crafter', 'w906', 'corolla', 'civic', 'sentra'];
            for (const keyword of modeloKeywords) {
                if (message.toLowerCase().includes(keyword)) {
                    carInfo.modelo = keyword;
                    modeloFound = true;
                    break;
                }
            }
        }
        // Extraer año
        for (const pattern of añoPatterns) {
            const match = message.match(pattern);
            if (match) {
                const año = parseInt(match[1]);
                if (año >= 1990 && año <= new Date().getFullYear() + 1) {
                    carInfo.año = año;
                }
            }
        }
        // Extraer nombre de pieza - Mejorado para reconocer frases completas
        partName = this.extractPartNameFromMessage(message);
        return { carInfo: (carInfo.marca && carInfo.modelo) ? carInfo : undefined, partName };
    }
    /**
     * Extraer nombre de pieza del mensaje usando patrones mejorados
     */
    extractPartNameFromMessage(message) {
        const normalizedMessage = message.toLowerCase();
        // Patrones genéricos para piezas (sin sobre-ingeniería específica)
        const partPatterns = [
            // Frases completas específicas para funda de palanca
            /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?velocidades?\s+(?:de\s+)?transmision\s+estandar)/i,
            /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?transmision\s+estandar)/i,
            /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?velocidades?)/i,
            /(funda\s+(?:de\s+)?palanca\s+(?:de\s+)?transmision)/i,
            // Otras frases completas comunes
            /(pastillas?\s+(?:de\s+)?freno)/i,
            /(discos?\s+(?:de\s+)?freno)/i,
            /(balatas?\s+(?:de\s+)?freno)/i,
            /(filtro\s+(?:de\s+)?aceite)/i,
            /(filtro\s+(?:de\s+)?aire)/i,
            /(kit\s+(?:de\s+)?embrague)/i,
            /(disco\s+(?:de\s+)?embrague)/i,
            /(amortiguador)/i,
            /(bateria)/i,
            /(llantas?)/i,
            // Palabras individuales (fallback)
            /(funda)/i,
            /(palanca)/i,
            /(pastillas?)/i,
            /(frenos?)/i,
            /(discos?)/i,
            /(balatas?)/i,
            /(filtro)/i,
            /(aceite)/i,
            /(aire)/i,
            /(embrague)/i,
            /(clutch)/i,
            /(amortiguador)/i,
            /(bateria)/i,
            /(llantas?)/i
        ];
        // Buscar coincidencias en el texto normalizado
        for (const pattern of partPatterns) {
            const match = normalizedMessage.match(pattern);
            if (match) {
                const extractedPart = match[1].toLowerCase().trim();
                console.log(`[AutomotivePartsConversation] ✅ Pieza extraída: "${extractedPart}"`);
                return extractedPart;
            }
        }
        // Si no se encontró con patrones, buscar palabras clave específicas
        const partKeywords = [
            'funda palanca velocidades transmision estandar',
            'funda palanca transmision estandar',
            'funda palanca velocidades',
            'funda palanca',
            'pastillas freno',
            'discos freno',
            'filtro aceite',
            'filtro aire',
            'kit embrague',
            'amortiguador',
            'bateria',
            'llantas'
        ];
        for (const keyword of partKeywords) {
            if (normalizedMessage.includes(keyword)) {
                console.log(`[AutomotivePartsConversation] ✅ Pieza extraída por palabra clave: "${keyword}"`);
                return keyword;
            }
        }
        console.log(`[AutomotivePartsConversation] ❌ No se pudo extraer nombre de pieza del mensaje`);
        return undefined;
    }
    /**
     * Verificar si tenemos información completa
     */
    hasCompleteInformation(carInfo, partName) {
        return !!((carInfo === null || carInfo === void 0 ? void 0 : carInfo.marca) && (carInfo === null || carInfo === void 0 ? void 0 : carInfo.modelo) && partName);
    }
    /**
     * Realizar búsqueda directa
     */
    performDirectSearch(partName, carInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[AutomotivePartsConversation] Búsqueda directa: "${partName}" para ${carInfo.marca} ${carInfo.modelo}`);
            return yield this.partsSearchService.searchAutomotiveParts(partName, carInfo, {
                limit: 5,
                minConfidence: 0.4
            });
        });
    }
    /**
     * Generar respuesta con resultados
     */
    generateResultsResponse(searchResults, carInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            let responseText = '';
            if (searchResults.success && searchResults.results.length > 0) {
                if (searchResults.results.length === 1) {
                    const result = searchResults.results[0];
                    responseText = `✅ Encontré esta pieza para tu ${carInfo.marca} ${carInfo.modelo}:\n\n` +
                        `🔑 **Clave:** ${result.clave}\n` +
                        `🏷️ **Marca:** ${result.marca}\n` +
                        `📝 **Descripción:** ${result.nombre}`;
                }
                else {
                    responseText = `✅ Encontré ${searchResults.results.length} opciones para tu ${carInfo.marca} ${carInfo.modelo}:\n\n`;
                    searchResults.results.forEach((result, index) => {
                        responseText += `${index + 1}. **Clave:** ${result.clave} | **Marca:** ${result.marca}\n   ${result.nombre}\n\n`;
                    });
                }
            }
            else {
                responseText = `❌ No encontré piezas de ${searchResults.normalizedTerm} para tu ${carInfo.marca} ${carInfo.modelo}. ` +
                    `¿Podrías verificar la información de tu auto o el nombre de la pieza?`;
            }
            return {
                response: responseText,
                intent: 'automotive_parts_search',
                entities: new Map(),
                functionCalls: [],
                conversationState: {
                    phase: 'search_completed',
                    canProgress: true,
                    nextSteps: ['confirm_purchase', 'search_another_part']
                },
                metadata: {
                    responseTime: 0,
                    functionsCalled: 0,
                    confidenceScore: 0.9,
                    promptUsed: 'automotive_parts_results'
                },
                searchResults
            };
        });
    }
    /**
     * Extraer información del auto desde la memoria
     */
    extractCarInfoFromMemory(conversationId) {
        const memory = conversation_memory_1.conversationMemoryManager.getMemory(conversationId);
        if (!memory)
            return undefined;
        const carInfo = memory.shortTermMemory.contextualEntities.get('carInfo');
        return carInfo;
    }
    /**
     * Extraer nombre de pieza desde la memoria
     */
    extractPartNameFromMemory(conversationId) {
        const memory = conversation_memory_1.conversationMemoryManager.getMemory(conversationId);
        if (!memory)
            return undefined;
        return memory.shortTermMemory.contextualEntities.get('partName');
    }
    /**
     * Generar respuesta de error
     */
    generateErrorResponse(request, error) {
        return {
            response: '❌ Lo siento, tuve un problema procesando tu solicitud. ¿Podrías intentar de nuevo?',
            intent: 'error',
            entities: new Map(),
            functionCalls: [],
            conversationState: {
                phase: 'error',
                canProgress: false,
                nextSteps: ['retry']
            },
            metadata: {
                responseTime: 0,
                functionsCalled: 0,
                confidenceScore: 0,
                promptUsed: 'error'
            }
        };
    }
}
exports.AutomotivePartsConversationService = AutomotivePartsConversationService;
