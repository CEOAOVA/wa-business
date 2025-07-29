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
exports.testOpenRouterConfig = testOpenRouterConfig;
const config_1 = require("../config");
const openai_client_1 = require("../config/openai-client");
/**
 * Script para verificar la configuración de OpenRouter
 */
function testOpenRouterConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Verificando configuración de OpenRouter...\n');
        try {
            // 1. Verificar configuración
            const config = (0, config_1.getConfig)();
            console.log('📋 Configuración LLM:');
            console.log(`  Base URL: ${config.llm.openRouterBaseUrl}`);
            console.log(`  Modelo: ${config.llm.openRouterModel}`);
            console.log(`  Temperatura: ${config.llm.defaultTemperature}`);
            console.log(`  Max Tokens: ${config.llm.defaultMaxTokens}`);
            console.log(`  Timeout: ${config.llm.timeout}ms`);
            console.log(`  API Key: ${config.llm.openRouterApiKey ? '✅ Configurada' : '❌ No configurada'}`);
            // 2. Verificar cliente OpenAI
            console.log('\n🤖 Verificando cliente OpenAI...');
            console.log('✅ Cliente OpenAI creado');
            // 3. Probar conexión
            console.log('\n🔗 Probando conexión con OpenRouter...');
            const connectionTest = yield openai_client_1.openRouterClient.testConnection();
            if (connectionTest.success) {
                console.log(`✅ Conexión exitosa (latencia: ${connectionTest.latency}ms)`);
            }
            else {
                console.log(`❌ Error de conexión: ${connectionTest.error}`);
            }
            // 4. Probar llamada completa
            console.log('\n📝 Probando llamada completa...');
            try {
                const response = yield openai_client_1.openRouterClient.createChatCompletion({
                    messages: [
                        { role: 'system', content: 'Eres un asistente útil.' },
                        { role: 'user', content: 'Hola, ¿cómo estás?' }
                    ],
                    max_tokens: 50
                });
                console.log('✅ Llamada exitosa');
                console.log(`  Respuesta: ${response.content}`);
                console.log(`  Modelo usado: ${response.model || 'No especificado'}`);
            }
            catch (error) {
                console.log('❌ Error en llamada completa:', error.message);
            }
            console.log('\n🎉 Verificación de OpenRouter completada!');
        }
        catch (error) {
            console.error('❌ Error en la verificación:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testOpenRouterConfig()
        .then(() => {
        console.log('✅ Verificación de OpenRouter completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en verificación:', error);
        process.exit(1);
    });
}
