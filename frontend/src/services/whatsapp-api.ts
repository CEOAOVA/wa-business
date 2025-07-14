/**
 * Servicio de WhatsApp API para el frontend
 */

// Configuración del backend - Usando variables de entorno
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendTemplateRequest {
  to: string;
  template: string;
  language?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  data?: T;
}

export interface WhatsAppStatus {
  configured: boolean;
  phoneId: string;
  tokenPresent: boolean;
  tokenLength: number;
  apiVersion: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: string;
  contact?: {
    name: string;
    wa_id: string;
  };
  read: boolean;
}

export interface MessagesResponse {
  success: boolean;
  messages: IncomingMessage[];
  total: number;
  unread: number;
}

class WhatsAppApiService {
  private baseUrl: string = `${BACKEND_URL}/api/chat`;
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🌐 [WhatsAppApi] Haciendo petición a: ${url}`);
    console.log(`🌐 [WhatsAppApi] Opciones:`, options);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log(`🌐 [WhatsAppApi] Status de respuesta: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ [WhatsAppApi] Error HTTP: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`🌐 [WhatsAppApi] Datos recibidos:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ [WhatsAppApi] Error en request a ${url}:`, error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('No se puede conectar al servidor. ¿Está el backend corriendo?');
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(data: SendMessageRequest): Promise<ApiResponse> {
    console.log('📤 Enviando mensaje:', data);
    
    return this.request('/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Enviar template
   */
  async sendTemplate(data: SendTemplateRequest): Promise<ApiResponse> {
    console.log('📤 Enviando template:', data);
    
    return this.request('/template', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Obtener estado de configuración
   */
  async getStatus(): Promise<ApiResponse<{ status: WhatsAppStatus }>> {
    return this.request('/status');
  }

  /**
   * Obtener información del número
   */
  async getPhoneInfo(): Promise<ApiResponse> {
    return this.request('/info');
  }

  /**
   * Ejecutar prueba
   */
  async runTest(data?: Partial<SendMessageRequest>): Promise<ApiResponse> {
    return this.request('/test', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }

  /**
   * Configurar webhook
   */
  async setWebhook(callbackUrl: string): Promise<ApiResponse> {
    return this.request('/webhook/config', {
      method: 'POST',
      body: JSON.stringify({ callbackUrl })
    });
  }

  /**
   * Validar número de teléfono (frontend)
   */
  validatePhoneNumber(phoneNumber: string): { isValid: boolean; formatted: string; error?: string } {
    // Limpiar el número (solo dígitos)
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // Verificar longitud mínima
    if (cleaned.length < 10) {
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Número muy corto (mínimo 10 dígitos)'
      };
    }

    // Verificar longitud máxima
    if (cleaned.length > 15) {
      return {
        isValid: false,
        formatted: cleaned,
        error: 'Número muy largo (máximo 15 dígitos)'
      };
    }

    // Para números mexicanos, asegurar que empiece con 52
    let formatted = cleaned;
    if (cleaned.length === 10 && !cleaned.startsWith('52')) {
      formatted = '52' + cleaned;
    }

    return {
      isValid: true,
      formatted
    };
  }

  /**
   * Formatear número para mostrar
   */
  formatPhoneForDisplay(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
      // Formato mexicano: +52 55 1234 5678
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
    }
    
    if (cleaned.length === 10) {
      // Formato mexicano sin código país: 55 1234 5678
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }
    
    return phoneNumber;
  }

  /**
   * Obtener estado de conexión
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtener mensajes entrantes
   */
  async getIncomingMessages(limit: number = 50, offset: number = 0): Promise<MessagesResponse> {
    console.log(`🔍 [WhatsAppApi] Obteniendo mensajes entrantes (limit: ${limit}, offset: ${offset})`);
    
    try {
      const response = await this.request(`/messages?limit=${limit}&offset=${offset}`, {
        method: 'GET'
      }) as any;
      
      console.log('🔍 [WhatsAppApi] Respuesta cruda del backend:', response);
      
      // Convertir timestamps de string a Date
      if (response.success && response.messages) {
        console.log(`🔍 [WhatsAppApi] Convirtiendo ${response.messages.length} mensajes`);
        response.messages = response.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        console.log('🔍 [WhatsAppApi] Mensajes con timestamps convertidos:', response.messages);
      }
      
      return response;
    } catch (error) {
      console.error('❌ [WhatsAppApi] Error obteniendo mensajes:', error);
      throw error;
    }
  }

  /**
   * Marcar mensaje como leído
   */
  async markMessageAsRead(messageId: string): Promise<ApiResponse> {
    return this.request(`/messages/${messageId}/read`, {
      method: 'PUT'
    });
  }

  /**
   * Limpiar mensajes antiguos
   */
  async cleanupOldMessages(hours: number = 24): Promise<ApiResponse> {
    return this.request(`/messages/cleanup?hours=${hours}`, {
      method: 'DELETE'
    });
  }
}

// Instancia singleton
export const whatsappApi = new WhatsAppApiService();

// Exports adicionales
export default whatsappApi; 