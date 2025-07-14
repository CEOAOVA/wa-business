/**
 * Servicio de Chatbot para Backend
 * Adaptado desde la implementación frontend para integrar con WhatsApp
 */
import axios from 'axios';
import { whatsappService } from './whatsapp.service';

// Interfaces para el chatbot
interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  functionCalled?: string;
  clientData?: Partial<ClientInfo>;
}

interface ClientInfo {
  nombre?: string;
  necesidad?: string;
  marca?: string;
  modelo?: string;
  año?: number;
  litraje?: string;
  numeroSerie?: string;
  modeloEspecial?: string;
  ubicacion?: string;
  presupuesto?: string;
}

interface ConversationState {
  conversationId: string;
  phoneNumber: string;
  status: DataCollectionStatus;
  clientInfo: ClientInfo;
  messages: ChatbotMessage[];
  createdAt: Date;
  lastActivity: Date;
}

type DataCollectionStatus = 
  | 'greeting'
  | 'collecting_name'
  | 'collecting_part'
  | 'collecting_brand'
  | 'collecting_model'
  | 'collecting_year'
  | 'collecting_engine'
  | 'collecting_serial'
  | 'collecting_special'
  | 'data_complete'
  | 'generating_quote';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export class ChatbotService {
  private conversations = new Map<string, ConversationState>();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private readonly openRouterConfig = {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash-lite-preview-06-17',
    timeout: 30000
  };

  constructor() {
    // Limpieza automática de sesiones expiradas
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Procesar mensaje entrante de WhatsApp y generar respuesta con IA
   */
  async processWhatsAppMessage(phoneNumber: string, message: string): Promise<{
    response: string;
    shouldSend: boolean;
    conversationState?: ConversationState;
    error?: string;
  }> {
    try {
      console.log(`[ChatbotService] Procesando mensaje de ${phoneNumber}: ${message.substring(0, 50)}...`);

      // Obtener o crear conversación
      const conversationId = `wa-${phoneNumber}`;
      let conversation = this.conversations.get(conversationId);
      
      if (!conversation) {
        conversation = await this.startConversation(conversationId, phoneNumber);
      }

      // Actualizar actividad
      conversation.lastActivity = new Date();

      // Agregar mensaje del usuario
      const userMsg: ChatbotMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      conversation.messages.push(userMsg);

      // Generar respuesta con IA
      const aiResponse = await this.generateAIResponse(conversation);
      
      // Agregar respuesta del asistente
      const assistantMsg: ChatbotMessage = {
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
        conversation.clientInfo = { ...conversation.clientInfo, ...aiResponse.updatedClientInfo };
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

    } catch (error) {
      console.error('[ChatbotService] Error procesando mensaje:', error);
      
      return {
        response: 'Lo siento, ocurrió un error técnico. Un agente humano te ayudará pronto.',
        shouldSend: true,
        error: (error as Error).message
      };
    }
  }

  /**
   * Iniciar nueva conversación
   */
  private async startConversation(conversationId: string, phoneNumber: string): Promise<ConversationState> {
    const welcomeMessage = "¡Hola! 👋 Soy tu asistente especializado en repuestos automotrices de Embler. Te ayudo a encontrar exactamente lo que necesitas para tu vehículo. ¿En qué puedo ayudarte hoy?";

    const conversation: ConversationState = {
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
  }

  /**
   * Generar respuesta con IA usando OpenRouter
   */
  private async generateAIResponse(conversation: ConversationState): Promise<{
    content: string;
    functionCalled?: string;
    updatedClientInfo?: Partial<ClientInfo>;
  }> {
    const messages = this.buildMessagesForLLM(conversation);
    const tools = this.getFunctionDefinitions();

    try {
      const response = await this.callOpenRouter(messages, tools);
      
      // Verificar si hay tool calls
      const toolCalls = response.choices[0]?.message?.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        
        // Procesar function call
        const functionResult = await this.processToolCall(toolCall, conversation);
        
        // Generar respuesta final
        const finalResponse = await this.generateFinalResponse(messages, functionResult);
        
        return {
          content: finalResponse,
          functionCalled: toolCall.function.name,
          updatedClientInfo: functionResult.updatedData
        };
      }

      // Respuesta directa sin tool calls
      return {
        content: response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje.'
      };

    } catch (error) {
      console.error('[ChatbotService] Error generando respuesta IA:', error);
      throw error;
    }
  }

  /**
   * Llamar a OpenRouter API
   */
  private async callOpenRouter(messages: OpenRouterMessage[], tools?: OpenRouterTool[]): Promise<OpenRouterResponse> {
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
      toolsCount: tools?.length || 0
    });

    const response = await axios.post(
      `${this.openRouterConfig.baseURL}/chat/completions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3002',
          'X-Title': 'Embler WhatsApp Chatbot'
        },
        timeout: this.openRouterConfig.timeout
      }
    );

    console.log('[ChatbotService] Respuesta de OpenRouter:', {
      id: response.data.id,
      usage: response.data.usage,
      finishReason: response.data.choices[0]?.finish_reason
    });

    return response.data;
  }

  /**
   * Construir mensajes para el LLM
   */
  private buildMessagesForLLM(conversation: ConversationState): OpenRouterMessage[] {
    const systemMessage: OpenRouterMessage = {
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
    const conversationMessages: OpenRouterMessage[] = conversation.messages
      .slice(-6) // Últimos 6 mensajes para no exceder límites
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    return [systemMessage, ...conversationMessages];
  }

  /**
   * Obtener definiciones de funciones para OpenRouter
   */
  private getFunctionDefinitions(): OpenRouterTool[] {
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
  private async processToolCall(toolCall: any, conversation: ConversationState): Promise<{
    success: boolean;
    updatedData: Partial<ClientInfo>;
    message: string;
  }> {
    try {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log(`[ChatbotService] Procesando tool call: ${functionName}`, args);

      if (functionName === 'recopilar_dato_cliente') {
        // Filtrar solo los datos que tienen valor
        const updatedData: Partial<ClientInfo> = {};
        
        Object.keys(args).forEach(key => {
          if (args[key] && args[key].toString().trim()) {
            updatedData[key as keyof ClientInfo] = args[key];
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

    } catch (error) {
      console.error('[ChatbotService] Error procesando tool call:', error);
      return {
        success: false,
        updatedData: {},
        message: 'Error procesando la información'
      };
    }
  }

  /**
   * Generar respuesta final después de procesar tool call
   */
  private async generateFinalResponse(messages: OpenRouterMessage[], functionResult: any): Promise<string> {
    const finalMessages = [
      ...messages,
      {
        role: 'system' as const,
        content: 'Información guardada correctamente. Continúa la conversación de forma natural.'
      }
    ];

    try {
      const response = await this.callOpenRouter(finalMessages);
      return response.choices[0]?.message?.content || 'Información guardada. ¿En qué más puedo ayudarte?';
    } catch (error) {
      console.error('[ChatbotService] Error generando respuesta final:', error);
      return 'Perfecto, he guardado tu información. ¿Hay algo más que necesites para tu vehículo?';
    }
  }

  /**
   * Determinar siguiente estado basado en información recopilada
   */
  private determineNextStatus(clientInfo: ClientInfo): DataCollectionStatus {
    const hasBasicInfo = !!(clientInfo.nombre && clientInfo.necesidad);
    const hasVehicleInfo = !!(clientInfo.marca && clientInfo.modelo && clientInfo.año);
    
    if (hasBasicInfo && hasVehicleInfo) {
      return 'data_complete';
    } else if (hasBasicInfo) {
      return 'collecting_brand';
    } else if (clientInfo.necesidad) {
      return 'collecting_name';
    } else {
      return 'collecting_part';
    }
  }

  /**
   * Limpiar sesiones expiradas
   */
  private cleanupExpiredSessions(): void {
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
  getStats(): {
    activeConversations: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
  } {
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
  getConversationByPhone(phoneNumber: string): ConversationState | undefined {
    return this.conversations.get(`wa-${phoneNumber}`);
  }

  /**
   * Enviar mensaje por WhatsApp con chatbot
   */
  async sendChatbotMessage(phoneNumber: string, message: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message: message
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      console.error('[ChatbotService] Error enviando mensaje:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

// Instancia singleton
export const chatbotService = new ChatbotService(); 