import type {
  OpenRouterResponse,
  OpenRouterMessage,
  OpenRouterOptions,
  OpenRouterToolCall,
  FunctionResult,
  FunctionContext
} from '../types/chatbot';
import { OpenRouterClient } from './openrouter-client';
import { AutopartsFunctionService } from './autoparts-functions';

/**
 * Información extraída de un tool call
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Handler para procesar tool calls de OpenRouter con Gemini
 * Específico para funciones de repuestos automotrices
 */
export class AutopartsFunctionHandler {
  private readonly functionService: AutopartsFunctionService;
  private readonly openrouterClient: OpenRouterClient;

  constructor(
    functionService: AutopartsFunctionService,
    openrouterClient: OpenRouterClient
  ) {
    this.functionService = functionService;
    this.openrouterClient = openrouterClient;
  }

  /**
   * Procesar un tool call y generar respuesta final
   */
  async processToolCall(
    toolCallInfo: ToolCallInfo,
    messages: OpenRouterMessage[],
    options: OpenRouterOptions,
    context: FunctionContext
  ): Promise<{
    response: OpenRouterResponse;
    functionResult: FunctionResult;
    finalContent: string;
  }> {
    console.log(`[FunctionHandler] Procesando tool call: ${toolCallInfo.name}`);

    // Parsear argumentos del tool call
    let functionArgs: Record<string, any> = {};
    
    try {
      // Limpiar el string de argumentos antes de parsear
      let cleanArguments = toolCallInfo.arguments.trim();
      console.log(`[FunctionHandler] Arguments raw:`, cleanArguments);
      console.log(`[FunctionHandler] Arguments length:`, cleanArguments.length);
      console.log(`[FunctionHandler] Arguments char codes:`, cleanArguments.split('').map(c => c.charCodeAt(0)));
      
      // Detectar y manejar múltiples objetos JSON
      if (cleanArguments.includes('}{')) {
        console.log(`[FunctionHandler] Múltiples objetos JSON detectados, tomando el primero`);
        const firstJsonEnd = cleanArguments.indexOf('}') + 1;
        cleanArguments = cleanArguments.substring(0, firstJsonEnd);
        console.log(`[FunctionHandler] JSON limpiado:`, cleanArguments);
      }
      
      if (cleanArguments && cleanArguments !== '{}' && cleanArguments !== '') {
        functionArgs = JSON.parse(cleanArguments);
        console.log(`[FunctionHandler] Argumentos parseados:`, functionArgs);
      } else {
        console.log(`[FunctionHandler] Argumentos vacíos, usando objeto vacío`);
        functionArgs = {};
      }
    } catch (error) {
      console.error(`[FunctionHandler] Error parseando argumentos:`, error);
      console.error(`[FunctionHandler] Raw arguments string:`, toolCallInfo.arguments);
      
      // Intentar extraer argumentos de JSON malformado (cuando el modelo envía múltiples campos)
      if (toolCallInfo.name === 'recopilar_dato_cliente') {
        const extractedArgs = this.extractFromMalformedJSON(toolCallInfo.arguments);
        if (extractedArgs) {
          console.log(`[FunctionHandler] Argumentos extraídos de JSON malformado:`, extractedArgs);
          functionArgs = extractedArgs;
        } else {
          functionArgs = {};
        }
      } else {
        functionArgs = {};
      }
    }

    // Ejecutar la función
    const functionResult = await this.functionService.executeFunction(
      toolCallInfo.name,
      functionArgs,
      context
    );

    console.log(`[FunctionHandler] Resultado de función:`, functionResult);

    // Crear mensaje de resultado de función para el contexto (interno, no visible al usuario)
    const functionMessage: OpenRouterMessage = {
      role: 'system',
      content: `Información guardada correctamente. Continúa la conversación de forma natural.`
    };

    // Agregar el resultado al historial de mensajes
    const updatedMessages = [
      ...messages,
      functionMessage
    ];

    // Generar respuesta final del LLM
    try {
      const finalResponse = await this.openrouterClient.createChatCompletion({
        ...options,
        messages: updatedMessages,
        // No incluir tools en la segunda llamada para forzar respuesta textual
        tools: undefined,
        tool_choice: undefined
      });

      const finalContent = finalResponse.choices[0]?.message?.content || 'Lo siento, ocurrió un error procesando tu solicitud.';

      return {
        response: finalResponse,
        functionResult,
        finalContent
      };

    } catch (error) {
      console.error('[FunctionHandler] Error generando respuesta final:', error);
      
      // Fallback: crear respuesta basada en el resultado de la función
      const fallbackContent = this.generateFallbackResponse(toolCallInfo.name, functionResult);
      
      return {
        response: {
          id: 'fallback-' + Date.now(),
          choices: [{
            message: {
              role: 'assistant',
              content: fallbackContent
            },
            finish_reason: 'stop'
          }]
        },
        functionResult,
        finalContent: fallbackContent
      };
    }
  }

