/**
 * Function Call Handler para WhatsApp Backend
 * Procesa function calls y coordina con el OpenRouter client
 */

import { OpenRouterClient, ChatCompletionOptions, ChatCompletionResponse } from './openai-client';
import { FunctionService } from './function-service';

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface FunctionResult {
  functionName: string;
  success: boolean;
  data?: any;
  error?: string;
}

export class FunctionCallHandler {
  private functionService: FunctionService;
  private openRouterClient: OpenRouterClient;

  constructor() {
    this.functionService = new FunctionService();
    this.openRouterClient = new OpenRouterClient();
  }

  /**
   * Procesa una llamada a función LLM
   */
  async processFunctionCall(
    functionCallInfo: FunctionCall,
    messages: Array<any>,
    options: ChatCompletionOptions,
    context: { pointOfSaleId: string; userId?: string; model?: string }
  ): Promise<ChatCompletionResponse> {
    console.log(`[FunctionCallHandler] Procesando función: ${functionCallInfo.name}`);
    
    try {
      // Parse argumentos de la función
      let functionArgs: any;
      try {
        functionArgs = JSON.parse(functionCallInfo.arguments);
        console.log(`[FunctionCallHandler] Argumentos parseados:`, functionArgs);
      } catch (parseError) {
        console.error(`[FunctionCallHandler] Error parseando argumentos:`, parseError);
        throw new Error(`Argumentos de función inválidos: ${functionCallInfo.arguments}`);
      }

      // Ejecutar la función
      const functionResult = await this.functionService.executeFunction(
        functionCallInfo.name,
        functionArgs,
        context
      );

      console.log(`[FunctionCallHandler] Resultado de función:`, {
        success: functionResult.success,
        hasData: !!functionResult.data,
        hasError: !!functionResult.error
      });

      // Agregar resultado de función a mensajes
      const functionMessage = {
        role: 'function' as const,
        name: functionCallInfo.name,
        content: JSON.stringify(functionResult)
      };

      const updatedMessages = [...messages, functionMessage];

      // Llamar a OpenAI con el resultado de la función
      const response = await this.openRouterClient.createChatCompletion({
        ...options,
        messages: updatedMessages,
        tools: undefined
      });

      // Procesar respuesta
      if (response.content) {
        response.content = this.processResponseText(response.content);
      }

      return response;

    } catch (error) {
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
  }

  /**
   * Maneja múltiples llamadas a funciones en secuencia
   */
  async processMultipleFunctionCalls(
    functionCalls: FunctionCall[],
    messages: Array<any>,
    options: ChatCompletionOptions,
    context: { pointOfSaleId: string; userId?: string; model?: string }
  ): Promise<ChatCompletionResponse> {
    console.log(`[FunctionCallHandler] Procesando ${functionCalls.length} llamadas a funciones`);

    let currentMessages = [...messages];
    let lastResponse: ChatCompletionResponse | null = null;

    for (const [index, functionCall] of functionCalls.entries()) {
      console.log(`[FunctionCallHandler] Procesando función ${index + 1}/${functionCalls.length}: ${functionCall.name}`);
      
      try {
        lastResponse = await this.processFunctionCall(
          functionCall,
          currentMessages,
          options,
          context
        );

        // Actualizar mensajes para la siguiente función
        currentMessages.push({
          role: 'assistant',
          content: lastResponse.content || ''
        });

      } catch (error) {
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
  }

  /**
   * Procesa y sanitiza el texto de respuesta
   */
  private processResponseText(text: string): string {
    if (!text) return text;

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
  private generateErrorMessage(functionName: string, error: any): string {
    const errorMessage = error?.message || 'Error desconocido';
    
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
  isFunctionAvailable(functionName: string): boolean {
    const stats = this.functionService.getStats();
    return stats.registeredFunctions.includes(functionName);
  }

  /**
   * Obtiene las funciones disponibles
   */
  getAvailableFunctions(): string[] {
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
      type: 'function' as const,
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
  extractFunctionCallInfo(response: any): FunctionCall | null {
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
  extractMultipleFunctionCalls(response: any): FunctionCall[] {
    const functionCalls: FunctionCall[] = [];

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
  hasFunctionCalls(response: any): boolean {
    return !!(response.function_call || (response.tool_calls && response.tool_calls.length > 0));
  }

  /**
   * Crea un prompt de sistema optimizado para function calling
   */
  createSystemPromptForFunctions(posId: string = 'nuestra tienda'): string {
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
  getStats(): {
    availableFunctions: number;
    functionNames: string[];
    clientConnected: boolean;
  } {
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
  async validateServices(): Promise<{
    openaiClient: boolean;
    functionService: boolean;
    totalFunctions: number;
  }> {
    const functionStats = this.functionService.getStats();
    
    // Testear conexión OpenAI
    let openaiConnected = false;
    try {
      const connectionResult = await this.openRouterClient.testConnection();
      openaiConnected = connectionResult.success;
    } catch (error) {
      console.error('[FunctionCallHandler] Error testing OpenAI connection:', error);
    }

    return {
      openaiClient: openaiConnected,
      functionService: functionStats.totalFunctions > 0,
      totalFunctions: functionStats.totalFunctions
    };
  }
}

// Exportar instancia singleton
export const functionCallHandler = new FunctionCallHandler(); 