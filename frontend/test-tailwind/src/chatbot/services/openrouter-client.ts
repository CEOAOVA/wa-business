import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { 
  OpenRouterMessage, 
  OpenRouterOptions, 
  OpenRouterResponse,
  OpenRouterTool,
  ChatbotConfig
} from '../types/chatbot';
import { DEFAULT_CONFIG } from '../types/chatbot';

/**
 * Cliente OpenRouter optimizado para Gemini 2.5 Flash Lite Preview
 * Específico para chatbot de repuestos automotrices
 */
export class OpenRouterClient {
  private readonly config: ChatbotConfig;

  constructor(customConfig?: Partial<ChatbotConfig>) {
    const envApiKey = this.getApiKeyFromEnv();
    
    this.config = {
      ...DEFAULT_CONFIG,
      ...customConfig,
      // Obtener API key de variables de entorno o usar la proporcionada
      apiKey: customConfig?.apiKey || envApiKey,
    };

    // Debug detallado
    console.log('[OpenRouterClient] Debug API Key:', {
      envApiKey: envApiKey ? `${envApiKey.substring(0, 12)}...` : 'NO ENCONTRADA',
      hasCustomKey: !!customConfig?.apiKey,
      finalHasKey: !!this.config.apiKey,
      allEnvVars: Object.keys(import.meta.env || {}).filter(k => k.includes('OPENROUTER'))
    });

    if (!this.config.apiKey) {
      console.error('[OpenRouterClient] ❌ API key no encontrada. Verificar archivo .env.local');
      console.error('[OpenRouterClient] 📝 Debe contener: VITE_OPENROUTER_API_KEY=tu_key_aqui');
    } else {
      console.log('[OpenRouterClient] ✅ API key cargada correctamente');
    }
  }

  /**
   * Crear chat completion con Gemini
   */
  async createChatCompletion(options: OpenRouterOptions): Promise<OpenRouterResponse> {
    const requestPayload = {
      model: options.model || this.config.model,
      messages: options.messages,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.max_tokens ?? this.config.maxTokens,
      tools: options.tools,
      tool_choice: options.tool_choice,
      // Configuraciones específicas para Gemini en OpenRouter
      stream: false,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    // Remover campos undefined para evitar errores
    Object.keys(requestPayload).forEach(key => {
      if (requestPayload[key as keyof typeof requestPayload] === undefined) {
        delete requestPayload[key as keyof typeof requestPayload];
      }
    });

    console.log('[OpenRouterClient] Enviando request:', {
      model: requestPayload.model,
      messageCount: requestPayload.messages.length,
      toolsCount: requestPayload.tools?.length || 0,
      tool_choice: requestPayload.tool_choice,
    });

    try {
      const response: AxiosResponse<OpenRouterResponse> = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://localhost:3000', // Para OpenRouter
            'X-Title': 'Embler Autoparts Chatbot', // Para OpenRouter
          },
          timeout: this.config.timeoutMs,
        }
      );

      console.log('[OpenRouterClient] Respuesta recibida:', {
        id: response.data.id,
        finishReason: response.data.choices[0]?.finish_reason,
        hasToolCalls: !!response.data.choices[0]?.message?.tool_calls?.length,
        contentLength: response.data.choices[0]?.message?.content?.length || 0,
        usage: response.data.usage,
      });

