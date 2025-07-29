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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOpenRouterAPI = testOpenRouterAPI;
const axios_1 = __importDefault(require("axios"));
/**
 * Script rápido para probar la API de OpenRouter
 */
function testOpenRouterAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        console.log('🧪 Probando API de OpenRouter...\n');
        const apiKey = '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';
        const baseURL = 'https://openrouter.ai/api/v1';
        const model = 'google/gemini-2.5-flash-lite-preview-06-17';
        try {
            console.log('📡 Configuración:');
            console.log('  API Key:', apiKey.substring(0, 20) + '...');
            console.log('  Modelo:', model);
            console.log('  URL:', baseURL);
            console.log('');
            // Test 1: Llamada simple sin funciones
            console.log('🔍 Test 1: Llamada simple sin funciones');
            const simplePayload = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: 'Hola, ¿cómo estás?'
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            };
            const simpleResponse = yield axios_1.default.post(`${baseURL}/chat/completions`, simplePayload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3002',
                    'X-Title': 'Embler WhatsApp Chatbot'
                },
                timeout: 30000
            });
            console.log('✅ Test 1 exitoso');
            console.log('  Respuesta:', (_b = (_a = simpleResponse.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content);
            console.log('  Tokens usados:', simpleResponse.data.usage);
            console.log('');
            // Test 2: Llamada con funciones
            console.log('🔍 Test 2: Llamada con funciones de búsqueda de productos');
            const functionPayload = {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un vendedor de refacciones. Cuando el cliente mencione un producto, usa las funciones disponibles.'
                    },
                    {
                        role: 'user',
                        content: 'Necesito balatas para mi Toyota Corolla 2018'
                    }
                ],
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'buscarProductoPorTermino',
                            description: 'Buscar productos en el catálogo',
                            parameters: {
                                type: 'object',
                                properties: {
                                    termino: {
                                        type: 'string',
                                        description: 'Término de búsqueda'
                                    },
                                    datosAuto: {
                                        type: 'object',
                                        description: 'Datos del auto',
                                        properties: {
                                            marca: { type: 'string' },
                                            modelo: { type: 'string' },
                                            año: { type: 'number' }
                                        }
                                    }
                                },
                                required: ['termino']
                            }
                        }
                    }
                ],
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 500
            };
            const functionResponse = yield axios_1.default.post(`${baseURL}/chat/completions`, functionPayload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3002',
                    'X-Title': 'Embler WhatsApp Chatbot'
                },
                timeout: 30000
            });
            console.log('✅ Test 2 exitoso');
            console.log('  Respuesta:', (_d = (_c = functionResponse.data.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content);
            console.log('  Tool calls:', (_f = (_e = functionResponse.data.choices[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.tool_calls);
            console.log('  Tokens usados:', functionResponse.data.usage);
            console.log('');
            console.log('🎉 ¡Todos los tests exitosos! La API key es válida.');
        }
        catch (error) {
            console.error('❌ Error en la prueba:');
            console.error('  Status:', (_g = error.response) === null || _g === void 0 ? void 0 : _g.status);
            console.error('  Message:', ((_k = (_j = (_h = error.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.error) === null || _k === void 0 ? void 0 : _k.message) || error.message);
            console.error('  Code:', (_o = (_m = (_l = error.response) === null || _l === void 0 ? void 0 : _l.data) === null || _m === void 0 ? void 0 : _m.error) === null || _o === void 0 ? void 0 : _o.code);
            if (((_p = error.response) === null || _p === void 0 ? void 0 : _p.status) === 401) {
                console.error('\n🔑 La API key no es válida o ha expirado.');
                console.error('   Verifica que la key sea correcta y tenga créditos disponibles.');
            }
            else if (((_q = error.response) === null || _q === void 0 ? void 0 : _q.status) === 429) {
                console.error('\n⏰ Rate limit alcanzado. Espera un momento antes de intentar de nuevo.');
            }
            else {
                console.error('\n🔧 Error de configuración o red.');
            }
        }
    });
}
// Ejecutar si se llama directamente
if (require.main === module) {
    testOpenRouterAPI()
        .then(() => {
        console.log('\n✅ Prueba de API completada');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ Error en prueba de API:', error);
        process.exit(1);
    });
}
