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
exports.chatbotService = exports.ChatbotService = void 0;
/**
 * Servicio de Chatbot para Backend
 * Adaptado desde la implementación frontend para integrar con WhatsApp
 */
const axios_1 = __importDefault(require("axios"));
const whatsapp_service_1 = require("./whatsapp.service");
class ChatbotService {
    constructor() {
        this.conversations = new Map();
        this.SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
        this.openRouterConfig = {
            baseURL: 'https://openrouter.ai/api/v1',
            model: 'google/gemini-2.5-flash-lite-preview-06-17',
            timeout: 30000
        };
        // Limpieza automática de sesiones expiradas
        setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Cada 5 minutos
    }
    /**
     * Procesar mensaje entrante de WhatsApp y generar respuesta con IA
     */
    processWhatsAppMessage(phoneNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[ChatbotService] Procesando mensaje de ${phoneNumber}: ${message.substring(0, 50)}...`);
                // Obtener o crear conversación
                const conversationId = `wa-${phoneNumber}`;
                let conversation = this.conversations.get(conversationId);
                if (!conversation) {
                    conversation = yield this.startConversation(conversationId, phoneNumber);
                }
                // Actualizar actividad
                conversation.lastActivity = new Date();
                // Agregar mensaje del usuario
                const userMsg = {
                    id: `msg-${Date.now()}-user`,
                    role: 'user',
                    content: message,
                    timestamp: new Date()
                };
                conversation.messages.push(userMsg);
                // Generar respuesta con IA
                const aiResponse = yield this.generateAIResponse(conversation);
                // Agregar respuesta del asistente
                const assistantMsg = {
                    id: `msg-${Date.now()}-assistant`,
                    role: 'assistant',
                    content: aiResponse.content,
                    timestamp: new Date(),
                    functionCalled: aiResponse.functionCalled,
                    clientData: conversation.clientInfo
                };
                conversation.messages.push(assistantMsg);
                // Actualizar estado de la conversación si se procesó datos
                if (aiResponse.updatedClientInfo) {
                    conversation.clientInfo = Object.assign(Object.assign({}, conversation.clientInfo), aiResponse.updatedClientInfo);
                    conversation.status = this.determineNextStatus(conversation.clientInfo);
                }
                // Guardar conversación actualizada
                this.conversations.set(conversationId, conversation);
                console.log(`[ChatbotService] Respuesta generada: ${aiResponse.content.substring(0, 100)}...`);
                return {
                    response: aiResponse.content,
                    shouldSend: true,
                    conversationState: conversation
                };
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
            const welcomeMessage = "¡Hola! 👋 Soy tu asistente especializado en repuestos automotrices de Embler. Te ayudo a encontrar exactamente lo que necesitas para tu vehículo. ¿En qué puedo ayudarte hoy?";
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
    callOpenRouter(messages, tools) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new Error('OpenRouter API key no configurada. Agregar OPENROUTER_API_KEY al archivo .env');
            }
            const payload = {
                model: this.openRouterConfig.model,
                messages: messages,
                tools: tools || undefined,
                tool_choice: tools ? 'auto' : undefined,
                temperature: 0.7,
                max_tokens: 1000,
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
                finishReason: (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.finish_reason
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
            content: `Eres un especialista en refacciones automotrices que trabaja para Embler en la Ciudad de México. Eres conversacional e inteligente - extraes información del contexto y NO repites preguntas innecesarias. Mantén un tono informal y amigable.

INFORMACIÓN QUE NECESITAS:
- Nombre del cliente
- Qué refacción necesita  
- Marca, modelo y año del vehículo
- Litraje del motor (si es relevante)
- Número de serie del motor (solo si es necesario)

COMPORTAMIENTO INTELIGENTE:
✅ SIEMPRE revisa mensajes anteriores antes de preguntar algo
✅ Extrae múltiples datos de una respuesta cuando sea posible
✅ Si el cliente dice "Tengo un Toyota Corolla 2018", ya tienes marca, modelo y año
✅ Solo pregunta lo que realmente falta
✅ Si ya tienes suficiente info, procede a cotizar

CÓMO HABLAS:
✅ Conversacional: "Perfecto, ya tengo los datos del Corolla 2018. ¿Cuál es tu nombre?"
✅ Contextual: "Entendido, filtro de aceite para tu Corolla. ¿De qué año es?"
✅ Inteligente: Si mencionan "mi Toyota" y antes dijeron el modelo, no preguntes la marca de nuevo

❌ NO seas un cuestionario robótico
❌ NO hagas preguntas que ya se respondieron
❌ NO ignores el contexto de la conversación

INFORMACIÓN ACTUAL DEL CLIENTE:
${JSON.stringify(conversation.clientInfo, null, 2)}

ESTADO ACTUAL: ${conversation.status}

En la conversación sé natural e inteligente.`
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
}
exports.ChatbotService = ChatbotService;
// Instancia singleton
exports.chatbotService = new ChatbotService();
