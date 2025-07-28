/**
 * Servicio de WhatsApp API para el frontend
 */

// Configuración del backend - Usando variables de entorno
// Use relative path to leverage Vite proxy in development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'https://dev-apiwaprueba.aova.mx');

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendTemplateRequest {
  to: string;
  template: string;
  language?: string;
}

import type { ApiResponse } from '../types';

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
  private baseUrl: string = `${BACKEND_URL}/api`;
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
  async sendMessage(data: SendMessageRequest): Promise<ApiResponse<any>> {
    console.log('📤 Enviando mensaje:', data);
    
    return this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Obtener mensajes
   */
  async getMessages(): Promise<ApiResponse<any[]>> {
    console.log('📥 Obteniendo mensajes');
    
    return this.request('/chat/messages', {
      method: 'GET'
    });
  }

  /**
   * Enviar template
   */
  async sendTemplate(data: SendTemplateRequest): Promise<ApiResponse<any>> {
    console.log('📤 Enviando template:', data);
    
    return this.request('/chat/template', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Obtener estado de configuración
   */
  async getStatus(): Promise<ApiResponse<{ status: WhatsAppStatus }>> {
    return this.request('/chat/status');
  }

  /**
   * Obtener información del número
   */
  async getPhoneInfo(): Promise<ApiResponse<any>> {
    return this.request('/chat/info');
  }

  /**
   * Ejecutar prueba
   */
  async runTest(data?: Partial<SendMessageRequest>): Promise<ApiResponse<any>> {
    return this.request('/chat/test', {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }

  /**
   * Configurar webhook
   */
  async setWebhook(callbackUrl: string): Promise<ApiResponse<any>> {
    return this.request('/chat/webhook/config', {
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
   * Formatear número para envío (compatible con backend)
   */
  formatPhoneForSending(phoneNumber: string): string {
    // Limpiar el número (solo dígitos)
    let cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // Si el número tiene más de 10 dígitos, tomar los últimos 10
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(-10);
      console.log(`📱 [Frontend] Número truncado a últimos 10 dígitos: ${cleaned}`);
    }
    
    // Si tiene 10 dígitos y no empieza con 52, agregar código de país
    if (cleaned.length === 10 && !cleaned.startsWith('52')) {
      return '52' + cleaned;
    }
    
    // Si ya tiene código de país, devolver tal como está
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
      return cleaned;
    }
    
    // Para otros casos, devolver el número limpio
    return cleaned;
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
      const response = await this.request(`/chat/messages?limit=${limit}&offset=${offset}`, {
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
  async markMessageAsRead(messageId: string): Promise<ApiResponse<any>> {
    return this.request(`/chat/messages/${messageId}/read`, {
      method: 'PUT'
    });
  }

  /**
   * Limpiar mensajes antiguos
   */
  async cleanupOldMessages(hours: number = 24): Promise<ApiResponse<any>> {
    return this.request(`/chat/messages/cleanup?hours=${hours}`, {
      method: 'DELETE'
    });
  }

  /**
   * Obtener archivos de media
   */
  async getMediaFiles(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/media/stats');
  }

  // ============================================
  // NUEVOS MÉTODOS PARA TAKEOVER Y RESÚMENES
  // ============================================

  /**
   * Cambiar modo de IA para una conversación (takeover)
   */
  async setConversationMode(conversationId: string, mode: 'active' | 'inactive', agentId?: string): Promise<ApiResponse<{
    conversationId: string;
    aiMode: 'active' | 'inactive';
    assignedAgentId?: string;
  }>> {
    console.log(`🤖 [WhatsAppApi] Cambiando modo IA: ${conversationId} -> ${mode}`, agentId ? `(Agente: ${agentId})` : '');
    
    const requestData: any = { mode };
    if (mode === 'inactive' && agentId) {
      requestData.agentId = agentId;
    }

    return this.request<{
      conversationId: string;
      aiMode: 'active' | 'inactive';
      assignedAgentId?: string;
    }>(`/chat/conversations/${conversationId}/set-mode`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  /**
   * Obtener modo actual de IA para una conversación
   */
  async getConversationMode(conversationId: string): Promise<ApiResponse<{
    conversationId: string;
    aiMode: 'active' | 'inactive';
    assignedAgentId?: string;
  }>> {
    console.log(`🔍 [WhatsAppApi] Consultando modo IA para: ${conversationId}`);
    
    return this.request<{
      conversationId: string;
      aiMode: 'active' | 'inactive';
      assignedAgentId?: string;
    }>(`/chat/conversations/${conversationId}/mode`);
  }

  /**
   * Generar resumen de conversación
   */
  async generateConversationSummary(conversationId: string, forceRegenerate: boolean = false): Promise<ApiResponse<{
    summary: string;
    keyPoints: {
      clientName?: string;
      product?: string;
      vehicle?: {
        brand?: string;
        model?: string;
        year?: number;
        engine?: string;
      };
      location?: {
        postalCode?: string;
        city?: string;
      };
      status?: string;
      nextAction?: string;
      estimatedValue?: string;
    };
    isFromCache: boolean;
    conversationId: string;
    messageCount: number;
    generatedAt: string;
  }>> {
    console.log(`📝 [WhatsAppApi] Generando resumen para: ${conversationId}`, forceRegenerate ? '(Forzar regeneración)' : '');
    
    const queryParams = forceRegenerate ? '?forceRegenerate=true' : '';
    
    return this.request<{
      summary: string;
      keyPoints: any;
      isFromCache: boolean;
      conversationId: string;
      messageCount: number;
      generatedAt: string;
    }>(`/chat/conversations/${conversationId}/summary${queryParams}`);
  }

  /**
   * Obtener historial de mensajes de una conversación
   */
  async getConversationMessages(conversationId: string, limit?: number, offset?: number): Promise<ApiResponse<{
    messages: Array<{
      id: number;
      conversation_id: string;
      sender_type: 'user' | 'agent' | 'bot';
      content: string;
      message_type: 'text' | 'image' | 'quote' | 'document';
      whatsapp_message_id?: string;
      is_read: boolean;
      metadata?: any;
      created_at: string;
    }>;
    total: number;
    conversationId: string;
  }>> {
    console.log(`📨 [WhatsAppApi] Obteniendo historial para: ${conversationId}`);
    
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (offset) queryParams.append('offset', offset.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/chat/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{
      messages: any[];
      total: number;
      conversationId: string;
    }>(endpoint);
  }

  /**
   * Obtener modo takeover de una conversación
   */
  async getTakeoverMode(conversationId: string): Promise<ApiResponse<{
    conversationId: string;
    takeoverMode: 'spectator' | 'takeover' | 'ai_only';
  }>> {
    console.log('🔍 Obteniendo modo takeover:', conversationId);
    
    return this.request(`/chatbot/takeover/${conversationId}`);
  }

  /**
   * Cambiar modo takeover de una conversación
   */
  async setTakeoverMode(data: {
    conversationId: string;
    mode: 'spectator' | 'takeover' | 'ai_only';
    agentId?: string;
    reason?: string;
  }): Promise<ApiResponse<{
    conversationId: string;
    takeoverMode: 'spectator' | 'takeover' | 'ai_only';
    assignedAgentId?: string;
    reason?: string;
  }>> {
    console.log('🔄 Cambiando modo takeover:', data);
    
    return this.request('/chatbot/takeover', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Obtener conversaciones en modo espectador
   */
  async getSpectatorConversations(): Promise<ApiResponse<{
    conversations: any[];
    count: number;
  }>> {
    console.log('👀 Obteniendo conversaciones en espectador');
    
    return this.request('/chatbot/conversations/spectator');
  }

  /**
   * Obtener conversaciones en takeover
   */
  async getTakeoverConversations(): Promise<ApiResponse<{
    conversations: any[];
    count: number;
  }>> {
    console.log('👤 Obteniendo conversaciones en takeover');
    
    return this.request('/chatbot/conversations/takeover');
  }

  // ============================================
  // MÉTODOS DE UTILIDAD
  // ============================================

  /**
   * Formatear ID de conversación desde número de teléfono
   */
  static formatConversationId(phoneNumber: string): string {
    // Remover caracteres no numéricos y agregar prefijo
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return `whatsapp-${cleanPhone}`;
  }

  /**
   * Extraer número de teléfono desde ID de conversación
   */
  static extractPhoneFromConversationId(conversationId: string): string {
    return conversationId.replace('whatsapp-', '');
  }
}

// Instancia singleton
export const whatsappApi = new WhatsAppApiService();

// Exports adicionales
export default whatsappApi;