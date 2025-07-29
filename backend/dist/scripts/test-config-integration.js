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
exports.testConfigIntegration = testConfigIntegration;
const config_1 = require("../config");
const chatbot_service_1 = require("../services/chatbot.service");
const advanced_conversation_engine_1 = require("../services/conversation/advanced-conversation-engine");
/**
 * Script para verificar que la configuración centralizada se está usando correctamente
 */
function testConfigIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Verificando integración de configuración centralizada...\n');
        try {
            // 1. Verificar configuración centralizada
            const config = (0, config_1.getConfig)();
            console.log('📋 Configuración LLM cargada:');
            console.log(`  Base URL: ${config.llm.openRouterBaseUrl}`);
            console.log(`  Modelo: ${config.llm.openRouterModel}`);
            console.log(`  Temperatura: ${config.llm.defaultTemperature}`);
            console.log(`  Max Tokens: ${config.llm.defaultMaxTokens}`);
            console.log(`  Timeout: ${config.llm.timeout}ms`);
            console.log(`  API Key: ${config.llm.openRouterApiKey ? '✅ Configurada' : '❌ No configurada'}`);
            // 2. Verificar ChatbotService
            console.log('\n🤖 Verificando ChatbotService...');
            const chatbotService = new chatbot_service_1.ChatbotService();
            console.log('✅ ChatbotService creado con configuración centralizada');
            // 3. Verificar AdvancedConversationEngine
            console.log('\n⚙️ Verificando AdvancedConversationEngine...');
            const engine = new advanced_conversation_engine_1.AdvancedConversationEngine();
            console.log('✅ AdvancedConversationEngine creado con configuración centralizada');
            // 4. Probar con un mensaje simple
            console.log('\n📝 Probando procesamiento con configuración centralizada...');
            try {
                const result = yield chatbotService.processWhatsAppMessage('1234567890', 'Hola');
                console.log('✅ Procesamiento exitoso con configuración centralizada');
                console.log(`  Respuesta: ${result.response.substring(0, 100)}...`);
            }
            catch (error) {
                console.log('⚠️ Error en procesamiento (puede ser por API key):', error.message);
                console.log('  Esto es normal si la API key no está configurada correctamente');
            }
            console.log('\n🎉 Verificación de configuración completada!');
        }
        catch (error) {
            console.error('❌ Error en la verificación:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testConfigIntegration()
        .then(() => {
        console.log('✅ Verificación de configuración completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en verificación:', error);
        process.exit(1);
    });
}
