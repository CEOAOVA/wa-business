/**
 * Servicio de limpieza de sesiones
 * Maneja la limpieza automática de sesiones expiradas y colgadas
 */
import { logger } from '../utils/logger';
import { supabaseAdmin } from '../config/supabase';

export interface SessionInfo {
  id: string;
  userId: string;
  email: string;
  lastActivity: Date;
  isExpired: boolean;
}

export class SessionCleanupService {
  private static instance: SessionCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutos
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {
    this.startAutomaticCleanup();
  }

  public static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService();
    }
    return SessionCleanupService.instance;
  }

  /**
   * Iniciar limpieza automática de sesiones
   */
  private startAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
        .catch(error => {
          logger.error('Error en limpieza automática de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
        });
    }, this.CLEANUP_INTERVAL);

    logger.info('Servicio de limpieza de sesiones iniciado');
  }

  /**
   * Limpiar sesiones expiradas
   */
  public async cleanupExpiredSessions(): Promise<{ cleaned: number; total: number }> {
    try {
      logger.info('Iniciando limpieza de sesiones expiradas');

      if (!supabaseAdmin) {
        logger.warn('Supabase admin no disponible para limpieza de sesiones');
        return { cleaned: 0, total: 0 };
      }

      const cutoffTime = new Date(Date.now() - this.SESSION_TIMEOUT);
      
      // Obtener usuarios con último login muy antiguo
      const { data: inactiveUsers, error: usersError } = await supabaseAdmin
        .from('agents')
        .select('id, email, last_login, is_active')
        .lt('last_login', cutoffTime.toISOString())
        .eq('is_active', true);

      if (usersError) {
        logger.error('Error obteniendo usuarios inactivos', { error: usersError.message });
        return { cleaned: 0, total: 0 };
      }

      if (!inactiveUsers || inactiveUsers.length === 0) {
        logger.info('No se encontraron sesiones expiradas para limpiar');
        return { cleaned: 0, total: 0 };
      }

      // Marcar usuarios como inactivos si no han tenido actividad reciente
      const userIdsToDeactivate = inactiveUsers.map(user => user.id);
      
      const { error: updateError } = await supabaseAdmin
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', userIdsToDeactivate);

      if (updateError) {
        logger.error('Error desactivando usuarios inactivos', { error: updateError.message });
        return { cleaned: 0, total: inactiveUsers.length };
      }

      logger.info('Limpieza de sesiones completada');

      return { cleaned: inactiveUsers.length, total: inactiveUsers.length };
    } catch (error) {
      logger.error('Error en limpieza de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { cleaned: 0, total: 0 };
    }
  }

  /**
   * Limpiar sesiones específicas por usuario
   */
  public async cleanupUserSessions(userId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        logger.warn('Supabase admin no disponible para limpieza de sesión de usuario');
        return false;
      }

      const { error } = await supabaseAdmin
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Error limpiando sesión de usuario', { userId, error: error.message });
        return false;
      }

      logger.info('Sesión de usuario limpiada', { userId });
      return true;
    } catch (error) {
      logger.error('Error limpiando sesión de usuario', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Obtener información de sesiones activas
   */
  public async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      if (!supabaseAdmin) {
        logger.warn('Supabase admin no disponible para obtener sesiones activas');
        return [];
      }

      const { data: activeUsers, error } = await supabaseAdmin
        .from('agents')
        .select('id, email, last_login, is_active')
        .eq('is_active', true)
        .order('last_login', { ascending: false });

      if (error) {
        logger.error('Error obteniendo sesiones activas', { error: error.message });
        return [];
      }

      if (!activeUsers) {
        return [];
      }

      const now = new Date();
      return activeUsers.map(user => ({
        id: user.id,
        userId: user.id,
        email: user.email,
        lastActivity: new Date(user.last_login || user.id),
        isExpired: user.last_login ? (now.getTime() - new Date(user.last_login).getTime()) > this.SESSION_TIMEOUT : true
      }));
    } catch (error) {
      logger.error('Error obteniendo sesiones activas', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  /**
   * Forzar limpieza de todas las sesiones (solo para administradores)
   */
  public async forceCleanupAllSessions(): Promise<{ cleaned: number; total: number }> {
    try {
      logger.warn('Limpieza forzada de todas las sesiones iniciada');

      if (!supabaseAdmin) {
        logger.warn('Supabase admin no disponible para limpieza forzada');
        return { cleaned: 0, total: 0 };
      }

      // Obtener todos los usuarios activos
      const { data: allUsers, error: usersError } = await supabaseAdmin
        .from('agents')
        .select('id, email')
        .eq('is_active', true);

      if (usersError) {
        logger.error('Error obteniendo usuarios para limpieza forzada', { error: usersError.message });
        return { cleaned: 0, total: 0 };
      }

      if (!allUsers || allUsers.length === 0) {
        logger.info('No hay usuarios activos para limpiar');
        return { cleaned: 0, total: 0 };
      }

      // Desactivar todos los usuarios
      const { error: updateError } = await supabaseAdmin
        .from('agents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('is_active', true);

      if (updateError) {
        logger.error('Error en limpieza forzada de sesiones', { error: updateError.message });
        return { cleaned: 0, total: allUsers.length };
      }

      logger.warn('Limpieza forzada de sesiones completada');

      return { cleaned: allUsers.length, total: allUsers.length };
    } catch (error) {
      logger.error('Error en limpieza forzada de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
      return { cleaned: 0, total: 0 };
    }
  }

  /**
   * Detener el servicio de limpieza automática
   */
  public stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Servicio de limpieza automática de sesiones detenido');
    }
  }

  /**
   * Reiniciar el servicio de limpieza automática
   */
  public restartAutomaticCleanup(): void {
    this.stopAutomaticCleanup();
    this.startAutomaticCleanup();
  }

  /**
   * Obtener estadísticas del servicio
   */
  public getServiceStats(): {
    isRunning: boolean;
    interval: number;
    timeout: number;
    lastCleanup?: Date;
  } {
    return {
      isRunning: this.cleanupInterval !== null,
      interval: this.CLEANUP_INTERVAL,
      timeout: this.SESSION_TIMEOUT
    };
  }
}

// Exportar instancia singleton
export const sessionCleanupService = SessionCleanupService.getInstance(); 