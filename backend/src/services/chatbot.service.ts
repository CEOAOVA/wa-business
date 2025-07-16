/**
 * Servicio de Chatbot para Backend
 * Adaptado desde la implementación frontend para integrar con WhatsApp
 */
import axios from 'axios';
import { loadEnvWithUnicodeSupport } from '../config/env-loader';
import { whatsappService } from './whatsapp.service';
import { databaseService } from './database.service';
import { getConfig } from '../config';

// Cargar variables de entorno con soporte Unicode
loadEnvWithUnicodeSupport();

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

      // Guardar mensaje del usuario en la base de datos
      await this.saveMessageToDatabase(conversation.phoneNumber, userMsg);

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

      // Guardar respuesta del asistente en la base de datos
      await this.saveMessageToDatabase(conversation.phoneNumber, assistantMsg);

      // Actualizar estado de la conversación si se procesó datos
      if (aiResponse.updatedClientInfo) {
        conversation.clientInfo = { ...conversation.clientInfo, ...aiResponse.updatedClientInfo };
        conversation.status = this.determineNextStatus(conversation.clientInfo);
        
        // Guardar resumen actualizado en la base de datos
        await this.saveConversationSummary(conversation);
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
    const welcomeMessage = "¡Hola! 😊 ¿En qué te puedo ayudar?";

    // Crear o obtener conversación en la base de datos
    try {
      const dbResult = await databaseService.getOrCreateConversationByPhone(phoneNumber);
      console.log(`[ChatbotService] Conversación DB creada/obtenida para ${phoneNumber}`);
    } catch (error) {
      console.error('[ChatbotService] Error creando conversación en DB:', error);
    }

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
  private async callOpenRouter(
    messages: OpenRouterMessage[], 
    tools?: OpenRouterTool[], 
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<OpenRouterResponse> {
    const config = getConfig();
    const apiKey = config.llm.openRouterApiKey;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key no configurada. Agregar OPEN_ROUTER_API_KEY al archivo .env');
    }

    const payload = {
      model: this.openRouterConfig.model,
      messages: messages,
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1000,
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
      content: `Eres un vendedor especialista en refacciones automotrices de Embler. Eres directo, eficiente y confirmas detalles.

TU OBJETIVO: Vender refacciones siendo útil y confirmando información.

INFORMACIÓN QUE NECESITAS:
- Qué refacción necesita
- Marca, modelo y año del vehículo
- Nombre del cliente

COMPORTAMIENTO:
✅ Sé DIRECTO - no preámbulos largos
✅ CONFIRMA los detalles que te dan: "Perfecto, pastillas para tu Toyota Corolla 2018"
✅ Si falta info, pregunta UNA cosa a la vez
✅ Usa el VIN cuando lo tengas para precisión
✅ Presenta opciones con precios claros
✅ Facilita la compra

CÓMO RESPONDES:
✅ "Perfecto, [producto] para tu [vehículo]. ¿Cuál es tu nombre?"
✅ "Entendido, necesitas [refacción]. ¿De qué año es tu [marca]?"
✅ "Tengo [producto] en $[precio]. ¿Te sirve?"

❌ NO seas extenso
❌ NO repitas información ya confirmada
❌ NO hagas múltiples preguntas de golpe

INFORMACIÓN ACTUAL:
${JSON.stringify(conversation.clientInfo, null, 2)}

ESTADO: ${conversation.status}

Sé conversacional, directo y confirma todo.`
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
   * Genera un resumen inteligente de la conversación usando IA
   */
  async generateConversationSummary(conversationId: string, messages: any[]): Promise<{
    text: string;
    keyPoints: {
      clientName?: string;
      clientPhone?: string;
      product?: string;
      vehicle?: {
        brand?: string;
        model?: string;
        year?: number;
        engine?: string;
        vin?: string;
      };
      location?: {
        postalCode?: string;
        city?: string;
      };
      status?: string;
      nextAction?: string;
      estimatedValue?: string;
    };
  }> {
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
      const response = await this.callOpenRouter([
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
        const responseText = response.choices[0]?.message?.content?.trim() || '{}';
        // Extraer JSON si viene con texto adicional
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;
        summaryData = JSON.parse(jsonText);
      } catch (parseError) {
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
          clientName: summaryData.keyPoints?.clientName,
          product: summaryData.keyPoints?.product,
          vehicle: summaryData.keyPoints?.vehicle || {},
          location: summaryData.keyPoints?.location || {},
          status: summaryData.keyPoints?.status || 'En proceso',
          nextAction: summaryData.keyPoints?.nextAction || 'Continuar conversación',
          estimatedValue: summaryData.keyPoints?.estimatedValue
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

    } catch (error: any) {
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

  /**
   * Guardar mensaje en la base de datos
   */
  private async saveMessageToDatabase(phoneNumber: string, message: ChatbotMessage): Promise<void> {
    try {
      // Obtener conversación de la base de datos
      const dbResult = await databaseService.getOrCreateConversationByPhone(phoneNumber);
      
      // Determinar el ID de conversación para Supabase
      let conversationId: string | undefined;
      
      if (dbResult) {
        conversationId = dbResult.id;
      }

      if (!conversationId) {
        console.warn(`[ChatbotService] No se pudo obtener conversationId para ${phoneNumber}`);
        return;
      }

      // Guardar mensaje usando el servicio híbrido
      const result = await databaseService.createChatbotMessage({
        conversationId,
        contactPhone: phoneNumber,
        senderType: message.role === 'user' ? 'user' : 'bot',
        content: message.content,
        messageType: 'text',
        metadata: {
          chatbotId: message.id,
          functionCalled: message.functionCalled,
          clientData: message.clientData
        }
      });

      if (result.success) {
        console.log(`[ChatbotService] Mensaje guardado en DB: ${result.messageId}`);
      } else {
        console.warn(`[ChatbotService] No se pudo guardar mensaje en DB para ${phoneNumber}`);
      }
         } catch (error) {
       console.error('[ChatbotService] Error guardando mensaje en DB:', error);
     }
   }

   /**
    * Guardar resumen de conversación en la base de datos
    */
   private async saveConversationSummary(conversation: ConversationState): Promise<void> {
     try {
       // Obtener conversación de la base de datos
       const dbResult = await databaseService.getOrCreateConversationByPhone(conversation.phoneNumber);
       
       // Determinar el ID de conversación para Supabase
       let conversationId: string | undefined;
       
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
       const result = await databaseService.saveChatbotConversationSummary(
         conversationId,
         summaryData,
         'gemini-2.5-flash-chatbot'
       );

       if (result.success) {
         console.log(`[ChatbotService] Resumen guardado en DB: ${result.summaryId}`);
       } else {
         console.warn(`[ChatbotService] No se pudo guardar resumen en DB para ${conversation.phoneNumber}`);
       }
     } catch (error) {
       console.error('[ChatbotService] Error guardando resumen en DB:', error);
     }
   }
 }

// Instancia singleton
export const chatbotService = new ChatbotService(); 