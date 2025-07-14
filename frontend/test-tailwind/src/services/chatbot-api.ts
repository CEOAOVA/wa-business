/**
 * Servicio de API para el Chatbot con WhatsApp
 */

// Configuración del backend
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export interface ChatbotSendMessageRequest {
  phoneNumber: string;
  message: string;
}

export interface ChatbotResponse {
  success: boolean;
  message?: string;
  response?: string;
  messageId?: string;
  conversationState?: any;
  error?: string;
}

export interface ChatbotConversation {
  id: string;
  phoneNumber: string;
  status: string;
  clientInfo: any;
  messagesCount: number;
  createdAt: string;
  lastActivity: string;
}

export interface ChatbotStats {
  activeConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  timestamp: string;
  uptime: number;
}

class ChatbotApiService {
  private baseUrl: string = `${BACKEND_URL}/api/chatbot`;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🤖 [REQUEST] 🚀 INICIANDO petición a: ${url}`);
    console.log(`🤖 [REQUEST] 📋 Opciones:`, options);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`🤖 [ChatbotApi] Status de respuesta: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ [ChatbotApi] Error HTTP: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`🤖 [REQUEST] ✅ ÉXITO - Datos recibidos:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ [REQUEST] 🚨 ERROR en request a ${url}:`, error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const errorMsg = 'No se puede conectar al servidor. ¿Está el backend corriendo?';
        console.error(`❌ [REQUEST] 🚨 ERROR DE CONEXIÓN:`, errorMsg);
        throw new Error(errorMsg);
      }
      
      console.error(`❌ [REQUEST] 🚨 ERROR GENERAL:`, error);
      throw error;
    }
  }

  /**
   * Enviar mensaje y generar respuesta con IA
   */
  async sendMessage(data: ChatbotSendMessageRequest): Promise<ChatbotResponse> {
    console.log('🤖 [API] sendMessage llamado con:', data);
    
    const result = await this.request<ChatbotResponse>('/send-message', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    console.log('🤖 [API] sendMessage resultado:', result);
    return result;
  }

  /**
   * Probar respuesta de IA sin enviar por WhatsApp
   */
  async testAI(data: ChatbotSendMessageRequest): Promise<ChatbotResponse> {
    console.log('🤖 [API] testAI llamado con:', data);
    
    const result = await this.request<ChatbotResponse>('/test-ai', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    console.log('🤖 [API] testAI resultado:', result);
    return result;
  }

  /**
   * Obtener conversación por número de teléfono
   */
  async getConversation(phoneNumber: string): Promise<{ success: boolean; conversation?: ChatbotConversation; message?: string }> {
    console.log(`🤖 Obteniendo conversación para: ${phoneNumber}`);
    
    return this.request<{ success: boolean; conversation?: ChatbotConversation; message?: string }>(`/conversation/${phoneNumber}`, {
      method: 'GET'
    });
  }

  /**
   * Obtener estadísticas del chatbot
   */
  async getStats(): Promise<{ success: boolean; stats?: ChatbotStats; error?: string }> {
    console.log('🤖 Obteniendo estadísticas del chatbot');
    
    return this.request<{ success: boolean; stats?: ChatbotStats; error?: string }>('/stats', {
      method: 'GET'
    });
  }

  /**
   * Procesar webhook (simular mensaje entrante)
   */
  async processWebhook(data: { phoneNumber: string; message: string; contactName?: string }): Promise<ChatbotResponse> {
    console.log('🤖 Procesando webhook:', data);
    
    return this.request<ChatbotResponse>('/process-webhook', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Verificar si el backend está disponible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ [ChatbotApi] Error verificando conexión:', error);
      return false;
    }
  }
}

// Instancia singleton
export const chatbotApi = new ChatbotApiService();
export default chatbotApi; 