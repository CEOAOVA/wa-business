"use strict";
/**
 * Motor de conversación avanzado para WhatsApp Business
 * Integra memoria, prompts dinámicos y funciones LLM para conversaciones inteligentes
 */
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
exports.advancedConversationEngine = exports.AdvancedConversationEngine = void 0;
const openai_client_1 = require("../../config/openai-client");
const function_handler_1 = require("../llm/function-handler");
const concepts_service_1 = require("../concepts-service");
const conversation_memory_1 = require("./conversation-memory");
const config_1 = require("../../config");
const functionHandler = new function_handler_1.FunctionCallHandler();
const dynamic_prompt_generator_1 = require("./dynamic-prompt-generator");
class AdvancedConversationEngine {
    constructor(config) {
        this.activeConversations = new Map();
        // NUEVO: Configuración centralizada de LLM
        this.llmConfig = (0, config_1.getConfig)().llm;
        this.config = Object.assign({ maxContextLength: 4000, maxFunctionCalls: 5, timeoutMs: this.llmConfig.timeout, retryAttempts: 3, enableMemoryLearning: true, enableDynamicPrompts: true }, config);
    }
    /**
     * Procesa un mensaje completo con toda la funcionalidad avanzada
     */
    processConversation(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                console.log(`[AdvancedConversationEngine] Procesando conversación ${request.conversationId}`);
                // 1. Inicializar/obtener memoria conversacional
                const memory = this.initializeOrGetMemory(request);
                // 2. Procesar mensaje del usuario
                const processedMessage = yield this.preprocessMessage(request.message);
                // 3. Detectar intent y extraer entidades
                const { intent, entities } = yield this.extractIntentAndEntities(processedMessage, memory);
                // 4. Actualizar memoria con nueva información
                this.updateConversationMemory(request.conversationId, {
                    query: processedMessage,
                    intent,
                    entities
                });
                // 5. Generar contexto para el LLM
                const promptContext = this.generatePromptContext(request, memory, intent, entities);
                // 6. Generar respuesta usando LLM
                const llmResponse = yield this.generateLLMResponse(promptContext);
                // 7. Procesar funciones si es necesario
                const functionResults = yield this.handleFunctionCalls(llmResponse, request.conversationId);
                // 8. Generar respuesta final
                const finalResponse = yield this.generateFinalResponse(llmResponse, functionResults, promptContext);
                // 9. Actualizar memoria con respuesta
                this.updateConversationMemory(request.conversationId, {
                    currentTopic: intent,
                    function: functionResults.length > 0 ? functionResults[0].functionName : undefined
                });
                // 10. Analizar y aprender patrones
                if (this.config.enableMemoryLearning) {
                    yield this.learnFromConversation(request.conversationId, request, finalResponse);
                }
                const responseTime = Date.now() - startTime;
                return {
                    response: finalResponse,
                    intent,
                    entities,
                    functionCalls: functionResults,
                    suggestions: this.generateSuggestions(memory, intent),
                    conversationState: this.getConversationState(memory),
                    metadata: {
                        responseTime,
                        functionsCalled: functionResults.length,
                        confidenceScore: this.calculateConfidenceScore(intent, entities, functionResults),
                        promptUsed: this.getPromptTypeUsed(intent)
                    }
                };
            }
            catch (error) {
                console.error(`[AdvancedConversationEngine] Error procesando conversación:`, error);
                return this.generateErrorResponse(request, error);
            }
        });
    }
    /**
     * Inicializa o obtiene memoria conversacional
     */
    initializeOrGetMemory(request) {
        var _a;
        let memory = conversation_memory_1.conversationMemoryManager.getMemory(request.conversationId);
        if (!memory) {
            memory = conversation_memory_1.conversationMemoryManager.initializeMemory(request.conversationId, request.userId, request.phoneNumber, request.pointOfSaleId);
        }
        // Actualizar última actividad
        this.activeConversations.set(request.conversationId, {
            lastActivity: new Date(),
            requestCount: (((_a = this.activeConversations.get(request.conversationId)) === null || _a === void 0 ? void 0 : _a.requestCount) || 0) + 1
        });
        return memory;
    }
    /**
     * Preprocesa el mensaje del usuario
     */
    preprocessMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            // Normalizar texto
            let processed = message.toLowerCase().trim();
            // Convertir términos coloquiales mexicanos
            processed = concepts_service_1.conceptsService.normalizeSearchTerm(processed);
            // Limpiar caracteres especiales manteniendo acentos
            processed = processed.replace(/[^\w\sáéíóúüñ]/g, ' ').replace(/\s+/g, ' ').trim();
            return processed;
        });
    }
    /**
     * Extrae intent y entidades del mensaje
     */
    extractIntentAndEntities(message, memory) {
        return __awaiter(this, void 0, void 0, function* () {
            const entities = new Map();
            // Extraer entidades básicas
            const brandRegex = /\b(nissan|toyota|honda|ford|chevrolet|volkswagen|hyundai|kia|mazda|subaru|bmw|mercedes|audi)\b/i;
            const brandMatch = message.match(brandRegex);
            if (brandMatch) {
                entities.set('brand', brandMatch[0].toLowerCase());
            }
            const yearRegex = /\b(19|20)\d{2}\b/g;
            const yearMatch = message.match(yearRegex);
            if (yearMatch) {
                entities.set('year', parseInt(yearMatch[0]));
            }
            const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/i;
            const vinMatch = message.match(vinRegex);
            if (vinMatch) {
                entities.set('vin', vinMatch[0]);
            }
            // Extraer datos del auto del mensaje
            const carData = this.extractCarDataFromMessage(message);
            if (carData.marca)
                entities.set('car_marca', carData.marca);
            if (carData.modelo)
                entities.set('car_modelo', carData.modelo);
            if (carData.año)
                entities.set('car_año', carData.año);
            if (carData.litraje)
                entities.set('car_litraje', carData.litraje);
            // Extraer términos de productos
            const productTerms = this.extractProductTerms(message);
            if (productTerms.length > 0) {
                entities.set('product_terms', productTerms);
            }
            // Detectar intent basado en patrones
            let intent = 'general_inquiry';
            // MEJORA: Solo detectar búsqueda de productos si hay TANTO pieza COMO datos del auto
            const hasProductTerms = productTerms.length > 0;
            const hasCarData = carData.marca || carData.modelo || carData.año;
            const hasProductSearchPattern = this.hasProductSearchPattern(message);
            // Solo buscar productos si hay términos de producto Y datos del auto
            if (hasProductTerms && hasCarData && hasProductSearchPattern) {
                intent = 'search_product';
                console.log(`[ConversationEngine] ✅ Intent de búsqueda detectado - Pieza: ${productTerms.join(', ')}, Auto: ${carData.marca} ${carData.modelo} ${carData.año}`);
            }
            else if (hasProductTerms && !hasCarData) {
                // Si hay pieza pero no datos del auto, preguntar por el auto
                intent = 'request_car_info';
                console.log(`[ConversationEngine] ⚠️ Pieza detectada pero faltan datos del auto - Pieza: ${productTerms.join(', ')}`);
            }
            else if (!hasProductTerms && hasCarData) {
                // Si hay datos del auto pero no pieza, preguntar qué pieza busca
                intent = 'request_product_info';
                console.log(`[ConversationEngine] ⚠️ Datos del auto detectados pero falta pieza - Auto: ${carData.marca} ${carData.modelo} ${carData.año}`);
            }
            else if (message.includes('precio') || message.includes('costo') || message.includes('cuánto')) {
                intent = 'price_inquiry';
            }
            else if (message.includes('comprar') || message.includes('ticket') || message.includes('compra')) {
                intent = 'purchase_intent';
            }
            else if (message.includes('inventario') || message.includes('stock') || message.includes('tienes')) {
                intent = 'inventory_check';
            }
            else if (message.includes('vin') || vinMatch) {
                intent = 'vin_lookup';
            }
            else if (message.includes('ayuda') || message.includes('soporte') || message.includes('asesor')) {
                intent = 'support_request';
            }
            else if (message.includes('envío') || message.includes('entrega') || message.includes('domicilio')) {
                intent = 'shipping_inquiry';
            }
            // Considerar contexto histórico
            const recentQueries = memory.shortTermMemory.recentQueries;
            if (recentQueries.length > 0) {
                const lastQuery = recentQueries[recentQueries.length - 1];
                if (lastQuery.includes('inventario') && intent === 'general_inquiry') {
                    intent = 'inventory_followup';
                }
                // Si el último mensaje fue sobre productos, mantener el contexto
                if (lastQuery.includes('producto') || lastQuery.includes('buscar') && intent === 'general_inquiry') {
                    intent = 'product_search_followup';
                }
            }
            return { intent, entities };
        });
    }
    /**
     * Extraer datos del auto del mensaje
     */
    extractCarDataFromMessage(message) {
        const carData = {};
        // Extraer marca
        const brandRegex = /\b(nissan|toyota|honda|ford|chevrolet|volkswagen|hyundai|kia|mazda|subaru|bmw|mercedes|audi)\b/i;
        const brandMatch = message.match(brandRegex);
        if (brandMatch) {
            carData.marca = brandMatch[0].toLowerCase();
        }
        // Extraer año
        const yearRegex = /\b(19|20)\d{2}\b/g;
        const yearMatch = message.match(yearRegex);
        if (yearMatch) {
            carData.año = parseInt(yearMatch[0]);
        }
        // Extraer modelo (patrones comunes)
        const modelPatterns = [
            /\b(corolla|camry|civic|accord|focus|fusion|jetta|golf|sentra|altima)\b/i,
            /\b(x5|x3|e90|e46|w203|c200|c300|a3|a4|q3|q5)\b/i
        ];
        for (const pattern of modelPatterns) {
            const modelMatch = message.match(pattern);
            if (modelMatch) {
                carData.modelo = modelMatch[0].toLowerCase();
                break;
            }
        }
        // Extraer litraje
        const engineRegex = /\b(\d+\.?\d*)\s*(l|litros?|cc|cilindros?)\b/i;
        const engineMatch = message.match(engineRegex);
        if (engineMatch) {
            carData.litraje = engineMatch[0];
        }
        return carData;
    }
    /**
     * Extraer términos de productos del mensaje
     */
    extractProductTerms(message) {
        const productTerms = [];
        const lowerMessage = message.toLowerCase();
        // Lista de términos de productos comunes
        const commonProductTerms = [
            'balatas', 'frenos', 'filtro', 'aceite', 'bujías', 'amortiguadores',
            'suspensión', 'dirección', 'transmisión', 'motor', 'batería',
            'correa', 'bomba', 'radiador', 'silenciador', 'luces', 'llantas',
            'neumáticos', 'pastillas', 'zapatas', 'embrague', 'diferencial'
        ];
        for (const term of commonProductTerms) {
            if (lowerMessage.includes(term)) {
                productTerms.push(term);
            }
        }
        return productTerms;
    }
    /**
     * Verifica si el mensaje tiene patrones de búsqueda de productos
     */
    hasProductSearchPattern(message) {
        const productSearchPatterns = [
            /\b(buscar|encontrar|necesito|quiero|busco|tengo|requiero)\b/i,
            /\b(pieza|repuesto|refacción|parte|componente)\b/i,
            /\b(para mi|de mi|del|de la)\b/i
        ];
        return productSearchPatterns.some(pattern => pattern.test(message));
    }
    /**
     * Actualiza memoria conversacional
     */
    updateConversationMemory(conversationId, updates) {
        conversation_memory_1.conversationMemoryManager.updateMemory(conversationId, updates);
    }
    /**
     * Genera contexto para el prompt
     */
    generatePromptContext(request, memory, intent, entities) {
        return {
            conversationMemory: memory,
            currentMessage: request.message,
            intent,
            entities,
            availableFunctions: this.getAvailableFunctions(intent),
            businessContext: {
                pointOfSaleId: request.pointOfSaleId,
                specialOffers: [],
                inventory: {
                    lastUpdate: new Date().toISOString()
                }
            }
        };
    }
    /**
     * Obtiene funciones disponibles según el intent
     */
    getAvailableFunctions(intent) {
        const baseFunctions = ['solicitarAsesor'];
        switch (intent) {
            case 'search_product':
            case 'product_search_followup':
                return [
                    ...baseFunctions,
                    'buscarProductoPorTermino',
                    'confirmarProductoSeleccionado',
                    'obtenerDetallesProducto',
                    'sugerirAlternativas',
                    'recopilarDatosCliente'
                ];
            case 'request_car_info':
                return [
                    ...baseFunctions,
                    'recopilarDatosCliente'
                ];
            case 'request_product_info':
                return [
                    ...baseFunctions,
                    'recopilarDatosCliente'
                ];
            case 'inventory_check':
                return [...baseFunctions, 'consultarInventario', 'buscarYConsultarInventario', 'consultarInventarioGeneral'];
            case 'vin_lookup':
                return [...baseFunctions, 'buscarPorVin', 'consultarInventario'];
            case 'purchase_intent':
                return [
                    ...baseFunctions,
                    'generarTicket',
                    'confirmarCompra',
                    'consultarInventario',
                    'buscarProductoPorTermino'
                ];
            case 'shipping_inquiry':
                return [...baseFunctions, 'procesarEnvio'];
            case 'price_inquiry':
                return [
                    ...baseFunctions,
                    'consultarInventario',
                    'buscarYConsultarInventario',
                    'buscarProductoPorTermino'
                ];
            default:
                return [
                    ...baseFunctions,
                    'consultarInventario',
                    'buscarYConsultarInventario',
                    'buscarProductoPorTermino',
                    'recopilarDatosCliente'
                ];
        }
    }
    /**
     * Genera respuesta usando LLM
     */
    generateLLMResponse(context) {
        return __awaiter(this, void 0, void 0, function* () {
            // Determinar si usar prompt de continuidad
            const memory = context.conversationMemory;
            const conversationLength = memory.metadata.conversationLength;
            let prompt;
            if (this.config.enableDynamicPrompts) {
                if (conversationLength > 1) {
                    // Usar prompt de continuidad para conversaciones en curso
                    prompt = dynamic_prompt_generator_1.dynamicPromptGenerator.generateContinuationPrompt(context);
                }
                else {
                    // Usar prompt normal para primera interacción
                    prompt = dynamic_prompt_generator_1.dynamicPromptGenerator.generatePrompt('main', context);
                }
            }
            else {
                prompt = this.generateStaticPrompt(context);
            }
            const functions = functionHandler.getFunctionDefinitions();
            const availableFunctions = functions.filter(f => context.availableFunctions.includes(f.name));
            const response = yield openai_client_1.openRouterClient.createChatCompletion({
                model: this.llmConfig.openRouterModel,
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: context.currentMessage }
                ],
                functions: availableFunctions,
                function_call: "auto",
                temperature: this.llmConfig.defaultTemperature,
                max_tokens: this.llmConfig.defaultMaxTokens
            });
            return response.choices[0].message;
        });
    }
    /**
     * Genera prompt estático de respaldo
     */
    generateStaticPrompt(context) {
        const memory = context.conversationMemory;
        const conversationLength = memory.metadata.conversationLength;
        let prompt = `Eres Embler, un asistente inteligente de refacciones automotrices para México.
Trabajas para AOVA, una empresa líder en distribución de refacciones.

🎯 OBJETIVO: Mantener conversaciones naturales y contextuales.

📋 REGLAS DE CONVERSACIÓN NATURAL:
- Si es primera interacción: Saluda apropiadamente
- Si es conversación en curso: Usa referencias y mantén continuidad
- NO repitas saludos si ya saludaste en la sesión
- Usa referencias como "Como mencionabas antes..." o "Continuemos con..."
- Mantén el contexto de la conversación anterior

CAPACIDADES:
- Consultar inventario en tiempo real
- Generar tickets de compra
- Buscar por número VIN
- Procesar envíos
- Conectar con asesores humanos

CONTEXTO ACTUAL:
- Intención: ${context.intent}
- Mensaje: ${context.currentMessage}
- Funciones disponibles: ${context.availableFunctions.join(', ')}
- Longitud de conversación: ${conversationLength}`;
        // Agregar instrucciones específicas para continuidad
        if (conversationLength > 1) {
            prompt += '\n\nINSTRUCCIONES DE CONTINUIDAD:\n';
            prompt += '- NO saludes nuevamente\n';
            prompt += '- Usa referencias a la conversación anterior\n';
            prompt += '- Mantén el contexto de la conversación\n';
            prompt += '- Haz transiciones naturales entre temas\n';
        }
        prompt += '\n\nResponde de manera profesional, amigable y contextual.';
        return prompt;
    }
    /**
     * Maneja llamadas a funciones
     */
    handleFunctionCalls(llmResponse, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const functionResults = [];
            if (llmResponse.function_call) {
                try {
                    const result = yield functionHandler.processFunctionCall(llmResponse.function_call, [], {
                        model: this.llmConfig.openRouterModel,
                        messages: []
                    }, { pointOfSaleId: conversationId });
                    functionResults.push(result);
                }
                catch (error) {
                    console.error(`[AdvancedConversationEngine] Error en función:`, error);
                    functionResults.push({
                        functionName: llmResponse.function_call.name,
                        error: 'Error ejecutando función',
                        success: false
                    });
                }
            }
            return functionResults;
        });
    }
    /**
     * Genera respuesta final
     */
    generateFinalResponse(llmResponse, functionResults, context) {
        return __awaiter(this, void 0, void 0, function* () {
            let finalResponse = llmResponse.content || '';
            // Si hay resultados de funciones, integrarlos en la respuesta
            if (functionResults.length > 0) {
                const functionData = functionResults[0];
                if (functionData.success && functionData.data) {
                    // Generar respuesta contextual con los datos de la función
                    const contextualPrompt = `
        Basándote en estos datos de función, genera una respuesta natural y útil:
        
        Función ejecutada: ${functionData.functionName}
        Datos: ${JSON.stringify(functionData.data)}
        Contexto: ${context.currentMessage}
        
        Respuesta original: ${finalResponse}
        
        Genera una respuesta mejorada que integre los datos de manera natural.`;
                    try {
                        const enhancedResponse = yield openai_client_1.openRouterClient.createChatCompletion({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: contextualPrompt },
                                { role: "user", content: "Genera la respuesta mejorada" }
                            ],
                            temperature: 0.7,
                            max_tokens: 500
                        });
                        finalResponse = enhancedResponse.choices[0].message.content || finalResponse;
                    }
                    catch (error) {
                        console.error(`[AdvancedConversationEngine] Error generando respuesta final:`, error);
                    }
                }
            }
            return finalResponse;
        });
    }
    /**
     * Aprende de la conversación
     */
    learnFromConversation(conversationId, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            // Aprender preferencias del usuario
            const message = request.message.toLowerCase();
            if (message.includes('precio') || message.includes('barato') || message.includes('económico')) {
                conversation_memory_1.conversationMemoryManager.learnPreference(conversationId, 'price_conscious', true);
            }
            if (message.includes('urgente') || message.includes('rápido') || message.includes('pronto')) {
                conversation_memory_1.conversationMemoryManager.learnPreference(conversationId, 'urgent_customer', true);
            }
            // Extraer información del vehículo mencionado
            const brandMatch = message.match(/\b(nissan|toyota|honda|ford|chevrolet|volkswagen)\b/i);
            if (brandMatch) {
                conversation_memory_1.conversationMemoryManager.learnPreference(conversationId, 'preferred_brand', brandMatch[0]);
            }
        });
    }
    /**
     * Genera sugerencias para el usuario
     */
    generateSuggestions(memory, intent) {
        const suggestions = [];
        switch (intent) {
            case 'search_product':
                suggestions.push('¿Necesitas ayuda para encontrar la refacción exacta?');
                suggestions.push('¿Tienes el número VIN de tu vehículo?');
                break;
            case 'inventory_check':
                suggestions.push('¿Te gustaría ver opciones similares?');
                suggestions.push('¿Necesitas información sobre disponibilidad?');
                break;
            case 'price_inquiry':
                suggestions.push('¿Te interesa conocer opciones de pago?');
                suggestions.push('¿Quieres comparar con otras marcas?');
                break;
            case 'purchase_intent':
                suggestions.push('¿Necesitas ayuda con el proceso de compra?');
                suggestions.push('¿Te interesa el envío a domicilio?');
                break;
        }
        return suggestions;
    }
    /**
     * Obtiene estado actual de la conversación
     */
    getConversationState(memory) {
        const currentTopic = memory.shortTermMemory.currentTopic;
        const pendingActions = memory.workingMemory.pendingActions;
        return {
            phase: currentTopic || 'initial',
            canProgress: pendingActions.length === 0,
            nextSteps: pendingActions.length > 0 ? pendingActions : ['continue_conversation']
        };
    }
    /**
     * Calcula puntuación de confianza
     */
    calculateConfidenceScore(intent, entities, functionResults) {
        let score = 0.5; // Base score
        // Boost por intent específico
        if (intent !== 'general_inquiry')
            score += 0.2;
        // Boost por entidades extraídas
        score += entities.size * 0.1;
        // Boost por funciones exitosas
        const successfulFunctions = functionResults.filter(f => f.success);
        score += successfulFunctions.length * 0.15;
        return Math.min(score, 1.0);
    }
    /**
     * Obtiene tipo de prompt usado
     */
    getPromptTypeUsed(intent) {
        switch (intent) {
            case 'search_product':
            case 'inventory_check':
                return 'inventory_search';
            case 'purchase_intent':
                return 'ticket_generation';
            default:
                return 'main';
        }
    }
    /**
     * Genera respuesta de error
     */
    generateErrorResponse(request, error) {
        return {
            response: "Disculpa, he tenido un problema técnico. ¿Podrías intentar de nuevo o te conecto con un asesor?",
            intent: 'error',
            entities: new Map(),
            functionCalls: [],
            suggestions: ['Reintentar', 'Hablar con asesor'],
            conversationState: {
                phase: 'error',
                canProgress: false,
                nextSteps: ['retry', 'escalate']
            },
            metadata: {
                responseTime: 0,
                functionsCalled: 0,
                confidenceScore: 0,
                promptUsed: 'error_handling'
            }
        };
    }
    /**
     * Limpia conversaciones inactivas
     */
    cleanupInactiveConversations() {
        return __awaiter(this, arguments, void 0, function* (maxAgeMinutes = 60) {
            const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
            for (const [conversationId, activity] of this.activeConversations.entries()) {
                if (activity.lastActivity < cutoffTime) {
                    this.activeConversations.delete(conversationId);
                    conversation_memory_1.conversationMemoryManager.finalizeConversation(conversationId, 'abandoned');
                }
            }
            // Limpiar memoria antigua
            conversation_memory_1.conversationMemoryManager.cleanupOldMemory(24);
        });
    }
    /**
     * Obtiene estadísticas del motor
     */
    getEngineStats() {
        return {
            activeConversations: this.activeConversations.size,
            totalProcessed: Array.from(this.activeConversations.values())
                .reduce((sum, activity) => sum + activity.requestCount, 0),
            config: this.config,
            uptime: process.uptime()
        };
    }
}
exports.AdvancedConversationEngine = AdvancedConversationEngine;
// Exportar instancia singleton
exports.advancedConversationEngine = new AdvancedConversationEngine();
