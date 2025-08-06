// ✅ SERVICIO DE AUTO-REFRESH DE TOKENS - IMPLEMENTADO
import { supabase } from '../config/supabase';
import logger from './logger';

export interface RefreshConfig {
  refreshBeforeExpiry: number; // Configuración de anticipación (en minutos)
  maxRetries: number;
  retryDelay: number;
}

export class AuthRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private refreshAttempts = 0;
  
  private readonly config: RefreshConfig = {
    refreshBeforeExpiry: 5, // Configuración predeterminada
    maxRetries: 3,
    retryDelay: 1000
  };
  
  constructor(config?: Partial<RefreshConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  /**
   * Iniciar auto-refresh con el token actual
   */
  async startAutoRefresh(): Promise<void> {
    try {
      // Verificar si Supabase está configurado
      if (!supabase) {
        logger.warn('Supabase no configurado, auto-refresh deshabilitado');
        return;
      }
      
      // Obtener sesión actual
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logger.error('No hay sesión activa para auto-refresh');
        return;
      }
      
      // Calcular periodo hasta refresh
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = expiresAt - now;
      
      if (expiresIn <= 0) {
        logger.warn('Token ya expirado, intentando refresh inmediato');
        await this.refreshToken();
        return;
      }
      
      // Programar refresh con anticipación configurable
      const refreshIn = Math.max(
        0,
        (expiresIn - this.config.refreshBeforeExpiry * 60) * 1000
      );
      
      logger.info('Auto-refresh programado');
      
      this.stopAutoRefresh();
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshIn);
      
    } catch (error) {
      logger.error('Error iniciando auto-refresh', { error });
    }
  }
  
  /**
   * Refrescar token manualmente
   */
  async refreshToken(): Promise<string> {
    // Si ya estamos refrescando, esperar la promesa existente
    if (this.isRefreshing && this.refreshPromise) {
      logger.debug('Refresh ya en progreso, esperando...');
      return this.refreshPromise;
    }
    
    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();
    
    try {
      const token = await this.refreshPromise;
      this.refreshAttempts = 0; // Reset intentos en éxito
      
      // Programar siguiente refresh
      await this.startAutoRefresh();
      
      return token;
    } catch (error) {
      logger.error('Error en refresh token', { error });
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }
  
  /**
   * Realizar el refresh real
   */
  private async performRefresh(): Promise<string> {
    try {
      logger.info('Refrescando token de autenticación...');
      
      // Verificar si Supabase está configurado
      if (!supabase) {
        throw new Error('Supabase no configurado');
      }
      
      // Usar el método de Supabase para refresh
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      if (!data.session) {
        throw new Error('No se pudo obtener nueva sesión');
      }
      
      const newToken = data.session.access_token;
      
      // Guardar en localStorage
      localStorage.setItem('authToken', newToken);
      
      // Emitir evento para que otros componentes se actualicen
      window.dispatchEvent(new CustomEvent('auth:token-refreshed', {
        detail: { token: newToken, timestamp: Date.now() }
      }));
      
      logger.info('✅ Token refrescado exitosamente');
      
      return newToken;
      
    } catch (error) {
      this.refreshAttempts++;
      
      if (this.refreshAttempts < this.config.maxRetries) {
        logger.warn(`Reintentando refresh (${this.refreshAttempts}/${this.config.maxRetries})`);
        
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay * this.refreshAttempts)
        );
        
        return this.performRefresh();
      }
      
      logger.error('Máximo de reintentos alcanzado, redirigiendo a login');
      
      // Limpiar datos y redirigir
      this.cleanup();
      window.location.href = '/login';
      
      throw error;
    }
  }
  
  /**
   * Detener auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Limpiar recursos
   */
  cleanup(): void {
    this.stopAutoRefresh();
    localStorage.removeItem('authToken');
    this.refreshAttempts = 0;
    this.isRefreshing = false;
    this.refreshPromise = null;
  }
  
  /**
   * Obtener estado del servicio
   */
  getStatus() {
    return {
      isActive: this.refreshTimer !== null,
      isRefreshing: this.isRefreshing,
      attempts: this.refreshAttempts
    };
  }
}

// Singleton
export const authRefreshService = new AuthRefreshService();

// Auto-inicializar si hay sesión activa
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      authRefreshService.startAutoRefresh();
      logger.info('✅ Auto-refresh service inicializado al cargar la aplicación');
    }
  });
}