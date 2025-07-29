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
 * Script para probar la integración del chatbot con las nuevas funciones
 */
function testChatbotIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Probando integración del chatbot con búsqueda de productos...\n');
        try {
            const chatbotService = new chatbot_service_1.ChatbotService();
            // Simular un mensaje de WhatsApp
            const phoneNumber = '5512345678';
            const testMessage = 'Necesito balatas para mi Toyota Corolla 2018';
            console.log(`📱 Mensaje de prueba: "${testMessage}"`);
            console.log(`📞 Número: ${phoneNumber}\n`);
            // Procesar el mensaje
            const result = yield chatbotService.processWhatsAppMessage(phoneNumber, testMessage);
            console.log('📤 Respuesta del chatbot:');
            console.log('✅ Éxito:', result.shouldSend);
            console.log('💬 Mensaje:', result.response);
            if (result.error) {
                console.log('❌ Error:', result.error);
            }
            if (result.conversationState) {
                console.log('\n📊 Estado de la conversación:');
                console.log('  ID:', result.conversationState.conversationId);
                console.log('  Estado:', result.conversationState.status);
                console.log('  Datos del cliente:', JSON.stringify(result.conversationState.clientInfo, null, 2));
                console.log('  Mensajes:', result.conversationState.messages.length);
            }
            console.log('\n🎉 Prueba completada!');
        }
        catch (error) {
            console.error('❌ Error en la prueba:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testChatbotIntegration()
        .then(() => {
        console.log('✅ Prueba de integración completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en prueba de integración:', error);
        process.exit(1);
    });
}
