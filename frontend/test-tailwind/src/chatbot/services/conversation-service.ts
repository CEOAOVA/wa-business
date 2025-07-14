import type {
  ConversationState,
  ChatbotMessage,
  ClientInfo,
  DataCollectionStatus,
  FunctionContext,
  OpenRouterMessage
} from '../types/chatbot';
import { OpenRouterClient, createAutomotiveSystemMessage } from './openrouter-client';
import { AutopartsFunctionService } from './autoparts-functions';
import { AutopartsFunctionHandler } from './function-handler';

/**
 * Servicio principal de conversación para chatbot de repuestos automotrices
 * Maneja el estado de la conversación y la lógica de recopilación de datos
 */
export class AutopartsConversationService {
  private conversations = new Map<string, ConversationState>();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  
  private readonly openrouterClient: OpenRouterClient;
  private readonly functionService: AutopartsFunctionService;
  private readonly functionHandler: AutopartsFunctionHandler;

  constructor() {
    this.openrouterClient = new OpenRouterClient();
    this.functionService = new AutopartsFunctionService();
    this.functionHandler = new AutopartsFunctionHandler(
      this.functionService,
      this.openrouterClient
    );

    // Limpieza automática de sesiones expiradas
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Iniciar nueva conversación
   */
  async startConversation(conversationId: string, userId: string): Promise<{
    conversationState: ConversationState;
    welcomeMessage: string;
  }> {
    console.log(`[ConversationService] Iniciando conversación ${conversationId} para usuario ${userId}`);

    const welcomeMessage = "¡Hola! 👋 Soy tu asistente especializado en repuestos automotrices de Embler. Te ayudo a encontrar exactamente lo que necesitas para tu vehículo. ¿En qué puedo ayudarte hoy?";

    const conversationState: ConversationState = {
      conversationId,
      userId,
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
      lastActivity: new Date(),
      isThinking: false
    };

    this.conversations.set(conversationId, conversationState);

    return {
      conversationState,
      welcomeMessage
    };
  }

  /**
   * Procesar mensaje del usuario
   */
  async processMessage(
    conversationId: string,
    userMessage: string,
    userId: string
  ): Promise<{
    content: string;
    conversationState: ConversationState;
    functionCalled: boolean;
    functionName?: string;
    error?: string;
  }> {
    // Obtener o crear conversación
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      const result = await this.startConversation(conversationId, userId);
      conversation = result.conversationState;
    }

    // Actualizar actividad
    conversation.lastActivity = new Date();
    conversation.isThinking = true;

    // Agregar mensaje del usuario
    const userMsg: ChatbotMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    conversation.messages.push(userMsg);

    try {
      // Construir contexto de la conversación
      const messages = this.buildMessagesForLLM(conversation);
      const context: FunctionContext = {
        userId,
        conversationId,
        currentClientInfo: conversation.clientInfo,
        currentStatus: conversation.status
      };

      console.log(`[ConversationService] Procesando mensaje: "${userMessage.substring(0, 50)}..."`);

      // Primera llamada al LLM con funciones disponibles
      const response = await this.openrouterClient.chatWithTools(
        messages,
        this.functionService.getFunctionDefinitions(),
        {
          temperature: 0.7,
          max_tokens: 1000
        }
      );

      conversation.isThinking = false;

      // Verificar si hay tool calls
      const hasToolCalls = this.functionHandler.hasToolCalls(response);

      if (hasToolCalls) {
        console.log('[ConversationService] Tool call detectado, procesando...');
        
        // Procesar tool call
        const toolCall = this.functionHandler.extractToolCall(response);
        if (toolCall) {
          const result = await this.functionHandler.processToolCall(
            toolCall,
            messages,
            {
              messages,
              tools: this.functionService.getFunctionDefinitions()
            },
            context
          );

          // Actualizar estado de la conversación basado en el resultado
          if (result.functionResult.success) {
            this.updateConversationFromFunctionResult(conversation, result.functionResult);
          }

          // Agregar respuesta del asistente
          const assistantMsg: ChatbotMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: result.finalContent,
            timestamp: new Date(),
            functionCalled: toolCall.name,
            clientData: conversation.clientInfo
          };

          conversation.messages.push(assistantMsg);

          return {
            content: result.finalContent,
            conversationState: conversation,
            functionCalled: true,
            functionName: toolCall.name
          };
        }
      }

      // Respuesta directa sin tool calls
      const content = response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?';

      const assistantMsg: ChatbotMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content,
        timestamp: new Date()
      };

      conversation.messages.push(assistantMsg);

