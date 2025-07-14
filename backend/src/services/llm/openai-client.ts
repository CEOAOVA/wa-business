/**
 * OpenAI Client mejorado para OpenRouter + Gemini
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */

import axios from 'axios';
import { getConfig } from '../../config';
import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  OpenRouterMessage, 
  OpenRouterResponse,
  OpenRouterTool,
  FunctionCall,
  ToolCall 
} from '../../types/llm';

export class OpenAIClient {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultModel: string;
  private readonly timeout: number;

  constructor() {
    const config = getConfig();
    
    this.apiKey = config.llm.openRouterApiKey;
    this.baseURL = config.llm.openRouterBaseUrl;
    this.defaultModel = config.llm.openRouterModel;
    this.timeout = config.llm.timeout;
    
    // Log de configuración (sin exponer la clave completa)
    console.log(`[OpenAIClient] Configuración cargada:`);
    console.log(`   - API Key: ${this.apiKey ? '******' + this.apiKey.slice(-6) : 'No configurada'}`);
    console.log(`   - Base URL: ${this.baseURL}`);
    console.log(`   - Modelo por defecto: ${this.defaultModel}`);
    console.log(`   - Timeout: ${this.timeout}ms`);
    
    console.log(`[LLMClient] Usando proveedor: OpenRouter`);
    console.log(`[LLMClient] Modelo: ${this.defaultModel} @ ${this.baseURL}`);

    // Validación en producción
    if (config.nodeEnv === 'production') {
      if (!this.apiKey) {
        const errorMsg = '[OpenAIClient] OPEN_ROUTER_API_KEY no está configurada. Esta es una variable crítica.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (!this.baseURL) {
        const errorMsg = '[OpenAIClient] OPEN_ROUTER_BASE_URL no está configurada.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (!this.defaultModel) {
        const errorMsg = '[OpenAIClient] OPEN_ROUTER_DEFAULT_MODEL no está configurada.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  /**
   * Crea una completación de chat usando OpenRouter API (Gemini)
   */
  async createChatCompletion(
    options: ChatCompletionOptions & { model?: string }
  ): Promise<ChatCompletionResponse> {
    const model = options.model || this.defaultModel;

    // Validar que tenemos un modelo a usar
    if (!model) {
      const errorMsg = '[OpenAIClient] No se especificó un modelo y no hay un modelo predeterminado configurado.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validar API Key y Base URL antes de la solicitud
    if (!this.apiKey || !this.baseURL) {
      const errorMsg = `[OpenAIClient] Configuración inválida: ${!this.apiKey ? 'Falta API Key.' : ''} ${!this.baseURL ? 'Falta Base URL.' : ''}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const isOpenRouter = this.baseURL.includes('openrouter.ai');
    const requestPayload: any = {
      model,
      messages: options.messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens })
    };

    // OpenRouter usa 'tools' en lugar de 'functions'
    if (isOpenRouter) {
      if (options.functions) {
        // Transformar las functions en tools con el campo type requerido
        requestPayload.tools = options.functions.map(func => ({
          type: "function",
          function: func
        }));
      }
      if (options.function_call) {
        // Transformar function_call a tool_choice
        if (options.function_call === 'auto' || options.function_call === 'none') {
          requestPayload.tool_choice = options.function_call;
        } else {
          requestPayload.tool_choice = {
            type: "function",
            function: { name: (options.function_call as { name: string }).name }
          };
        }
      }
    } else {
      // Para OpenAI estándar (fallback)
      if (options.functions) requestPayload.functions = options.functions;
      if (options.function_call) requestPayload.function_call = options.function_call;
    }

    try {
      console.log(`[OpenAIClient] Enviando solicitud a ${this.baseURL}/chat/completions con modelo ${model}`);
      
      // Log detallado para debug
      console.log(`[OpenAIClient] Detalles de la solicitud:`);
      console.log(`   - Modelo: ${model}`);
      console.log(`   - Temperatura: ${requestPayload.temperature}`);
      console.log(`   - Max tokens: ${requestPayload.max_tokens}`);
      console.log(`   - Num. mensajes: ${requestPayload.messages.length}`);
      console.log(`   - tools/functions configurados: ${isOpenRouter ? (requestPayload.tools ? 'Sí' : 'No') : (requestPayload.functions ? 'Sí' : 'No')}`);
      console.log(`   - URL completa: ${this.baseURL}/chat/completions`);

      const response = await axios.post<{
        choices: Array<{
          message: {
            role: 'assistant' | 'function';
            content: string | null;
            function_call?: FunctionCall;
            tool_calls?: ToolCall[];
          };
          finish_reason: string;
        }>;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      }>(
        `${this.baseURL}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            // Cabeceras recomendadas por OpenRouter
            'HTTP-Referer': 'https://whatsapp-business-api.com',
            'X-Title': 'WhatsApp Business LLM',
          },
          timeout: this.timeout
        }
      );

      const data = response.data;
      console.log('[OpenAIClient] Respuesta recibida exitosamente');

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No se recibieron opciones en la respuesta de OpenRouter');
      }

      const choice = data.choices[0];
      const message = choice.message;

      // Extraer function_call de tool_calls si es necesario (OpenRouter format)
      let function_call: FunctionCall | undefined = message.function_call;
      let tool_calls: ToolCall[] | undefined = message.tool_calls;

      if (!function_call && tool_calls && tool_calls.length > 0) {
        // Convertir el primer tool_call a function_call para compatibilidad
        const firstToolCall = tool_calls[0];
        if (firstToolCall.type === 'function') {
          function_call = {
            name: firstToolCall.function.name,
            arguments: firstToolCall.function.arguments
          };
        }
      }

      const result: ChatCompletionResponse = {
        content: message.content,
        function_call,
        tool_calls,
        usage: data.usage
      };

      console.log(`[OpenAIClient] Procesamiento completado. Content: ${result.content ? 'Sí' : 'No'}, Function call: ${result.function_call ? 'Sí' : 'No'}, Tool calls: ${result.tool_calls?.length || 0}`);

      return result;

    } catch (error: any) {
      console.error('[OpenAIClient] Error en solicitud:', error.message);
      
      if (error.response) {
        console.error('[OpenAIClient] Error de respuesta:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Errores específicos de OpenRouter
        if (error.response.status === 401) {
          throw new Error('API Key de OpenRouter inválida o expirada');
        } else if (error.response.status === 429) {
          throw new Error('Límite de rate limit alcanzado en OpenRouter');
        } else if (error.response.status === 400) {
          const errorData = error.response.data;
          throw new Error(`Error de solicitud: ${errorData.error?.message || errorData.message || 'Solicitud malformada'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout de ${this.timeout}ms alcanzado en solicitud a OpenRouter`);
      }
      
      throw new Error(`Error en OpenAI Client: ${error.message}`);
    }
  }

  /**
   * Extrae información de function call de la respuesta
   */
  extractFunctionCall(response: ChatCompletionResponse): FunctionCall | null {
    // Priorizar function_call directo
    if (response.function_call) {
      return response.function_call;
    }

    // Extraer del primer tool_call si está disponible
    if (response.tool_calls && response.tool_calls.length > 0) {
      const firstToolCall = response.tool_calls[0];
      if (firstToolCall.type === 'function') {
        return {
          name: firstToolCall.function.name,
          arguments: firstToolCall.function.arguments
        };
      }
    }

    return null;
  }

  /**
   * Valida la configuración del cliente
   */
  validateConfiguration(): boolean {
    const issues: string[] = [];

    if (!this.apiKey) {
      issues.push('API Key faltante');
    }
    if (!this.baseURL) {
      issues.push('Base URL faltante');
    }
    if (!this.defaultModel) {
      issues.push('Modelo por defecto faltante');
    }

    if (issues.length > 0) {
      console.error(`[OpenAIClient] Problemas de configuración: ${issues.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Obtiene información del modelo actual
   */
  getModelInfo(): { model: string; provider: string; baseUrl: string } {
    return {
      model: this.defaultModel,
      provider: 'OpenRouter',
      baseUrl: this.baseURL
    };
  }

  /**
   * Test de conectividad con OpenRouter
   */
  async testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const testPayload = {
        model: this.defaultModel,
        messages: [
          { role: 'user' as const, content: 'Test de conectividad' }
        ],
        max_tokens: 5,
        temperature: 0
      };

      await axios.post(
        `${this.baseURL}/chat/completions`,
        testPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 segundos para test
        }
      );

      const latency = Date.now() - startTime;
      console.log(`[OpenAIClient] Test de conectividad exitoso. Latencia: ${latency}ms`);
      
      return {
        success: true,
        latency
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      console.error(`[OpenAIClient] Test de conectividad falló en ${latency}ms:`, error.message);
      
      return {
        success: false,
        error: error.message,
        latency
      };
    }
  }
} 