  /**
   * Extraer información del primer tool call de una respuesta
   */
  extractToolCall(response: OpenRouterResponse): ToolCallInfo | null {
    const toolCalls = response.choices[0]?.message?.tool_calls;
    
    if (!toolCalls || toolCalls.length === 0) {
      return null;
    }

    const firstToolCall = toolCalls[0];
    
    return {
      id: firstToolCall.id,
      name: firstToolCall.function.name,
      arguments: firstToolCall.function.arguments
    };
  }

  /**
   * Verificar si una respuesta contiene tool calls
   */
  hasToolCalls(response: OpenRouterResponse): boolean {
    const toolCalls = response.choices[0]?.message?.tool_calls;
    return !!(toolCalls && toolCalls.length > 0);
  }

  /**
   * Procesar múltiples tool calls (si el modelo los envía)
   */
  async processMultipleToolCalls(
    response: OpenRouterResponse,
    messages: OpenRouterMessage[],
    options: OpenRouterOptions,
    context: FunctionContext
  ): Promise<{
    finalContent: string;
    functionResults: FunctionResult[];
  }> {
    const toolCalls = response.choices[0]?.message?.tool_calls;
    
    if (!toolCalls || toolCalls.length === 0) {
      return {
        finalContent: response.choices[0]?.message?.content || '',
        functionResults: []
      };
    }

    console.log(`[FunctionHandler] Procesando ${toolCalls.length} tool calls`);

    const functionResults: FunctionResult[] = [];
    let updatedMessages = [...messages];

    // Procesar cada tool call secuencialmente
    for (const toolCall of toolCalls) {
      const toolCallInfo: ToolCallInfo = {
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments
      };

      // Ejecutar función
      let functionArgs: Record<string, any> = {};
      try {
        let cleanArguments = toolCall.function.arguments.trim();
        
        // Detectar y manejar múltiples objetos JSON
        if (cleanArguments.includes('}{')) {
          console.log(`[FunctionHandler] Múltiples objetos JSON en tool call, tomando el primero`);
          const firstJsonEnd = cleanArguments.indexOf('}') + 1;
          cleanArguments = cleanArguments.substring(0, firstJsonEnd);
        }
        
        if (cleanArguments && cleanArguments !== '{}' && cleanArguments !== '') {
          functionArgs = JSON.parse(cleanArguments);
        } else {
          functionArgs = {};
        }
      } catch (error) {
        console.error(`Error parseando argumentos de ${toolCall.function.name}:`, error);
        console.error(`Raw arguments:`, toolCall.function.arguments);
        functionArgs = {};
      }

      const result = await this.functionService.executeFunction(
        toolCall.function.name,
        functionArgs,
        context
      );

      functionResults.push(result);

      // Agregar resultado al contexto para próximas funciones (interno)
      updatedMessages.push({
        role: 'system',
        content: `Datos procesados correctamente.`
      });

      // Actualizar contexto si la función modificó datos del cliente
      if (result.success && result.data?.clientInfo) {
        context.currentClientInfo = result.data.clientInfo;
      }
    }

    // Generar respuesta final con todos los resultados
    try {
      const finalResponse = await this.openrouterClient.createChatCompletion({
        ...options,
        messages: updatedMessages,
        tools: undefined,
        tool_choice: undefined
      });

      return {
        finalContent: finalResponse.choices[0]?.message?.content || 'Perfecto, información guardada.',
        functionResults
      };

    } catch (error) {
      console.error('[FunctionHandler] Error en respuesta final múltiple:', error);
      
      // Generar respuesta de fallback basada en los resultados
      const successCount = functionResults.filter(r => r.success).length;
      const fallbackContent = successCount > 0 ? 'Perfecto, ya tengo la información.' : 'Hubo un problema guardando los datos.';

      return {
        finalContent: fallbackContent,
        functionResults
      };
    }
  }

