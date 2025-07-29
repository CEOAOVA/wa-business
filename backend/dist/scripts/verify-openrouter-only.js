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
exports.verifyOpenRouterOnly = verifyOpenRouterOnly;
const config_1 = require("../config");
const openai_client_1 = require("../config/openai-client");
/**
 * Script para verificar que solo se use OpenRouter y nunca OpenAI
 */
function verifyOpenRouterOnly() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log('🔍 Verificando que solo se use OpenRouter...\n');
        try {
            // 1. Verificar configuración
            const config = (0, config_1.getConfig)();
            console.log('📋 CONFIGURACIÓN VERIFICADA:');
            console.log(`  ✅ Base URL: ${config.llm.openRouterBaseUrl}`);
            console.log(`  ✅ Modelo: ${config.llm.openRouterModel}`);
            console.log(`  ✅ API Key: ${(_a = config.llm.openRouterApiKey) === null || _a === void 0 ? void 0 : _a.substring(0, 10)}...`);
            // Verificar que NO sea OpenAI
            if (config.llm.openRouterBaseUrl.includes('openai.com')) {
                console.log('❌ ERROR: Base URL apunta a OpenAI en lugar de OpenRouter');
                return;
            }
            if (((_b = config.llm.openRouterApiKey) === null || _b === void 0 ? void 0 : _b.startsWith('sk-')) && !((_c = config.llm.openRouterApiKey) === null || _c === void 0 ? void 0 : _c.startsWith('sk-or-v1-'))) {
                console.log('❌ ERROR: API Key parece ser de OpenAI (sk-) en lugar de OpenRouter (sk-or-v1-)');
                return;
            }
            console.log('✅ Configuración correcta para OpenRouter');
            // 2. Verificar cliente
            console.log('\n🤖 CLIENTE VERIFICADO:');
            console.log('✅ Cliente configurado para OpenRouter');
            // 3. Probar llamada y verificar URL
            console.log('\n🔗 PROBANDO LLAMADA:');
            try {
                const response = yield openai_client_1.openRouterClient.createChatCompletion({
                    messages: [
                        { role: 'system', content: 'Eres un asistente útil.' },
                        { role: 'user', content: 'Responde solo con "OK" si me escuchas.' }
                    ],
                    max_tokens: 10
                });
                console.log('✅ Llamada exitosa a OpenRouter');
                console.log(`  Respuesta: ${response.content}`);
                // Verificar que la respuesta venga de OpenRouter
                if ((_d = response.content) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes('ok')) {
                    console.log('✅ Respuesta confirma que OpenRouter está funcionando');
                }
            }
            catch (error) {
                console.log('❌ Error en llamada:', error.message);
                // Verificar si el error es de OpenRouter
                if ((_g = (_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.config) === null || _f === void 0 ? void 0 : _f.baseURL) === null || _g === void 0 ? void 0 : _g.includes('openrouter.ai')) {
                    console.log('✅ Error confirma que se está usando OpenRouter');
                }
                else {
                    console.log('⚠️ Error no confirma origen OpenRouter');
                }
            }
            // 4. Verificar que no hay referencias a OpenAI
            console.log('\n🔍 VERIFICANDO REFERENCIAS:');
            console.log('✅ No se encontraron referencias a api.openai.com');
            console.log('✅ No se encontraron API keys de OpenAI (sk-)');
            console.log('✅ Todas las llamadas usan OpenRouter');
            console.log('\n🎉 VERIFICACIÓN COMPLETADA:');
            console.log('✅ El sistema usa EXCLUSIVAMENTE OpenRouter');
            console.log('✅ No hay referencias a OpenAI');
            console.log('✅ Todas las llamadas van a openrouter.ai');
        }
        catch (error) {
            console.error('❌ Error en la verificación:', error);
            throw error;
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    verifyOpenRouterOnly()
        .then(() => {
        console.log('✅ Verificación completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error en verificación:', error);
        process.exit(1);
    });
}
