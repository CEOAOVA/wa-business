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
exports.testConversationFlow = testConversationFlow;
const advanced_conversation_engine_1 = require("../services/conversation/advanced-conversation-engine");
/**
 * Script para probar el nuevo flujo de conversación
 */
function testConversationFlow() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Probando nuevo flujo de conversación...\n');
        try {
            const engine = new advanced_conversation_engine_1.AdvancedConversationEngine();
            // Simular mensajes de prueba
            const testMessages = [
                // 1. Solo pieza - debe preguntar por datos del auto
                "Necesito balatas",
                // 2. Solo datos del auto - debe preguntar qué pieza busca
                "Tengo un Toyota Corolla 2018",
                // 3. Información completa - debe buscar productos
                "Necesito balatas para mi Toyota Corolla 2018",
                // 4. Información completa con marca específica
                "Busco filtro de aceite para Honda Civic 2020",
                // 5. Mensaje general - no debe buscar
                "Hola, ¿cómo estás?",
                // 6. Solo marca - debe preguntar modelo y pieza
                "Tengo un Honda",
                // 7. Solo modelo - debe preguntar marca y pieza
                "Es un Corolla 2018"
            ];
            for (let i = 0; i < testMessages.length; i++) {
                const message = testMessages[i];
                console.log(`\n📝 Mensaje ${i + 1}: "${message}"`);
                // Simular memoria de conversación
                const mockMemory = {
                    conversationId: 'test-conversation',
                    shortTermMemory: {
                        currentTopic: '',
                        recentQueries: [],
                        contextualEntities: new Map(),
                        temporalReferences: new Map()
                    },
                    longTermMemory: {
                        userProfile: {
                            userId: 'test-user',
                            phoneNumber: '1234567890',
                            preferredLanguage: 'es',
                            timeZone: 'America/Mexico_City',
                            interactions: {
                                totalMessages: 0,
                                lastInteraction: new Date(),
                                commonTopics: []
                            },
                            preferences: {
                                preferredBrands: [],
                                communicationStyle: 'casual'
                            },
                            businessContext: {
                                pointOfSaleId: 'test-pos',
                                isVipCustomer: false
                            }
                        },
                        previousConversations: [],
                        learnedPreferences: new Map(),
                        behaviorPatterns: []
                    },
                    workingMemory: {
                        currentIntent: '',
                        activeFunction: undefined,
                        pendingActions: [],
                        contextStack: []
                    },
                    metadata: {
                        created: new Date(),
                        lastUpdated: new Date(),
                        conversationLength: 0,
                        averageResponseTime: 0
                    }
                };
                // Extraer intent y entidades
                const { intent, entities } = yield engine['extractIntentAndEntities'](message, mockMemory);
                console.log(`  Intent detectado: ${intent}`);
                console.log(`  Entidades: ${JSON.stringify(Object.fromEntries(entities))}`);
                // Verificar si debería buscar productos
                const hasProductTerms = entities.has('product_terms');
                const hasCarData = entities.has('car_marca') || entities.has('car_modelo') || entities.has('car_año');
                if (intent === 'search_product') {
                    console.log(`  ✅ DEBE buscar productos - Tiene pieza y datos del auto`);
                }
                else if (intent === 'request_car_info') {
                    console.log(`  ⚠️ DEBE preguntar por datos del auto - Solo tiene pieza`);
                }
                else if (intent === 'request_product_info') {
                    console.log(`  ⚠️ DEBE preguntar qué pieza busca - Solo tiene datos del auto`);
                }
                else {
                    console.log(`  ℹ️ No debe buscar productos - Intent: ${intent}`);
                }
            }
            console.log('\n🎉 Pruebas de flujo completadas!');
        }
        catch (error) {
            console.error('❌ Error en las pruebas:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testConversationFlow()
        .then(() => {
        console.log('✅ Pruebas de flujo completadas');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en pruebas:', error);
        process.exit(1);
    });
}
