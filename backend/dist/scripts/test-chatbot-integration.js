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
exports.testChatbotIntegration = testChatbotIntegration;
const chatbot_service_1 = require("../services/chatbot.service");
/**
 * Script para probar la integración del ChatbotService con AdvancedConversationEngine
 */
function testChatbotIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('🧪 Probando integración ChatbotService + AdvancedConversationEngine...\n');
        try {
            const chatbotService = new chatbot_service_1.ChatbotService();
            // Simular mensajes de prueba
            const testMessages = [
                // 1. Solo saludo - no debe buscar productos
                "Hola",
                // 2. Solo pieza - debe preguntar por datos del auto
                "Necesito balatas",
                // 3. Solo datos del auto - debe preguntar qué pieza busca
                "Tengo un Toyota Corolla 2018",
                // 4. Información completa - debe buscar productos
                "Necesito balatas para mi Toyota Corolla 2018",
                // 5. Información completa con marca específica
                "Busco filtro de aceite para Honda Civic 2020"
            ];
            for (let i = 0; i < testMessages.length; i++) {
                const message = testMessages[i];
                console.log(`\n📝 Mensaje ${i + 1}: "${message}"`);
                try {
                    const result = yield chatbotService.processWhatsAppMessage('1234567890', message);
                    console.log(`  ✅ Respuesta: ${result.response.substring(0, 100)}...`);
                    console.log(`  Intent: ${(_a = result.conversationState) === null || _a === void 0 ? void 0 : _a.status}`);
                    console.log(`  Debe enviar: ${result.shouldSend}`);
                    if (result.error) {
                        console.log(`  ❌ Error: ${result.error}`);
                    }
                }
                catch (error) {
                    console.log(`  ❌ Error procesando mensaje: ${error}`);
                }
            }
            console.log('\n🎉 Pruebas de integración completadas!');
        }
        catch (error) {
            console.error('❌ Error en las pruebas:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testChatbotIntegration()
        .then(() => {
        console.log('✅ Pruebas de integración completadas');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en pruebas:', error);
        process.exit(1);
    });
}
