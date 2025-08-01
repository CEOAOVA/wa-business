/**
 * Servicio para las APIs del dashboard de administrador
 */

// Definición de ApiResponse
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    agents: number;
  };
  conversations: {
    total: number;
    active: number;
    closed: number;
    unread: number;
  };
  messages: {
    total: number;
    today: number;
    thisWeek: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  system: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    database: string;
    lastBackup: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'agent' | 'supervisor';
  whatsapp_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  contact_phone: string;
  status: 'active' | 'waiting' | 'closed';
  ai_mode: 'active' | 'inactive' | 'paused';
  takeover_mode: 'spectator' | 'takeover' | 'ai_only'; // Agregar campo takeover_mode
  assigned_agent_id?: string;
  unread_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
}

export interface Order {
  id: string;
  customer_name: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
  updated_at: string;
}

export interface SystemInfo {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  version: string;
  platform: string;
  arch: string;
  nodeEnv: string;
  timestamp: string;
}

class DashboardApiService {
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'https://dev-apiwaprueba.aova.mx')}/api/dashboard`;

  /**
   * Método privado para hacer peticiones HTTP
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Agregar token de autenticación si existe
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
      console.log('🔐 [DashboardApi] Token incluido en request:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ [DashboardApi] No hay token disponible para request');
    }

    console.log('🌐 [DashboardApi] Haciendo request a:', url);
    console.log('🌐 [DashboardApi] Método:', config.method || 'GET');

    try {
      const response = await fetch(url, config);
      console.log('🌐 [DashboardApi] Status de respuesta:', response.status);
      
      const data = await response.json();
      console.log('🌐 [DashboardApi] Datos recibidos:', data);

      if (!response.ok) {
        console.error('❌ [DashboardApi] Error en respuesta:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('❌ [DashboardApi] Error en request:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión');
    }
  }

  /**
   * Obtener estadísticas generales del sistema
   */
  async getStats(): Promise<SystemStats> {
    const response = await this.request<SystemStats>('/stats');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener estadísticas');
    }

    return response.data as SystemStats;
  }

  /**
   * Obtener lista de usuarios
   */
  async getUsers(): Promise<UserProfile[]> {
    const response = await this.request<UserProfile[]>('/users');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener usuarios');
    }

    return response.data as UserProfile[];
  }

  /**
   * Obtener conversaciones
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await this.request<Conversation[]>('/conversations');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener conversaciones');
    }

    return response.data as Conversation[];
  }

  /**
   * Obtener conversaciones públicas (para agentes)
   */
  async getPublicConversations(): Promise<any[]> {
    console.log('📊 [DashboardApi] Obteniendo conversaciones públicas...');
    
    try {
      const response = await this.request<any[]>('/conversations/public');
      console.log('✅ [DashboardApi] Conversaciones públicas obtenidas:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardApi] Error obteniendo conversaciones públicas:', error);
      
      // Si es un error de autenticación, limpiar token
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('⚠️ [DashboardApi] Error de autenticación, limpiando token...');
        localStorage.removeItem('authToken');
      }
      
      throw error;
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getConversationMessages(conversationId: string): Promise<ApiResponse<any[]>> {
    const response = await this.request<any[]>(`/conversations/${conversationId}/messages`);

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener mensajes de la conversación');
    }

    return response;
  }

  /**
   * Obtener pedidos
   */
  async getOrders(): Promise<Order[]> {
    const response = await this.request<Order[]>('/orders');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener pedidos');
    }

    return response.data as Order[];
  }

  /**
   * Obtener información del sistema
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const response = await this.request<SystemInfo>('/system');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener información del sistema');
    }

    return response.data as SystemInfo;
  }

  /**
   * Formatear tiempo de actividad
   */
  formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Formatear uso de memoria
   */
  formatMemory(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  /**
   * Formatear porcentaje de memoria
   */
  formatMemoryPercentage(used: number, total: number): string {
    const percentage = (used / total) * 100;
    return `${percentage.toFixed(1)}%`;
  }
}

export const dashboardApiService = new DashboardApiService(); 