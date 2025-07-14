// =====================================
// TIPOS DEL CHATBOT - REPUESTOS AUTOMOTRICES
// =====================================

// Información del vehículo del cliente
export interface VehicleInfo {
  marca?: string;          // Toyota, Honda, Ford, etc.
  modelo?: string;         // Corolla, Civic, Focus, etc.
  año?: number;           // 2018, 2020, etc.
  litraje?: string;       // "1.6L", "2.0L", "3.5L", etc.
  numeroSerie?: string;   // Número de serie del motor
  modeloEspecial?: string; // "Sport", "Turbo", "Hybrid", etc.
}

// Información del cliente
export interface ClientInfo {
  nombre?: string;
  piezaNecesaria?: string; // "filtro de aceite", "pastillas de freno", etc.
  vehiculo?: VehicleInfo;
}

// Estados de recopilación de datos
export type DataCollectionStatus = 
  | 'greeting'           // Saludo inicial
  | 'collecting_name'    // Recopilando nombre
  | 'collecting_part'    // Qué pieza necesita
  | 'collecting_brand'   // Marca del vehículo
  | 'collecting_model'   // Modelo del vehículo
  | 'collecting_year'    // Año del vehículo
  | 'collecting_engine'  // Litraje del motor
  | 'collecting_serial'  // Número de serie
  | 'collecting_special' // Si es modelo especial
  | 'data_complete'     // Información completa
  | 'generating_quote'; // Generando cotización

// Mensaje de chat con contexto
export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  functionCalled?: string;
  clientData?: Partial<ClientInfo>;
}

// Estado de la conversación
export interface ConversationState {
  conversationId: string;
  userId: string;
  status: DataCollectionStatus;
  clientInfo: ClientInfo;
  messages: ChatbotMessage[];
  createdAt: Date;
  lastActivity: Date;
  isThinking: boolean;
}

// =====================================
// TIPOS DE OPENROUTER/GEMINI
// =====================================

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterOptions {
  messages: OpenRouterMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: OpenRouterTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

// =====================================
// TIPOS DE FUNCTIONS
// =====================================

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  nextStep?: DataCollectionStatus;
  message?: string;
}

export interface FunctionContext {
  userId: string;
  conversationId: string;
  currentClientInfo: ClientInfo;
  currentStatus: DataCollectionStatus;
}

// Argumentos específicos para cada function
export interface CollectClientDataArgs {
  campo: 'nombre' | 'pieza' | 'marca' | 'modelo' | 'año' | 'litraje' | 'numeroSerie' | 'modeloEspecial';
  valor: string;
}

export interface GenerateQuoteArgs {
  clientInfo: ClientInfo;
  includeAlternatives?: boolean;
}

export interface ValidateVehicleDataArgs {
  vehiculo: VehicleInfo;
}

// =====================================
// TIPOS DEL HOOK useChatbot
// =====================================

export interface UseChatbotReturn {
  // Estado
  conversationState: ConversationState | null;
  isThinking: boolean;
  error: string | null;
  
  // Métodos
  sendMessage: (message: string) => Promise<void>;
  resetConversation: () => Promise<void>;
  getConversationHistory: () => ChatbotMessage[];
  
  // Información del cliente (para debugging/UI)
  clientInfo: ClientInfo;
  collectionProgress: {
    status: DataCollectionStatus;
    completedFields: string[];
    missingFields: string[];
    progressPercentage: number;
  };

  // Métodos de utilidad adicionales
  validateChatbot?: () => { isValid: boolean; errors: string[] };
  getChatbotStats?: () => any;
  isDataComplete?: () => boolean;
  getNextField?: () => string | null;
}

// =====================================
// CONFIGURACIÓN
// =====================================

export interface ChatbotConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export const DEFAULT_CONFIG: ChatbotConfig = {
  apiKey: '', // Se obtiene de variables de entorno
  model: 'google/gemini-2.5-flash-lite-preview-06-17',
  baseURL: 'https://openrouter.ai/api/v1',
  temperature: 0.7,
  maxTokens: 1000,
  timeoutMs: 30000,
};

// =====================================
// UTILIDADES DE TIPO
// =====================================

export type RequiredVehicleFields = keyof Required<VehicleInfo>;
export type RequiredClientFields = keyof Required<ClientInfo>;

// Helper para verificar si los datos están completos
export function isVehicleInfoComplete(vehiculo: VehicleInfo): vehiculo is Required<VehicleInfo> {
  return !!(
    vehiculo.marca &&
    vehiculo.modelo &&
    vehiculo.año &&
    vehiculo.litraje &&
    vehiculo.numeroSerie
    // modeloEspecial es opcional
  );
}

export function isClientInfoComplete(clientInfo: ClientInfo): boolean {
  return !!(
    clientInfo.nombre &&
    clientInfo.piezaNecesaria &&
    clientInfo.vehiculo &&
    isVehicleInfoComplete(clientInfo.vehiculo)
  );
} 