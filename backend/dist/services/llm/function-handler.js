"use strict";
/**
 * Function Call Handler para WhatsApp Backend
 * Procesa function calls y coordina con el OpenRouter client
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
exports.functionCallHandler = exports.FunctionCallHandler = void 0;
const openai_client_1 = require("./openai-client");
const function_service_1 = require("./function-service");
class FunctionCallHandler {
    constructor() {
        this.functionService = new function_service_1.FunctionService();
        this.openRouterClient = new openai_client_1.OpenRouterClient();
    }
    /**
     * Procesa una llamada a función LLM
     */
    processFunctionCall(functionCallInfo, messages, options, context) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[FunctionCallHandler] Procesando función: ${functionCallInfo.name}`);
            try {
                // Parse argumentos de la función
                let functionArgs;
                try {
                    functionArgs = JSON.parse(functionCallInfo.arguments);
                    console.log(`[FunctionCallHandler] Argumentos parseados:`, functionArgs);
                }
                catch (parseError) {
                    console.error(`[FunctionCallHandler] Error parseando argumentos:`, parseError);
                    throw new Error(`Argumentos de función inválidos: ${functionCallInfo.arguments}`);
                }
                // Ejecutar la función
                const functionResult = yield this.functionService.executeFunction(functionCallInfo.name, functionArgs, context);
                console.log(`[FunctionCallHandler] Resultado de función:`, {
                    success: functionResult.success,
                    hasData: !!functionResult.data,
                    hasError: !!functionResult.error
                });
                // Agregar resultado de función a mensajes
                const functionMessage = {
                    role: 'function',
                    name: functionCallInfo.name,
                    content: JSON.stringify(functionResult)
                };
                const updatedMessages = [...messages, functionMessage];
                // Llamar a OpenAI con el resultado de la función
                const response = yield this.openRouterClient.createChatCompletion(Object.assign(Object.assign({}, options), { messages: updatedMessages, tools: undefined }));
                // Procesar respuesta
                if (response.content) {
                    response.content = this.processResponseText(response.content);
                }
                return response;
            }
            catch (error) {
                console.error(`[FunctionCallHandler] Error procesando función ${functionCallInfo.name}:`, error);
                // Crear respuesta de error amigable
                const errorMessage = this.generateErrorMessage(functionCallInfo.name, error);
                return {
                    choices: [{ message: { role: 'assistant', content: errorMessage, tool_calls: [] }, finish_reason: 'error' }],
                    content: errorMessage,
                    model: options.model || 'error',
                    usage: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    }
                };
            }
        });
    }
    /**
     * Maneja múltiples llamadas a funciones en secuencia
     */
    processMultipleFunctionCalls(functionCalls, messages, options, context) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[FunctionCallHandler] Procesando ${functionCalls.length} llamadas a funciones`);
            let currentMessages = [...messages];
            let lastResponse = null;
            for (const [index, functionCall] of functionCalls.entries()) {
                console.log(`[FunctionCallHandler] Procesando función ${index + 1}/${functionCalls.length}: ${functionCall.name}`);
                try {
                    lastResponse = yield this.processFunctionCall(functionCall, currentMessages, options, context);
                    // Actualizar mensajes para la siguiente función
                    currentMessages.push({
                        role: 'assistant',
                        content: lastResponse.content || ''
                    });
                }
                catch (error) {
                    console.error(`[FunctionCallHandler] Error en función ${functionCall.name}:`, error);
                    // En caso de error, devolver resultado de error
                    return {
                        choices: [{ message: { role: 'assistant', content: this.generateErrorMessage(functionCall.name, error), tool_calls: [] }, finish_reason: 'error' }],
                        content: this.generateErrorMessage(functionCall.name, error),
                        model: options.model || 'error',
                        usage: {
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            total_tokens: 0
                        }
                    };
                }
            }
            return lastResponse || {
                content: 'Error procesando funciones múltiples',
                model: options.model || 'error',
                choices: [{
                        message: {
                            role: 'assistant',
                            content: 'Error procesando funciones múltiples'
                        },
                        finish_reason: 'error'
                    }],
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            };
        });
    }
    /**
     * Procesa y sanitiza el texto de respuesta
     */
    processResponseText(text) {
        if (!text)
            return text;
        // Sanitización básica
        let processedText = text
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "\r")
            .replace(/\\([^\\])/g, "$1")
            .trim();
        return processedText;
    }
    /**
     * Genera un mensaje de error amigable basado en el tipo de función
     */
    generateErrorMessage(functionName, error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || 'Error desconocido';
        switch (functionName) {
            case 'buscarPorVin':
                return `Hubo un problema al decodificar el VIN. ¿Puedes verificar que esté correcto o decirme la marca y modelo de tu vehículo?`;
            case 'buscarYConsultarInventario':
            case 'buscarProductos':
                return `No pude encontrar información sobre ese producto. ¿Podrías ser más específico o probar con otro término de búsqueda?`;
            case 'consultarInventario':
            case 'consultarInventarioGeneral':
                return `No pude consultar la disponibilidad de ese producto. ¿Te conecto con un asesor para verificar manualmente?`;
            case 'generarTicket':
            case 'confirmarCompra':
                return `Hubo un problema procesando la compra. Te conectaré con un asesor para completar la transacción.`;
            case 'procesarEnvio':
                return `Hubo un problema procesando el envío. Te conectaré con un asesor para coordinar la entrega.`;
            case 'solicitarAsesor':
                return `Hubo un problema contactando al asesor. Por favor, intenta llamarnos directamente o contactarnos por otros medios.`;
            default:
                return `Tuve un problema procesando tu solicitud. ¿Puedo ayudarte de otra manera o prefieres que te conecte con un asesor?`;
        }
    }
    /**
     * Valida si una función está disponible
     */
    isFunctionAvailable(functionName) {
        const stats = this.functionService.getStats();
        return stats.registeredFunctions.includes(functionName);
    }
    /**
     * Obtiene las funciones disponibles
     */
    getAvailableFunctions() {
        const stats = this.functionService.getStats();
        return stats.registeredFunctions;
    }
    /**
     * Obtiene las definiciones de funciones para OpenAI
     */
    getFunctionDefinitions() {
        return this.functionService.getFunctionDefinitions();
    }
    /**
     * Convierte definiciones de funciones al formato tools de OpenAI
     */
    getFunctionDefinitionsAsTools() {
        const definitions = this.getFunctionDefinitions();
        return definitions.map(def => ({
            type: 'function',
            function: {
                name: def.name,
                description: def.description,
                parameters: def.parameters
            }
        }));
    }
    /**
     * Extrae información de function call de una respuesta de OpenAI
     */
    extractFunctionCallInfo(response) {
        // Formato legacy (function_call)
        if (response.function_call) {
            return {
                name: response.function_call.name,
                arguments: response.function_call.arguments
            };
        }
        // Formato nuevo (tool_calls)
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];
            if (toolCall.type === 'function') {
                return {
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments
                };
            }
        }
        return null;
    }
    /**
     * Extrae múltiples function calls de una respuesta
     */
    extractMultipleFunctionCalls(response) {
        const functionCalls = [];
        // Formato legacy (function_call)
        if (response.function_call) {
            functionCalls.push({
                name: response.function_call.name,
                arguments: response.function_call.arguments
            });
        }
        // Formato nuevo (tool_calls)
        if (response.tool_calls && Array.isArray(response.tool_calls)) {
            for (const toolCall of response.tool_calls) {
                if (toolCall.type === 'function') {
                    functionCalls.push({
                        name: toolCall.function.name,
                        arguments: toolCall.function.arguments
                    });
                }
            }
        }
        return functionCalls;
    }
    /**
     * Verifica si una respuesta contiene function calls
     */
    hasFunctionCalls(response) {
        return !!(response.function_call || (response.tool_calls && response.tool_calls.length > 0));
    }
    /**
     * Crea un prompt de sistema optimizado para function calling
     */
    createSystemPromptForFunctions(posId = 'nuestra tienda') {
        const availableFunctions = this.getAvailableFunctions();
        return `Eres un asistente especializado en refacciones automotrices para ${posId}. 

Funciones disponibles: ${availableFunctions.join(', ')}

REGLAS IMPORTANTES:
1. SIEMPRE usa las funciones disponibles para consultar inventario, buscar productos, procesar compras, etc.
2. NO inventes información sobre productos, precios o disponibilidad
3. Si una función falla, explica el problema de manera clara y ofrece alternativas
4. Para VINs usa buscarPorVin, para búsquedas generales usa buscarYConsultarInventario
5. Para compras usa generarTicket, para asesoría usa solicitarAsesor
6. Siempre proporciona información clara sobre disponibilidad, precios y sucursales
7. Ofrece conectar con asesor cuando sea apropiado

Responde en español mexicano de manera amigable y profesional.`;
    }
    /**
     * Obtiene estadísticas del handler
     */
    getStats() {
        const functionStats = this.functionService.getStats();
        return {
            availableFunctions: functionStats.totalFunctions,
            functionNames: functionStats.registeredFunctions,
            clientConnected: this.openRouterClient ? true : false
        };
    }
    /**
     * Valida conexión con servicios requeridos
     */
    validateServices() {
        return __awaiter(this, void 0, void 0, function* () {
            const functionStats = this.functionService.getStats();
            // Testear conexión OpenAI
            let openaiConnected = false;
            try {
                const connectionResult = yield this.openRouterClient.testConnection();
                openaiConnected = connectionResult.success;
            }
            catch (error) {
                console.error('[FunctionCallHandler] Error testing OpenAI connection:', error);
            }
            return {
                openaiClient: openaiConnected,
                functionService: functionStats.totalFunctions > 0,
                totalFunctions: functionStats.totalFunctions
            };
        });
    }
}
exports.FunctionCallHandler = FunctionCallHandler;
// Exportar instancia singleton
exports.functionCallHandler = new FunctionCallHandler();