      return {
        content,
        conversationState: conversation,
        functionCalled: false
      };

    } catch (error) {
      console.error('[ConversationService] Error procesando mensaje:', error);
      
      conversation.isThinking = false;
      
      const errorMessage = 'Lo siento, ocurrió un error técnico. ¿Puedes intentar de nuevo? Si el problema persiste, un agente humano te ayudará pronto.';
      
      const errorMsg: ChatbotMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      conversation.messages.push(errorMsg);

      return {
        content: errorMessage,
        conversationState: conversation,
        functionCalled: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Obtener estado de una conversación
   */
  getConversation(conversationId: string): ConversationState | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Obtener historial de mensajes
   */
  getConversationHistory(conversationId: string): ChatbotMessage[] {
    const conversation = this.conversations.get(conversationId);
    return conversation?.messages || [];
  }

  /**
   * Resetear conversación
   */
  async resetConversation(conversationId: string, userId: string): Promise<ConversationState> {
    this.conversations.delete(conversationId);
    const result = await this.startConversation(conversationId, userId);
    return result.conversationState;
  }

  /**
   * Obtener estadísticas del servicio
   */
  getStats(): {
    totalConversations: number;
    activeConversations: number;
    conversationsByStatus: Record<DataCollectionStatus, number>;
    avgMessagesPerConversation: number;
  } {
    const conversations = Array.from(this.conversations.values());
    const now = Date.now();
    const activeConversations = conversations.filter(
      conv => now - conv.lastActivity.getTime() < this.SESSION_TIMEOUT_MS
    );

    const conversationsByStatus: Record<DataCollectionStatus, number> = {
      'greeting': 0,
      'collecting_name': 0,
      'collecting_part': 0,
      'collecting_brand': 0,
      'collecting_model': 0,
      'collecting_year': 0,
      'collecting_engine': 0,
      'collecting_serial': 0,
      'collecting_special': 0,
      'data_complete': 0,
      'generating_quote': 0
    };

    conversations.forEach(conv => {
      conversationsByStatus[conv.status]++;
    });

    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const avgMessagesPerConversation = conversations.length > 0 ? totalMessages / conversations.length : 0;

    return {
      totalConversations: conversations.length,
      activeConversations: activeConversations.length,
      conversationsByStatus,
      avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100
    };
  }

  // ============================
  // MÉTODOS PRIVADOS
  // ============================

  /**
   * Construir mensajes para el LLM
   */
  private buildMessagesForLLM(conversation: ConversationState): OpenRouterMessage[] {
    const systemMessage = createAutomotiveSystemMessage();
    
    // Agregar contexto específico del cliente si existe
    if (Object.keys(conversation.clientInfo).length > 0) {
      systemMessage.content += `\n\nINFORMACIÓN ACTUAL DEL CLIENTE:\n${JSON.stringify(conversation.clientInfo, null, 2)}`;
    }

    // Agregar estado actual de recopilación
    systemMessage.content += `\n\nESTADO ACTUAL: ${conversation.status}`;
    systemMessage.content += `\nPROGRESO: ${this.getProgressSummary(conversation)}`;

    // Convertir mensajes de la conversación
    const conversationMessages: OpenRouterMessage[] = conversation.messages
      .slice(-8) // Últimos 8 mensajes para no exceder límites
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    return [systemMessage, ...conversationMessages];
  }

  /**
   * Actualizar conversación basado en resultado de función
   */
  private updateConversationFromFunctionResult(
    conversation: ConversationState,
    functionResult: any
  ): void {
    // Actualizar información del cliente si la función la proporcionó
    if (functionResult.data?.clientInfo) {
      conversation.clientInfo = { ...conversation.clientInfo, ...functionResult.data.clientInfo };
    }

    // Actualizar estado si la función lo especificó
    if (functionResult.nextStep) {
      conversation.status = functionResult.nextStep;
    }

    // Caso específico para recopilación de datos
    if (functionResult.data?.campo && functionResult.data?.valor) {
      this.updateClientInfoField(conversation.clientInfo, functionResult.data.campo, functionResult.data.valor);
    }
  }

  /**
   * Actualizar campo específico de información del cliente
   */
  private updateClientInfoField(clientInfo: ClientInfo, campo: string, valor: any): void {
    if (campo === 'nombre') {
      clientInfo.nombre = valor;
    } else if (campo === 'pieza') {
      clientInfo.piezaNecesaria = valor;
    } else {
      // Campos del vehículo
      if (!clientInfo.vehiculo) {
        clientInfo.vehiculo = {};
      }
      (clientInfo.vehiculo as any)[campo] = valor;
    }
  }

  /**
   * Obtener resumen de progreso
   */
  private getProgressSummary(conversation: ConversationState): string {
    const { clientInfo } = conversation;
    const completed: string[] = [];
    const missing: string[] = [];

    // Verificar campos completados
    if (clientInfo.nombre) completed.push('nombre');
    else missing.push('nombre');

    if (clientInfo.piezaNecesaria) completed.push('pieza');
    else missing.push('pieza');

    if (clientInfo.vehiculo) {
      const v = clientInfo.vehiculo;
      if (v.marca) completed.push('marca'); else missing.push('marca');
      if (v.modelo) completed.push('modelo'); else missing.push('modelo');
      if (v.año) completed.push('año'); else missing.push('año');
      if (v.litraje) completed.push('litraje'); else missing.push('litraje');
      if (v.numeroSerie) completed.push('numeroSerie'); else missing.push('numeroSerie');
    } else {
      missing.push('marca', 'modelo', 'año', 'litraje', 'numeroSerie');
    }

    const progress = Math.round((completed.length / (completed.length + missing.length)) * 100);
    
    return `${progress}% completado. Tenemos: [${completed.join(', ')}]. Falta: [${missing.join(', ')}]`;
  }

  /**
   * Limpiar sesiones expiradas
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ConversationService] Limpiadas ${cleaned} sesiones expiradas`);
    }
  }

  /**
   * Obtener configuración del cliente OpenRouter
   */
  getClientConfig() {
    return this.openrouterClient.getConfig();
  }

  /**
   * Validar estado del servicio
   */
  validateService(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar cliente OpenRouter
    const clientValidation = this.openrouterClient.validateConfig();
    if (!clientValidation.isValid) {
      errors.push(...clientValidation.errors.map(e => `OpenRouter: ${e}`));
    }

    // Validar funciones
    const functionValidation = this.functionHandler.validateFunctions();
    if (!functionValidation.isValid) {
      errors.push(...functionValidation.errors.map(e => `Functions: ${e}`));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 