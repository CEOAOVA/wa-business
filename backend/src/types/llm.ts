/**
 * Tipos para el sistema LLM (OpenRouter + Gemini)
 * Migrado desde Backend-Embler y adaptado para WhatsApp Backend
 */

// ===== TIPOS BASE LLM =====

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string | null;
      function_call?: FunctionCall;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterTool {
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

// ===== FUNCTION CALLING =====

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ===== CHAT COMPLETION =====

export interface ChatCompletionOptions {
  model?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  functions?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  function_call?: 'auto' | 'none' | { name: string };
  tools?: OpenRouterTool[];
  tool_choice?: 'auto' | 'none' | { type: string; function: { name: string } };
}

export interface ChatCompletionResponse {
  content: string | null;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ===== CONVERSACIÓN =====

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  function_call?: FunctionCall;
  tool_calls?: ToolCall[];
  functionCalled?: string;
  clientData?: Partial<ClientInfo>;
}

export interface ClientInfo {
  // Información básica del cliente
  nombre?: string;
  telefono?: string;
  
  // Información del vehículo
  marca?: string;
  modelo?: string;
  año?: number;
  litraje?: string;
  vin?: string;
  numeroSerie?: string;
  modeloEspecial?: string;
  
  // Información de la consulta
  necesidad?: string;
  codigoProducto?: string;
  descripcionProducto?: string;
  
  // Información de ubicación y entrega
  ubicacion?: string;
  direccion?: string;
  codigoPostal?: string;
  ciudad?: string;
  estado?: string;
  
  // Información comercial
  presupuesto?: string;
  tipoCompra?: 'local' | 'envio';
  urgencia?: 'baja' | 'media' | 'alta';
}

export type ConversationStatus = 
  | 'greeting'
  | 'collecting_info'
  | 'searching_products'
  | 'showing_results'
  | 'processing_selection'
  | 'confirming_purchase'
  | 'collecting_shipping'
  | 'generating_ticket'
  | 'completed'
  | 'advisor_requested'
  | 'error';

export interface ConversationState {
  conversationId: string;
  phoneNumber: string;
  posId: string;
  status: ConversationStatus;
  clientInfo: ClientInfo;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
  
  // Estados adicionales para flujos complejos
  currentFlow?: string;
  selectedProduct?: {
    code: string;
    name: string;
    price: number;
    quantity: number;
  };
  pendingConfirmation?: {
    type: 'purchase' | 'shipping' | 'selection';
    data: any;
  };
  isFirstMessage?: boolean;
  sessionExpiry?: Date;
}

// ===== PROMPTS Y VARIABLES =====

export interface ConversationPromptVariables {
  query: string;
  conversation_history?: string;
  pos_name?: string;
  temperature?: number;
  max_tokens?: number;
  client_info?: Partial<ClientInfo>;
}

export interface ProcessResult {
  content: string;
  functionCalled: boolean;
  functionName?: string;
  functionResult?: any;
  updatedClientInfo?: Partial<ClientInfo>;
  conversationState?: ConversationState;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ===== SESIONES Y CACHÉ =====

export interface SessionData {
  conversationId: string;
  posId: string;
  messages: OpenRouterMessage[];
  conversationState?: ConversationState;
  lastActivity: Date;
  isFirstMessage: boolean;
  clientInfo: ClientInfo;
}

export interface SessionsByPos {
  [posId: string]: Map<string, SessionData>;
}

// ===== ANÁLISIS DE INTENCIÓN =====

export interface IntentAnalysis {
  intent: 'product_search' | 'inventory_check' | 'price_inquiry' | 'purchase' | 'support' | 'general';
  confidence: number;
  extractedEntities: Array<{
    entity: 'product_keyword' | 'product_code' | 'vehicle_brand' | 'vehicle_model' | 'vehicle_year' | 'vin';
    value: string;
    normalizedValue?: string;
    confidence: number;
  }>;
  requiresFunction: boolean;
  suggestedFunction?: string;
  suggestedArgs?: Record<string, any>;
}

// ===== MÉTRICAS Y LOGGING =====

export interface LlmInteractionLog {
  sessionId?: string;
  prompt?: string;
  response?: string;
  functionCallName?: string;
  functionCallArgs?: any;
  modelUsed: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ConversationMetrics {
  activeConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  successfulFunctionCalls: number;
  failedFunctionCalls: number;
  totalTokensUsed: number;
  avgResponseTime: number;
}

// ===== CONFIGURACIÓN DE FUNCIONES =====

export interface FunctionExecutionContext {
  pointOfSaleId: string;
  userId?: string;
  sessionId?: string;
  model?: string;
  conversationId?: string;
}

export interface FunctionExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresFollowUp?: boolean;
  nextAction?: 'await_confirmation' | 'request_info' | 'escalate_advisor';
  message?: string;
} 