  /**
   * Generar respuesta de fallback cuando falla la llamada al LLM
   */
  private generateFallbackResponse(functionName: string, result: FunctionResult): string {
    if (!result.success) {
      return `❌ Error: ${result.error || 'Ocurrió un problema procesando tu solicitud.'}`;
    }

    // Respuestas específicas según la función ejecutada
    switch (functionName) {
      case 'recopilar_dato_cliente':
        return result.message || '✅ Información guardada correctamente.';
      
      case 'guardar_info_vehiculo':
        return result.message || '✅ Información del vehículo guardada correctamente.';
      
      case 'guardar_info_cliente':
        return result.message || '✅ Información del cliente guardada correctamente.';
      
      case 'guardar_informacion':
        return result.message || '✅ Información guardada correctamente.';
      
      case 'validar_datos_vehiculo':
        return result.message || '✅ Datos del vehículo validados.';
      
      case 'generar_cotizacion':
        if (result.data) {
          const quote = result.data;
          return `📋 **Cotización generada**\n\n` +
                 `**Cliente:** ${quote.cliente}\n` +
                 `**Vehículo:** ${quote.vehiculo}\n` +
                 `**Pieza:** ${quote.pieza}\n` +
                 `**Precio:** $${quote.precio.toLocaleString()}\n` +
                 `**Disponibilidad:** ${quote.disponibilidad}\n` +
                 `**Garantía:** ${quote.garantia}\n` +
                 `**Tiempo de entrega:** ${quote.tiempoEntrega}\n\n` +
                 `¿Te interesa alguna de estas opciones?`;
        }
        return '✅ Cotización generada correctamente.';
      
      case 'determinar_proximo_paso':
        if (result.data?.allFieldsComplete) {
          return '🎉 ¡Perfecto! Tengo toda la información necesaria. Procedamos a generar tu cotización.';
        }
        if (result.data?.nextField) {
          const fieldNames: Record<string, string> = {
            'nombre': 'tu nombre',
            'pieza': 'qué repuesto necesitas',
            'marca': 'la marca del vehículo',
            'modelo': 'el modelo del vehículo',
            'año': 'el año del vehículo',
            'litraje': 'el litraje del motor',
            'numeroSerie': 'el número de serie del motor'
          };
          const friendlyName = fieldNames[result.data.nextField] || result.data.nextField;
          return `Perfecto. Ahora necesito saber ${friendlyName}.`;
        }
        return '👍 Continuemos recopilando la información.';
      
      default:
        return result.message || '✅ Operación completada.';
    }
  }

  /**
   * Obtener estadísticas de uso de funciones
   */
  getUsageStats(): {
    totalExecutions: number;
    successRate: number;
    functionUsage: Record<string, number>;
  } {
    // En una implementación real, estas estadísticas se mantendrían en memoria o BD
    return {
      totalExecutions: 0,
      successRate: 0,
      functionUsage: {}
    };
  }

  /**
   * Validar que las funciones estén disponibles
   */
  validateFunctions(): { isValid: boolean; availableFunctions: string[]; errors: string[] } {
    const availableFunctions = this.functionService.getFunctionDefinitions().map(f => f.function.name);
    const errors: string[] = [];

    if (availableFunctions.length === 0) {
      errors.push('No hay funciones disponibles');
    }

    // Verificar funciones críticas
    const criticalFunctions = ['guardar_informacion', 'guardar_info_vehiculo', 'guardar_info_cliente', 'generar_cotizacion'];
    for (const func of criticalFunctions) {
      if (!availableFunctions.includes(func)) {
        errors.push(`Función crítica '${func}' no disponible`);
      }
    }

    return {
      isValid: errors.length === 0,
      availableFunctions,
      errors
    };
  }

  /**
   * Extraer argumentos de JSON malformado cuando el modelo envía múltiples campos
   */
  private extractFromMalformedJSON(malformedJson: string): Record<string, any> | null {
    try {
      console.log('[FunctionHandler] Intentando extraer de JSON malformado:', malformedJson);

      // Estrategia 1: Buscar campo y valor específicos
      const campoMatches = malformedJson.match(/"campo"\s*:\s*"([^"]+)"/g);
      const valorMatches = malformedJson.match(/"valor"\s*:\s*"([^"]+)"/g);

      if (campoMatches && valorMatches) {
        // Tomar el primer campo y valor
        const primerCampo = campoMatches[0].match(/"campo"\s*:\s*"([^"]+)"/)?.[1];
        const primerValor = valorMatches[0].match(/"valor"\s*:\s*"([^"]+)"/)?.[1];

        if (primerCampo && primerValor) {
          console.log('[FunctionHandler] Extraído campo-valor:', { campo: primerCampo, valor: primerValor });
          return {
            campo: primerCampo,
            valor: primerValor
          };
        }
      }

      // Estrategia 2: Extraer todos los pares key-value y buscar campos conocidos
      const validFields = ['nombre', 'pieza', 'marca', 'modelo', 'año', 'litraje', 'numeroSerie', 'modeloEspecial'];
      const allMatches = malformedJson.match(/"([^"]+)"\s*:\s*"([^"]+)"/g);
      
      if (allMatches) {
        console.log('[FunctionHandler] Todos los matches encontrados:', allMatches);
        
        for (const match of allMatches) {
          const [, key, value] = match.match(/"([^"]+)"\s*:\s*"([^"]+)"/) || [];
          
          // Si encontramos un campo válido directamente
          if (validFields.includes(key) && value) {
            console.log('[FunctionHandler] Campo directo encontrado:', { campo: key, valor: value });
            return {
              campo: key,
              valor: value
            };
          }
        }
      }

      // Estrategia 3: Buscar patrones específicos para cada campo
      for (const field of validFields) {
        const pattern = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, 'i');
        const match = malformedJson.match(pattern);
        if (match) {
          console.log('[FunctionHandler] Patrón específico encontrado:', { campo: field, valor: match[1] });
          return {
            campo: field,
            valor: match[1]
          };
        }
      }

      console.log('[FunctionHandler] No se pudo extraer información válida');
      return null;
    } catch (error) {
      console.error('[FunctionHandler] Error extrayendo de JSON malformado:', error);
      return null;
    }
  }
} 