import type { User } from '../types';

// Definición local de ApiResponse para evitar problemas de importación
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Use relative path to leverage Vite proxy in development
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'https://dev-apiwaprueba.aova.mx');

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
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
  };
  session: any;
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

class AuthApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/auth`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
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

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Guardar token de sesión
    if (response.data.session?.access_token) {
      localStorage.setItem('authToken', response.data.session.access_token);
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', {
        method: 'POST',
      });
    } finally {
      // Limpiar token local sin importar si la API falla
      localStorage.removeItem('authToken');
    }
  }

  async getProfile(): Promise<UserProfile> {
    const response = await this.request<UserProfile>('/profile');
    return response.data;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.request<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const response = await this.request<UserProfile[]>('/users');
    return response.data;
  }

  // Método público para hacer peticiones GET a cualquier endpoint
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  async createUser(userData: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    role?: 'admin' | 'agent' | 'supervisor';
    whatsapp_id?: string;
  }): Promise<UserProfile> {
    const response = await this.request<UserProfile>('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async clearSessions(): Promise<{ cleanedServices: string[]; timestamp: string }> {
    const response = await this.request<{ cleanedServices: string[]; timestamp: string }>('/clear-sessions', {
      method: 'POST',
    });
    return response.data;
  }

  // Convertir UserProfile del backend a User del frontend
  convertToUser(profile: UserProfile): User {
    return {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      whatsappNumber: profile.whatsapp_id || '',
      role: profile.role === 'supervisor' ? 'agent' : profile.role, // Mapear 'supervisor' a 'agent'
      isOnline: profile.is_active,
      lastSeen: profile.last_login ? new Date(profile.last_login) : new Date(),
      status: profile.is_active ? 'active' : 'inactive',
    };
  }
}

export const authApiService = new AuthApiService(); 