      return response.data;

    } catch (error) {
      console.error('[OpenRouterClient] Error en request:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        
        // Errores específicos de OpenRouter
        if (status === 401) {
          throw new Error('API key inválida para OpenRouter');
        } else if (status === 429) {
          throw new Error('Límite de rate excedido. Intenta de nuevo en unos momentos.');
        } else if (status === 400) {
          const message = data?.error?.message || 'Request inválido';
          throw new Error(`Error de request: ${message}`);
        } else if (status === 500) {
          throw new Error('Error interno de OpenRouter. Intenta de nuevo.');
        }
        
        throw new Error(`Error de OpenRouter (${status}): ${data?.error?.message || error.message}`);
      }
      
      // Errores de red u otros
      if ((error as any).code === 'ECONNABORTED') {
        throw new Error('Timeout: El modelo tardó demasiado en responder');
      }
      
      throw new Error(`Error inesperado: ${(error as Error).message}`);
    }
  }

  /**
   * Método simplificado para chat básico sin tools
   */
  async simpleChat(
    messages: OpenRouterMessage[], 
    options?: Partial<Pick<OpenRouterOptions, 'temperature' | 'max_tokens' | 'model'>>
  ): Promise<string> {
    const response = await this.createChatCompletion({
      messages,
      ...options,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Método para chat con functions/tools
   */
  async chatWithTools(
    messages: OpenRouterMessage[],
    tools: OpenRouterTool[],
    options?: Partial<Pick<OpenRouterOptions, 'temperature' | 'max_tokens' | 'model' | 'tool_choice'>>
  ): Promise<OpenRouterResponse> {
    return this.createChatCompletion({
      messages,
      tools,
      tool_choice: options?.tool_choice || 'auto',
      ...options,
    });
  }

  /**
   * Verificar si una respuesta contiene tool calls
   */
  hasToolCalls(response: OpenRouterResponse): boolean {
    return !!(
      response.choices[0]?.message?.tool_calls && 
      response.choices[0].message.tool_calls.length > 0
    );
  }

  /**
   * Extraer el primer tool call de una respuesta
   */
  getFirstToolCall(response: OpenRouterResponse) {
    const toolCalls = response.choices[0]?.message?.tool_calls;
    return toolCalls && toolCalls.length > 0 ? toolCalls[0] : null;
  }

  /**
   * Obtener estadísticas del último uso
   */
  getUsageStats(response: OpenRouterResponse) {
    return {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      model: this.config.model,
    };
  }

  /**
   * Validar configuración del cliente
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('API key es requerida');
    }

    if (!this.config.model) {
      errors.push('Modelo es requerido');
    }

    if (!this.config.baseURL) {
      errors.push('Base URL es requerida');
    }

    if (this.config.temperature < 0 || this.config.temperature > 2) {
      errors.push('Temperature debe estar entre 0 y 2');
    }

    if (this.config.maxTokens <= 0) {
      errors.push('Max tokens debe ser mayor a 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtener configuración actual (sin exponer API key)
   */
  getConfig() {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? '[CONFIGURADA]' : '[NO CONFIGURADA]',
    };
  }

  /**
   * Obtener API key de variables de entorno
   */
  private getApiKeyFromEnv(): string {
    // En desarrollo frontend, usar variables con prefijo VITE_
    return import.meta.env?.VITE_OPENROUTER_API_KEY || '';
  }
}

/**
 * Instancia singleton para uso global (opcional)
 */
let sharedClient: OpenRouterClient | null = null;

export function getSharedOpenRouterClient(config?: Partial<ChatbotConfig>): OpenRouterClient {
  if (!sharedClient) {
    sharedClient = new OpenRouterClient(config);
  }
  return sharedClient;
}

/**
 * Función helper para crear mensajes del sistema específicos para repuestos
 */
export function createAutomotiveSystemMessage(): OpenRouterMessage {
  return {
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

EJEMPLOS:
Cliente: "Necesito pastillas de freno para mi Toyota Corolla 2018"
Tú: "Perfecto, pastillas para tu Corolla 2018. ¿Cómo te llamas?"

Cliente: "Soy [nombre] y necesito un filtro"
Tú: "Hola [nombre]. ¿Qué tipo de filtro y para qué carro?"

Cliente: "Filtro de aceite"
Tú: "¿Para qué carro es el filtro de aceite?"

IMPORTANTE SOBRE FUNCIONES:
✅ Usa las funciones disponibles para guardar información automáticamente
✅ NO menciones las funciones en tu respuesta al usuario
✅ NO muestres código o llamadas técnicas
✅ Simplemente guarda los datos y responde naturalmente

En la conversación sé natural e inteligente.`,
  };
} 