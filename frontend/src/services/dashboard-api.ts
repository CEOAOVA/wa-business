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
  private baseUrl = `${import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'http://localhost:3002')}/api/dashboard`;

  /**
   * Método privado para hacer peticiones HTTP
   */
  private async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Agregar token de autenticación si existe
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
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
  async getPublicConversations(): Promise<Conversation[]> {
    const response = await this.request<Conversation[]>('/conversations/public');

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener conversaciones');
    }

    return response.data as Conversation[];
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