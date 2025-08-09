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

// Debug logging for URL resolution
console.log('🔧 [AuthApi] Environment variables:', {
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  DEV: import.meta.env.DEV,
  MODE: import.meta.env.MODE,
  RESOLVED_BASE_URL: API_BASE_URL
});

// PRODUCTION FIX: Ensure we're using the correct backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.PROD ? 'https://dev-apiwaprueba.aova.mx' : 
   import.meta.env.DEV ? 'http://localhost:3002' : 
   'https://dev-apiwaprueba.aova.mx');

export interface LoginRequest {
  username: string;
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
    this.baseUrl = `${BACKEND_URL}/api/auth`;
    console.log('🔧 [AuthApi] Constructor - Base URL set to:', this.baseUrl);
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
      console.log('🔐 [AuthApi] Token incluido en request:', token.substring(0, 20) + '...');
    } else {
      console.log('⚠️ [AuthApi] No hay token disponible para request');
    }

    console.log('🌐 [AuthApi] Haciendo request a:', url);
    console.log('🌐 [AuthApi] Método:', config.method || 'GET');
    console.log('🌐 [AuthApi] Headers:', config.headers);

    try {
      const response = await fetch(url, config);
      
      console.log('🌐 [AuthApi] Status de respuesta:', response.status);
      
      if (!response.ok) {
        console.error('❌ [AuthApi] Error HTTP:', response.status);
        
        // Si es un error de autenticación, limpiar token
        if (response.status === 401) {
          console.warn('⚠️ [AuthApi] Token inválido, limpiando...');
          localStorage.removeItem('authToken');
        }
        
        const errorText = await response.text();
        console.error('❌ [AuthApi] Error en request a', url, ':', errorText);
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [AuthApi] Request exitoso');
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('❌ [AuthApi] Error en request a', url, ':', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('🔐 [AuthApi] Iniciando login...');
    
    try {
      // Enviar ambos campos para compatibilidad con backends que esperan email o username
      const payload: any = {
        username: credentials.username,
        password: credentials.password,
        email: credentials.username
      };

      const response = await this.request<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('✅ [AuthApi] Login exitoso, procesando respuesta...');
      console.log('📊 [AuthApi] Respuesta completa:', response);
      console.log('📊 [AuthApi] response.data:', response.data);
      console.log('📊 [AuthApi] response.data.user:', response.data.user);
      console.log('📊 [AuthApi] response.data.session:', response.data.session);
      console.log('📊 [AuthApi] Tipo de response.data:', typeof response.data);
      console.log('📊 [AuthApi] response.data keys:', Object.keys(response.data || {}));
      
      // Log detallado de la estructura de datos
      console.log('🔍 [AuthApi] Estructura detallada:');
      const responseData = response.data as any;
      console.log('  - response.data.success:', responseData?.success);
      console.log('  - response.data.message:', responseData?.message);
      console.log('  - response.data.data:', responseData?.data);
      console.log('  - response.data.data?.user:', responseData?.data?.user);
      console.log('  - response.data.data?.session:', responseData?.data?.session);
      console.log('  - response.data.data?.session?.access_token:', responseData?.data?.session?.access_token);

      // Verificar que la respuesta tenga la estructura esperada
      if (!response.data) {
        console.error('❌ [AuthApi] response.data es undefined o null');
        throw new Error('Respuesta inválida del servidor: response.data es undefined');
      }

      // El backend devuelve { success: true, data: { user: ..., session: ... } }
      const actualData = (response.data as any)?.data;
      console.log('📊 [AuthApi] Datos reales:', actualData);
      console.log('📊 [AuthApi] actualData.user:', actualData?.user);
      console.log('📊 [AuthApi] actualData.session:', actualData?.session);

      if (!actualData || !actualData.user) {
        console.error('❌ [AuthApi] Respuesta inválida del servidor - no hay user en los datos');
        console.error('❌ [AuthApi] actualData:', actualData);
        throw new Error('Respuesta inválida del servidor: no hay datos de usuario');
      }

      // Guardar token de sesión con validación
      if (actualData.session?.access_token) {
        const token = actualData.session.access_token;
        localStorage.setItem('authToken', token);
        console.log('✅ [AuthApi] Token guardado exitosamente:', token.substring(0, 20) + '...');
        
        // Verificar que el token se guardó correctamente
        const savedToken = localStorage.getItem('authToken');
        if (savedToken !== token) {
          console.error('❌ [AuthApi] Error: Token no se guardó correctamente');
        } else {
          console.log('✅ [AuthApi] Token verificado en localStorage');
        }
      } else {
        console.warn('⚠️ [AuthApi] No se recibió token en la respuesta de login');
      }

      // Guardar refresh token si viene (para backend JWT propio)
      if (actualData.session?.refresh_token) {
        localStorage.setItem('refreshToken', actualData.session.refresh_token);
      }

      return actualData;
    } catch (error) {
      console.error('❌ [AuthApi] Error en login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    console.log('🔐 [AuthApi] Iniciando logout...');
    
    try {
      // Solo intentar logout en el servidor si hay token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('⚠️ [AuthApi] No hay token para logout, limpiando local');
        this.clearAuthData();
        return;
      }

      await this.request('/logout', {
        method: 'POST',
      });

      console.log('✅ [AuthApi] Logout exitoso en servidor');
    } catch (error) {
      console.error('❌ [AuthApi] Error en logout:', error);
      // Aún así limpiar datos locales
    } finally {
      this.clearAuthData();
    }
  }

  async getProfile(): Promise<User> {
    console.log('🔐 [AuthApi] Obteniendo perfil...');
    try {
      // El backend responde { success, data: { user: User } }
      const response = await this.request<any>('/profile');
      const actualData = (response.data as any)?.data;
      const rawProfile = actualData?.user ?? actualData; // tolerante por si ya viene plano
      if (!rawProfile) {
        throw new Error('Perfil no disponible en la respuesta');
      }
      console.log('✅ [AuthApi] Perfil obtenido exitosamente');
      // Convertir a tipo User del frontend si fuera necesario
      return this.convertToUser(rawProfile as any);
    } catch (error) {
      console.error('❌ [AuthApi] Error obteniendo perfil:', error);
      throw error;
    }
  }

  private clearAuthData(): void {
    console.log('🧹 [AuthApi] Limpiando datos de autenticación...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberAuth');
    console.log('✅ [AuthApi] Datos de autenticación limpiados');
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
  convertToUser(profile: UserProfile | undefined): User {
    console.log('🔍 [AuthApi] Convirtiendo perfil:', profile);
    
    if (!profile) {
      console.error('❌ [AuthApi] Perfil es undefined, creando usuario por defecto');
      return {
        id: 'unknown',
        name: 'Usuario Desconocido',
        email: 'unknown@example.com',
        whatsappNumber: '',
        role: 'agent',
        isOnline: false,
        lastSeen: new Date(),
        status: 'inactive',
      };
    }
    
    console.log('✅ [AuthApi] Perfil válido, convirtiendo...');
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