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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotService = exports.ChatbotService = void 0;
/**
 * Servicio de Chatbot para Backend
 * Adaptado desde la implementación frontend para integrar con WhatsApp
 */
const axios_1 = __importDefault(require("axios"));
const env_loader_1 = require("../config/env-loader");
const whatsapp_service_1 = require("./whatsapp.service");
const database_service_1 = require("./database.service");
const config_1 = require("../config");
const advanced_conversation_engine_1 = require("./conversation/advanced-conversation-engine");
const automotive_parts_conversation_service_1 = require("./conversation/automotive-parts-conversation.service");
// Cargar variables de entorno con soporte Unicode
(0, env_loader_1.loadEnvWithUnicodeSupport)();
class ChatbotService {
    constructor() {
        this.conversations = new Map();
        this.SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
        // NUEVO: Usar configuración centralizada
        this.config = (0, config_1.getConfig)();
        this.openRouterConfig = {
            baseURL: this.config.llm.openRouterBaseUrl,
            model: this.config.llm.openRouterModel,
            timeout: this.config.llm.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.llm.openRouterApiKey}`,
                'HTTP-Referer': 'http://localhost:3002',
                'X-Title': 'Embler WhatsApp Chatbot'
            }
        };
        this.advancedEngine = new advanced_conversation_engine_1.AdvancedConversationEngine();
        this.automotivePartsService = new automotive_parts_conversation_service_1.AutomotivePartsConversationService();
        this.startCleanupInterval();
    }
    /**
     * Limpiar sesiones expiradas
     */
    startCleanupInterval() {
        setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Cada 5 minutos
    }
    /**
     * Detectar si el mensaje es sobre piezas automotrices
     */
    isAutomotivePartsMessage(message) {
        const normalizedMessage = message.toLowerCase();
        // Palabras clave relacionadas con piezas automotrices
        const automotiveKeywords = [
            'funda', 'palanca', 'velocidades', 'transmision', 'estandar',
            'pastillas', 'freno', 'discos', 'balatas',
            'filtro', 'aceite', 'aire', 'combustible',
            'embrague', 'clutch', 'amortiguador', 'bateria',
            'llantas', 'neumaticos', 'aceite', 'refrigerante',
            'bujias', 'correa', 'bomba', 'radiador',
            'escape', 'silenciador', 'suspension', 'direccion'
        ];
        // Verificar si el mensaje contiene palabras clave automotrices
        for (const keyword of automotiveKeywords) {
            if (normalizedMessage.includes(keyword)) {
                console.log(`[ChatbotService] Detectada palabra clave automotriz: "${keyword}"`);
                return true;
            }
        }
        // Verificar si el mensaje menciona marcas de autos
        const carBrands = [
            'toyota', 'honda', 'nissan', 'ford', 'chevrolet', 'volkswagen',
            'mazda', 'hyundai', 'bmw', 'mercedes', 'audi', 'kia',
            'subaru', 'mitsubishi', 'suzuki', 'isuzu', 'jeep', 'dodge',
            'vw', 'volkswagen', 'sprinter', 'crafter'
        ];
        for (const brand of carBrands) {
            if (normalizedMessage.includes(brand)) {
                console.log(`[ChatbotService] Detectada marca de auto: "${brand}"`);
                return true;
            }
        }
        return false;
    }
    /**
     * Procesar mensaje entrante de WhatsApp y generar respuesta con IA
     */
    processWhatsAppMessage(phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[ChatbotService] Procesando mensaje de ${phoneNumber}: ${message.substring(0, 50)}...`);
                // Detectar si el mensaje es sobre piezas automotrices
                const isAutomotivePartsRequest = this.isAutomotivePartsMessage(message);
                if (isAutomotivePartsRequest) {
                    console.log(`[ChatbotService] Detectado mensaje de piezas automotrices, usando servicio especializado`);
                    const request = {
                        conversationId: `wa-${phoneNumber}`,
                        userId: phoneNumber,
                        phoneNumber: phoneNumber,
                        message: message,
                        pointOfSaleId: 'default'
                    };
                    const response = yield this.automotivePartsService.processAutomotivePartsConversation(request);
                    console.log(`[ChatbotService] Respuesta de piezas automotrices: ${response.response.substring(0, 100)}...`);
                    return {
                        response: response.response,
                        shouldSend: true,
                        conversationState: {
                            conversationId: request.conversationId,
                            phoneNumber: phoneNumber,
                            status: 'greeting',
                            clientInfo: {},
                            messages: [],
                            createdAt: new Date(),
                            lastActivity: new Date()
                        }
                    };
                }
                else {
                    // Usar el motor de conversación general
                    const request = {
                        conversationId: `wa-${phoneNumber}`,
                        userId: phoneNumber,
                        phoneNumber: phoneNumber,
                        message: message,
                        pointOfSaleId: 'default'
                    };
                    const response = yield this.advancedEngine.processConversation(request);
                    console.log(`[ChatbotService] Respuesta general: ${response.response.substring(0, 100)}...`);
                    return {
                        response: response.response,
                        shouldSend: true,
                        conversationState: {
                            conversationId: request.conversationId,
                            phoneNumber: phoneNumber,
                            status: 'greeting',
                            clientInfo: {},
                            messages: [],
                            createdAt: new Date(),
                            lastActivity: new Date()
                        }
                    };
                }
            }
            catch (error) {
                console.error('[ChatbotService] Error procesando mensaje:', error);
                return {
                    response: 'Lo siento, ocurrió un error técnico. Un agente humano te ayudará pronto.',
                    shouldSend: true,
                    error: error.message
                };
            }
        });
    }
    /**
     * Iniciar nueva conversación
     */
    startConversation(conversationId, phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const welcomeMessage = "¡Hola! 😊 ¿En qué te puedo ayudar?";
            // Crear o obtener conversación en la base de datos
            try {
                const dbResult = yield database_service_1.databaseService.getOrCreateConversationByPhone(phoneNumber);
                console.log(`[ChatbotService] Conversación DB creada/obtenida para ${phoneNumber}`);
            }
            catch (error) {
                console.error('[ChatbotService] Error creando conversación en DB:', error);
            }
            const conversation = {
                conversationId,
                phoneNumber,
                status: 'greeting',
                clientInfo: {},
                messages: [
                    {
                        id: `msg-${Date.now()}`,
                        role: 'assistant',
                        content: welcomeMessage,
                        timestamp: new Date()
                    }
                ],
                createdAt: new Date(),
                lastActivity: new Date()
            };
            this.conversations.set(conversationId, conversation);
            return conversation;
        });
    }
    /**
     * Generar respuesta con IA usando OpenRouter
     */
    generateAIResponse(conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const messages = this.buildMessagesForLLM(conversation);
            const tools = this.getFunctionDefinitions();
            try {
                const response = yield this.callOpenRouter(messages, tools);
                // Verificar si hay tool calls
                const toolCalls = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.tool_calls;
                if (toolCalls && toolCalls.length > 0) {
                    const toolCall = toolCalls[0];
                    // Procesar function call
                    const functionResult = yield this.processToolCall(toolCall, conversation);
                    // Generar respuesta final
                    const finalResponse = yield this.generateFinalResponse(messages, functionResult);
                    return {
                        content: finalResponse,
                        functionCalled: toolCall.function.name,
                        updatedClientInfo: functionResult.updatedData
                    };
                }
                // Respuesta directa sin tool calls
                return {
                    content: ((_d = (_c = response.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || 'Lo siento, no pude procesar tu mensaje.'
                };
            }
            catch (error) {
                console.error('[ChatbotService] Error generando respuesta IA:', error);
                throw error;
            }
        });
    }
    /**
     * Llamar a OpenRouter API
     */
    callOpenRouter(messages, tools, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const config = (0, config_1.getConfig)();
            const apiKey = config.llm.openRouterApiKey;
            if (!apiKey) {
                throw new Error('OpenRouter API key no configurada. Agregar OPEN_ROUTER_API_KEY al archivo .env');
            }
            const payload = {
                model: this.openRouterConfig.model,
                messages: messages,
                tools: tools || undefined,
                tool_choice: tools ? 'auto' : undefined,
                temperature: (_a = options === null || options === void 0 ? void 0 : options.temperature) !== null && _a !== void 0 ? _a : 0.7,
                max_tokens: (_b = options === null || options === void 0 ? void 0 : options.maxTokens) !== null && _b !== void 0 ? _b : 1000,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            };
            console.log('[ChatbotService] Llamando OpenRouter API con payload:', {
                model: payload.model,
                messagesCount: messages.length,
                toolsCount: (tools === null || tools === void 0 ? void 0 : tools.length) || 0
            });
            const response = yield axios_1.default.post(`${this.openRouterConfig.baseURL}/chat/completions`, payload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3002',
                    'X-Title': 'Embler WhatsApp Chatbot'
                },
                timeout: this.openRouterConfig.timeout
            });
            console.log('[ChatbotService] Respuesta de OpenRouter:', {
                id: response.data.id,
                usage: response.data.usage,
                finishReason: (_c = response.data.choices[0]) === null || _c === void 0 ? void 0 : _c.finish_reason
            });
            return response.data;
        });
    }
    /**
     * Construir mensajes para el LLM
     */
    buildMessagesForLLM(conversation) {
        const systemMessage = {
            role: 'system',
            content: `Eres un vendedor especialista en refacciones automotrices de Embler (AOVA). Eres amigable, profesional y SIEMPRE usas las funciones para buscar productos reales.

🎯 TU OBJETIVO: Vender refacciones usando el catálogo real de productos.

⚠️ REGLA FUNDAMENTAL - BÚSQUEDA INTELIGENTE:
SOLO busca productos cuando tengas TANTO la pieza COMO los datos del auto:
1. ✅ Cliente dice: "Necesito balatas para mi Toyota Corolla 2018" → BUSCAR
2. ❌ Cliente dice: "Necesito balatas" → PREGUNTAR por datos del auto
3. ❌ Cliente dice: "Tengo un Toyota Corolla" → PREGUNTAR qué pieza busca

🔍 FLUJO DE BÚSQUEDA OBLIGATORIO:
1. Cliente dice: "Necesito balatas para mi Toyota Corolla 2018"
2. TÚ: Extraer datos → marca: "toyota", modelo: "corolla", año: 2018
3. TÚ: Llamar "buscarProductoPorTermino" con termino: "balatas", datosAuto: {marca: "toyota", modelo: "corolla", año: 2018}
4. TÚ: Mostrar resultados reales del catálogo
5. Cliente confirma: "Sí, el número 1"
6. TÚ: Llamar "confirmarProductoSeleccionado" con clave del producto y confirmacion: true
7. TÚ: Mostrar detalles completos (nombre, clave, marca, precio, etc.)

📋 FUNCIONES DISPONIBLES:
- buscarProductoPorTermino: Busca productos REALES en el catálogo (solo cuando hay pieza + auto)
- confirmarProductoSeleccionado: Muestra detalles COMPLETOS del producto
- obtenerDetallesProducto: Obtiene información específica
- sugerirAlternativas: Sugiere cuando no hay coincidencias
- recopilar_dato_cliente: Recopila datos del cliente

💬 EJEMPLOS DE USO:
✅ Cliente: "Busco filtro de aceite para Honda Civic 2020"
TÚ: Llamar buscarProductoPorTermino con termino: "filtro de aceite", datosAuto: {marca: "honda", modelo: "civic", año: 2020}

❌ Cliente: "Busco filtro de aceite"
TÚ: "¿Para qué marca y modelo de auto necesitas el filtro de aceite?"

❌ Cliente: "Tengo un Toyota Corolla 2018"
TÚ: "¿Qué pieza o repuesto necesitas para tu Toyota Corolla 2018?"

🎨 PERSONALIDAD:
✅ SOLO busca productos cuando tengas pieza Y datos del auto
✅ Pregunta por datos faltantes antes de buscar
✅ Muestra códigos y nombres REALES del catálogo
✅ Presenta opciones numeradas claramente
✅ Espera confirmación antes de mostrar detalles

❌ NUNCA busques productos sin datos completos
❌ NUNCA inventes productos o códigos
❌ NO uses datos genéricos, usa el catálogo real

INFORMACIÓN ACTUAL DEL CLIENTE:
${JSON.stringify(conversation.clientInfo, null, 2)}

ESTADO: ${conversation.status}

Recuerda: ¡SOLO busca productos cuando tengas pieza Y datos del auto! 🚀`
        };
        // Convertir mensajes de la conversación
        const conversationMessages = conversation.messages
            .slice(-6) // Últimos 6 mensajes para no exceder límites
            .map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        return [systemMessage, ...conversationMessages];
    }
    /**
     * Obtener definiciones de funciones para OpenRouter
     */
    getFunctionDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'recopilar_dato_cliente',
                    description: 'Recopilar y guardar información del cliente y su vehículo para cotización de repuestos',
                    parameters: {
                        type: 'object',
                        properties: {
                            nombre: {
                                type: 'string',
                                description: 'Nombre del cliente'
                            },
                            necesidad: {
                                type: 'string',
                                description: 'Qué pieza o repuesto necesita'
                            },
                            marca: {
                                type: 'string',
                                description: 'Marca del vehículo (Toyota, Honda, Ford, etc.)'
                            },
                            modelo: {
                                type: 'string',
                                description: 'Modelo del vehículo (Corolla, Civic, Focus, etc.)'
                            },
                            año: {
                                type: 'number',
                                description: 'Año del vehículo'
                            },
                            litraje: {
                                type: 'string',
                                description: 'Litraje del motor (1.6L, 2.0L, etc.)'
                            },
                            numeroSerie: {
                                type: 'string',
                                description: 'Número de serie del motor'
                            },
                            modeloEspecial: {
                                type: 'string',
                                description: 'Si es modelo especial (Sport, Turbo, etc.)'
                            }
                        },
                        required: []
                    }
                }
            },
            // NUEVAS FUNCIONES DE BÚSQUEDA DE PRODUCTOS
            {
                type: 'function',
                function: {
                    name: 'buscarProductoPorTermino',
                    description: 'Buscar productos en el catálogo usando términos coloquiales y datos del auto. Normaliza el término y busca coincidencias.',
                    parameters: {
                        type: 'object',
                        properties: {
                            termino: {
                                type: 'string',
                                description: 'Término de búsqueda del usuario (ej: "balatas", "filtro de aceite")'
                            },
                            datosAuto: {
                                type: 'object',
                                description: 'Datos del auto del cliente (marca, modelo, año, litraje)',
                                properties: {
                                    marca: { type: 'string' },
                                    modelo: { type: 'string' },
                                    año: { type: 'number' },
                                    litraje: { type: 'string' }
                                }
                            },
                            limit: {
                                type: 'number',
                                description: 'Número máximo de resultados a mostrar (default: 10)'
                            }
                        },
                        required: ['termino']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'confirmarProductoSeleccionado',
                    description: 'Confirmar la selección de un producto por parte del usuario y obtener sus detalles completos.',
                    parameters: {
                        type: 'object',
                        properties: {
                            clave: {
                                type: 'string',
                                description: 'Clave del producto seleccionado'
                            },
                            confirmacion: {
                                type: 'boolean',
                                description: 'Si el usuario confirma la selección'
                            },
                            indiceSeleccionado: {
                                type: 'number',
                                description: 'Índice del producto seleccionado (opcional)'
                            }
                        },
                        required: ['clave', 'confirmacion']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'obtenerDetallesProducto',
                    description: 'Obtener detalles completos de un producto específico usando su clave.',
                    parameters: {
                        type: 'object',
                        properties: {
                            clave: {
                                type: 'string',
                                description: 'Clave del producto'
                            }
                        },
                        required: ['clave']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'sugerirAlternativas',
                    description: 'Generar sugerencias de búsqueda cuando no se encuentran productos.',
                    parameters: {
                        type: 'object',
                        properties: {
                            terminoOriginal: {
                                type: 'string',
                                description: 'Término original de búsqueda'
                            },
                            razon: {
                                type: 'string',
                                description: 'Razón por la que no se encontraron resultados',
                                enum: ['no_encontrado', 'sin_stock', 'incompatible']
                            }
                        },
                        required: ['terminoOriginal']
                    }
                }
            }
        ];
    }
    /**
     * Procesar tool call
     */
    processToolCall(toolCall, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments || '{}');
                console.log(`[ChatbotService] Procesando tool call: ${functionName}`, args);
                if (functionName === 'recopilar_dato_cliente') {
                    // Filtrar solo los datos que tienen valor
                    const updatedData = {};
                    Object.keys(args).forEach(key => {
                        if (args[key] && args[key].toString().trim()) {
                            updatedData[key] = args[key];
                        }
                    });
                    return {
                        success: true,
                        updatedData,
                        message: 'Información guardada correctamente'
                    };
                }
                // NUEVAS FUNCIONES DE BÚSQUEDA DE PRODUCTOS
                if (functionName === 'buscarProductoPorTermino') {
                    try {
                        // Importar ProductSearchService
                        const { ProductSearchService } = yield Promise.resolve().then(() => __importStar(require('./product-search.service')));
                        const productSearchService = new ProductSearchService();
                        const { termino, datosAuto = {}, limit = 10 } = args;
                        // Extraer datos del auto de la conversación si no se proporcionan
                        const carData = {
                            marca: datosAuto.marca || conversation.clientInfo.marca,
                            modelo: datosAuto.modelo || conversation.clientInfo.modelo,
                            año: datosAuto.año || conversation.clientInfo.año,
                            litraje: datosAuto.litraje || conversation.clientInfo.litraje
                        };
                        console.log(`[ChatbotService] Buscando producto: "${termino}" con datos:`, carData);
                        const searchResult = yield productSearchService.searchProductFlow(termino, carData, { limit });
                        if (searchResult.matches.length === 0) {
                            return {
                                success: true,
                                updatedData: {},
                                message: `No encontré productos que coincidan con "${termino}". ¿Podrías ser más específico?`
                            };
                        }
                        // Formatear resultados
                        const { formatSearchResults } = yield Promise.resolve().then(() => __importStar(require('../utils/product-search-utils')));
                        const mensajeFormateado = formatSearchResults(searchResult.matches, carData);
                        return {
                            success: true,
                            updatedData: {},
                            message: mensajeFormateado
                        };
                    }
                    catch (error) {
                        console.error('[ChatbotService] Error en búsqueda de productos:', error);
                        return {
                            success: false,
                            updatedData: {},
                            message: 'Error buscando productos. Te conectaré con un asesor.'
                        };
                    }
                }
                if (functionName === 'confirmarProductoSeleccionado') {
                    try {
                        const { clave, confirmacion } = args;
                        if (!confirmacion) {
                            return {
                                success: true,
                                updatedData: {},
                                message: 'Entiendo, no es lo que buscabas. ¿Qué más detalles puedes darme?'
                            };
                        }
                        // Importar ProductSearchService
                        const { ProductSearchService } = yield Promise.resolve().then(() => __importStar(require('./product-search.service')));
                        const productSearchService = new ProductSearchService();
                        const detalles = yield productSearchService.getProductDetails(clave);
                        if (!detalles) {
                            return {
                                success: true,
                                updatedData: {},
                                message: 'No pude obtener los detalles del producto. Te conectaré con un asesor.'
                            };
                        }
                        // Formatear detalles del producto
                        let mensajeDetalles = `✅ Perfecto, aquí tienes los detalles:\n\n`;
                        mensajeDetalles += `🔧 **${detalles.nombre || 'Producto'}**\n`;
                        mensajeDetalles += `📋 Clave: ${detalles.pieza}\n`;
                        if (detalles.marca)
                            mensajeDetalles += `🚗 Marca: ${detalles.marca}\n`;
                        if (detalles.modelo)
                            mensajeDetalles += `🏷️ Modelo: ${detalles.modelo}\n`;
                        if (detalles.año)
                            mensajeDetalles += `📅 Año: ${detalles.año}\n`;
                        if (detalles.precio)
                            mensajeDetalles += `💰 Precio: $${detalles.precio}\n`;
                        if (detalles.stock)
                            mensajeDetalles += `📦 Stock: ${detalles.stock} unidades\n`;
                        if (detalles.descripcion)
                            mensajeDetalles += `📝 Descripción: ${detalles.descripcion}\n`;
                        mensajeDetalles += `\n¿Te interesa este producto? Puedo ayudarte con la compra.`;
                        return {
                            success: true,
                            updatedData: {},
                            message: mensajeDetalles
                        };
                    }
                    catch (error) {
                        console.error('[ChatbotService] Error confirmando producto:', error);
                        return {
                            success: false,
                            updatedData: {},
                            message: 'Error procesando tu selección. Te conectaré con un asesor.'
                        };
                    }
                }
                if (functionName === 'obtenerDetallesProducto') {
                    try {
                        const { clave } = args;
                        // Importar ProductSearchService
                        const { ProductSearchService } = yield Promise.resolve().then(() => __importStar(require('./product-search.service')));
                        const productSearchService = new ProductSearchService();
                        const detalles = yield productSearchService.getProductDetails(clave);
                        if (!detalles) {
                            return {
                                success: false,
                                updatedData: {},
                                message: `No pude encontrar los detalles del producto con clave "${clave}".`
                            };
                        }
                        return {
                            success: true,
                            updatedData: {},
                            message: `Detalles del producto ${detalles.nombre || clave} obtenidos correctamente.`
                        };
                    }
                    catch (error) {
                        console.error('[ChatbotService] Error obteniendo detalles:', error);
                        return {
                            success: false,
                            updatedData: {},
                            message: 'Error obteniendo detalles del producto.'
                        };
                    }
                }
                if (functionName === 'sugerirAlternativas') {
                    try {
                        const { terminoOriginal, razon = 'no_encontrado' } = args;
                        // Importar utilidades
                        const { generateSearchSuggestions } = yield Promise.resolve().then(() => __importStar(require('../utils/product-search-utils')));
                        const suggestions = generateSearchSuggestions(terminoOriginal);
                        const mensaje = `No encontré "${terminoOriginal}". ${suggestions[0]}`;
                        return {
                            success: true,
                            updatedData: {},
                            message: mensaje
                        };
                    }
                    catch (error) {
                        console.error('[ChatbotService] Error generando sugerencias:', error);
                        return {
                            success: false,
                            updatedData: {},
                            message: `Error generando sugerencias para "${args.terminoOriginal}".`
                        };
                    }
                }
                return {
                    success: false,
                    updatedData: {},
                    message: 'Función no reconocida'
                };
            }
            catch (error) {
                console.error('[ChatbotService] Error procesando tool call:', error);
                return {
                    success: false,
                    updatedData: {},
                    message: 'Error procesando la información'
                };
            }
        });
    }
    /**
     * Generar respuesta final después de procesar tool call
     */
    generateFinalResponse(messages, functionResult) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const finalMessages = [
                ...messages,
                {
                    role: 'system',
                    content: 'Información guardada correctamente. Continúa la conversación de forma natural.'
                }
            ];
            try {
                const response = yield this.callOpenRouter(finalMessages);
                return ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || 'Información guardada. ¿En qué más puedo ayudarte?';
            }
            catch (error) {
                console.error('[ChatbotService] Error generando respuesta final:', error);
                return 'Perfecto, he guardado tu información. ¿Hay algo más que necesites para tu vehículo?';
            }
        });
    }
    /**
     * Determinar siguiente estado basado en información recopilada
     */
    determineNextStatus(clientInfo) {
        const hasBasicInfo = !!(clientInfo.nombre && clientInfo.necesidad);
        const hasVehicleInfo = !!(clientInfo.marca && clientInfo.modelo && clientInfo.año);
        if (hasBasicInfo && hasVehicleInfo) {
            return 'data_complete';
        }
        else if (hasBasicInfo) {
            return 'collecting_brand';
        }
        else if (clientInfo.necesidad) {
            return 'collecting_name';
        }
        else {
            return 'collecting_part';
        }
    }
    /**
     * Limpiar sesiones expiradas
     */
    cleanupExpiredSessions() {
        const now = new Date().getTime();
        let cleaned = 0;
        for (const [id, conversation] of this.conversations.entries()) {
            if (now - conversation.lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
                this.conversations.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`[ChatbotService] Limpiadas ${cleaned} sesiones expiradas`);
        }
    }
    /**
     * Genera un resumen inteligente de la conversación usando IA
     */
    generateConversationSummary(conversationId, messages) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            try {
                console.log(`[ChatbotService] 📝 Generando resumen para conversación: ${conversationId}`);
                // 1. Formatear historial de mensajes para el prompt
                const conversationHistory = messages.map(msg => {
                    const timestamp = new Date(msg.timestamp).toLocaleString('es-MX');
                    const role = msg.role === 'user' ? 'Cliente' : 'Asistente';
                    return `[${timestamp}] ${role}: ${msg.content}`;
                }).join('\n');
                // 2. Crear prompt especializado para resumen
                const summaryPrompt = `Analiza la siguiente conversación de WhatsApp entre un cliente y un asistente de refacciones automotrices.

CONVERSACIÓN:
${conversationHistory}

INSTRUCCIONES:
1. Genera un resumen conciso de la conversación en 2-3 oraciones.
2. Extrae la información clave del cliente y su necesidad.
3. Responde en formato JSON con la estructura especificada.

FORMATO DE RESPUESTA JSON:
{
  "summary": "Resumen breve de la conversación",
  "keyPoints": {
    "clientName": "Nombre del cliente si se mencionó",
    "product": "Producto o refacción solicitada",
    "vehicle": {
      "brand": "Marca del vehículo",
      "model": "Modelo del vehículo", 
      "year": año_del_vehículo,
      "engine": "Motor/Cilindrada"
    },
    "location": {
      "postalCode": "Código postal",
      "city": "Ciudad"
    },
    "status": "Estado actual de la conversación",
    "nextAction": "Próxima acción recomendada",
    "estimatedValue": "Valor estimado si se mencionó"
  }
}

EJEMPLO:
{
  "summary": "Cliente Carlos solicita pastillas de freno para su Toyota Corolla 2018 1.8L. Se recopiló información básica y está listo para cotización.",
  "keyPoints": {
    "clientName": "Carlos",
    "product": "Pastillas de freno",
    "vehicle": {
      "brand": "Toyota",
      "model": "Corolla",
      "year": 2018,
      "engine": "1.8L"
    },
    "location": {
      "postalCode": "06100"
    },
    "status": "Información recopilada",
    "nextAction": "Generar cotización"
  }
}`;
                // 3. Llamar a OpenRouter para generar el resumen
                const response = yield this.callOpenRouter([
                    {
                        role: 'system',
                        content: 'Eres un asistente especializado en generar resúmenes de conversaciones de ventas de refacciones automotrices. Siempre respondes en formato JSON válido.'
                    },
                    {
                        role: 'user',
                        content: summaryPrompt
                    }
                ], undefined, {
                    temperature: 0.3, // Baja temperatura para respuestas más consistentes
                    maxTokens: 800
                });
                // 4. Parsear respuesta JSON
                let summaryData;
                try {
                    const responseText = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '{}';
                    // Extraer JSON si viene con texto adicional
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    const jsonText = jsonMatch ? jsonMatch[0] : responseText;
                    summaryData = JSON.parse(jsonText);
                }
                catch (parseError) {
                    console.error('[ChatbotService] Error parseando JSON del resumen:', parseError);
                    // Fallback: generar resumen básico
                    summaryData = {
                        summary: `Conversación con ${messages.length} mensajes. Última actividad: ${new Date().toLocaleString('es-MX')}`,
                        keyPoints: {
                            status: 'En proceso',
                            nextAction: 'Revisar conversación manualmente'
                        }
                    };
                }
                // 5. Validar y completar datos faltantes
                const result = {
                    text: summaryData.summary || 'Resumen no disponible',
                    keyPoints: {
                        clientName: (_d = summaryData.keyPoints) === null || _d === void 0 ? void 0 : _d.clientName,
                        product: (_e = summaryData.keyPoints) === null || _e === void 0 ? void 0 : _e.product,
                        vehicle: ((_f = summaryData.keyPoints) === null || _f === void 0 ? void 0 : _f.vehicle) || {},
                        location: ((_g = summaryData.keyPoints) === null || _g === void 0 ? void 0 : _g.location) || {},
                        status: ((_h = summaryData.keyPoints) === null || _h === void 0 ? void 0 : _h.status) || 'En proceso',
                        nextAction: ((_j = summaryData.keyPoints) === null || _j === void 0 ? void 0 : _j.nextAction) || 'Continuar conversación',
                        estimatedValue: (_k = summaryData.keyPoints) === null || _k === void 0 ? void 0 : _k.estimatedValue
                    }
                };
                console.log(`[ChatbotService] ✅ Resumen generado exitosamente:`, {
                    conversationId,
                    summaryLength: result.text.length,
                    hasClientName: !!result.keyPoints.clientName,
                    hasProduct: !!result.keyPoints.product,
                    hasVehicle: Object.keys(result.keyPoints.vehicle).length > 0
                });
                return result;
            }
            catch (error) {
                console.error('[ChatbotService] Error generando resumen:', error);
                // Fallback en caso de error
                return {
                    text: `Error generando resumen automático. Conversación con ${messages.length} mensajes del ${new Date().toLocaleDateString('es-MX')}.`,
                    keyPoints: {
                        status: 'Error en resumen',
                        nextAction: 'Revisar conversación manualmente'
                    }
                };
            }
        });
    }
    /**
     * Obtener estadísticas del chatbot
     */
    getStats() {
        const conversations = Array.from(this.conversations.values());
        const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
        return {
            activeConversations: conversations.length,
            totalMessages,
            avgMessagesPerConversation: conversations.length > 0 ? totalMessages / conversations.length : 0
        };
    }
    /**
     * Obtener conversación por teléfono
     */
    getConversationByPhone(phoneNumber) {
        return this.conversations.get(`wa-${phoneNumber}`);
    }
    /**
     * Enviar mensaje por WhatsApp con chatbot
     */
    sendChatbotMessage(phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield whatsapp_service_1.whatsappService.sendMessage({
                    to: phoneNumber,
                    message: message
                });
                return {
                    success: result.success,
                    messageId: result.messageId,
                    error: result.error
                };
            }
            catch (error) {
                console.error('[ChatbotService] Error enviando mensaje:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Guardar mensaje del chatbot en la base de datos cuando se envía efectivamente
     * Este método se llama DESPUÉS de que el mensaje se envía por WhatsApp
     */
    saveChatbotMessageToDatabase(phoneNumber, message, whatsappMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener conversación de la base de datos
                const dbResult = yield database_service_1.databaseService.getOrCreateConversationByPhone(phoneNumber);
                // Determinar el ID de conversación para Supabase
                let conversationId;
                if (dbResult) {
                    conversationId = dbResult.id;
                }
                if (!conversationId) {
                    console.warn(`[ChatbotService] No se pudo obtener conversationId para ${phoneNumber}`);
                    return;
                }
                // Guardar mensaje usando el servicio híbrido con WhatsApp Message ID
                const result = yield database_service_1.databaseService.createChatbotMessage({
                    conversationId,
                    contactPhone: phoneNumber,
                    senderType: message.role === 'user' ? 'user' : 'bot',
                    content: message.content,
                    messageType: 'text',
                    whatsappMessageId: whatsappMessageId, // IMPORTANTE: Incluir el WhatsApp Message ID
                    metadata: {
                        chatbotId: message.id,
                        functionCalled: message.functionCalled,
                        clientData: message.clientData,
                        timestamp: message.timestamp.toISOString() // Agregar timestamp real
                    }
                });
                if (result.success) {
                    console.log(`[ChatbotService] Mensaje del chatbot guardado en DB: ${result.messageId} con WhatsApp ID: ${whatsappMessageId}`);
                }
                else {
                    console.warn(`[ChatbotService] No se pudo guardar mensaje del chatbot en DB para ${phoneNumber}`);
                }
            }
            catch (error) {
                console.error('[ChatbotService] Error guardando mensaje del chatbot en DB:', error);
            }
        });
    }
    /**
     * Guardar mensaje en la base de datos (MÉTODO DEPRECADO - Solo para compatibilidad)
     * @deprecated Usar saveChatbotMessageToDatabase en su lugar
     */
    saveMessageToDatabase(phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('[ChatbotService] saveMessageToDatabase está deprecado. Usar saveChatbotMessageToDatabase en su lugar.');
            // Este método ya no se usa, pero lo mantenemos por compatibilidad
        });
    }
    /**
     * Guardar resumen de conversación en la base de datos
     */
    saveConversationSummary(conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Obtener conversación de la base de datos
                const dbResult = yield database_service_1.databaseService.getOrCreateConversationByPhone(conversation.phoneNumber);
                // Determinar el ID de conversación para Supabase
                let conversationId;
                if (dbResult) {
                    conversationId = dbResult.id;
                }
                if (!conversationId) {
                    console.warn(`[ChatbotService] No se pudo obtener conversationId para resumen de ${conversation.phoneNumber}`);
                    return;
                }
                // Crear datos del resumen
                const summaryData = {
                    conversationId: conversation.conversationId,
                    phoneNumber: conversation.phoneNumber,
                    status: conversation.status,
                    clientInfo: conversation.clientInfo,
                    messageCount: conversation.messages.length,
                    lastActivity: conversation.lastActivity,
                    createdAt: conversation.createdAt
                };
                // Guardar resumen usando el servicio híbrido
                const result = yield database_service_1.databaseService.saveChatbotConversationSummary(conversationId, summaryData, 'gemini-2.5-flash-chatbot');
                if (result.success) {
                    console.log(`[ChatbotService] Resumen guardado en DB: ${result.summaryId}`);
                }
                else {
                    console.warn(`[ChatbotService] No se pudo guardar resumen en DB para ${conversation.phoneNumber}`);
                }
            }
            catch (error) {
                console.error('[ChatbotService] Error guardando resumen en DB:', error);
            }
        });
    }
}
exports.ChatbotService = ChatbotService;
// Instancia singleton
exports.chatbotService = new ChatbotService();
