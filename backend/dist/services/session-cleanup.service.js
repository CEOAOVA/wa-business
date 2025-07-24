"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCleanupService = exports.SessionCleanupService = void 0;
/**
 * Servicio de limpieza de sesiones
 * Maneja la limpieza automática de sesiones expiradas y colgadas
 */
const logger_1 = require("../utils/logger");
const supabase_1 = require("../config/supabase");
class SessionCleanupService {
    constructor() {
        this.cleanupInterval = null;
        this.CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutos
        this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas
        this.startAutomaticCleanup();
    }
    static getInstance() {
        if (!SessionCleanupService.instance) {
            SessionCleanupService.instance = new SessionCleanupService();
        }
        return SessionCleanupService.instance;
    }
    /**
     * Iniciar limpieza automática de sesiones
     */
    startAutomaticCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions()
                .catch(error => {
                logger_1.logger.error('Error en limpieza automática de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
            });
        }, this.CLEANUP_INTERVAL);
        logger_1.logger.info('Servicio de limpieza de sesiones iniciado');
    }
    /**
     * Limpiar sesiones expiradas
     */
    cleanupExpiredSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.info('Iniciando limpieza de sesiones expiradas');
                if (!supabase_1.supabaseAdmin) {
                    logger_1.logger.warn('Supabase admin no disponible para limpieza de sesiones');
                    return { cleaned: 0, total: 0 };
                }
                const cutoffTime = new Date(Date.now() - this.SESSION_TIMEOUT);
                // Obtener usuarios con último login muy antiguo
                const { data: inactiveUsers, error: usersError } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('id, email, last_login, is_active')
                    .lt('last_login', cutoffTime.toISOString())
                    .eq('is_active', true);
                if (usersError) {
                    logger_1.logger.error('Error obteniendo usuarios inactivos', { error: usersError.message });
                    return { cleaned: 0, total: 0 };
                }
                if (!inactiveUsers || inactiveUsers.length === 0) {
                    logger_1.logger.info('No se encontraron sesiones expiradas para limpiar');
                    return { cleaned: 0, total: 0 };
                }
                // Marcar usuarios como inactivos si no han tenido actividad reciente
                const userIdsToDeactivate = inactiveUsers.map(user => user.id);
                const { error: updateError } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                    .in('id', userIdsToDeactivate);
                if (updateError) {
                    logger_1.logger.error('Error desactivando usuarios inactivos', { error: updateError.message });
                    return { cleaned: 0, total: inactiveUsers.length };
                }
                logger_1.logger.info('Limpieza de sesiones completada');
                return { cleaned: inactiveUsers.length, total: inactiveUsers.length };
            }
            catch (error) {
                logger_1.logger.error('Error en limpieza de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
                return { cleaned: 0, total: 0 };
            }
        });
    }
    /**
     * Limpiar sesiones específicas por usuario
     */
    cleanupUserSessions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    logger_1.logger.warn('Supabase admin no disponible para limpieza de sesión de usuario');
                    return false;
                }
                const { error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', userId);
                if (error) {
                    logger_1.logger.error('Error limpiando sesión de usuario', { userId, error: error.message });
                    return false;
                }
                logger_1.logger.info('Sesión de usuario limpiada', { userId });
                return true;
            }
            catch (error) {
                logger_1.logger.error('Error limpiando sesión de usuario', { userId, error: error instanceof Error ? error.message : 'Unknown error' });
                return false;
            }
        });
    }
    /**
     * Obtener información de sesiones activas
     */
    getActiveSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!supabase_1.supabaseAdmin) {
                    logger_1.logger.warn('Supabase admin no disponible para obtener sesiones activas');
                    return [];
                }
                const { data: activeUsers, error } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('id, email, last_login, is_active')
                    .eq('is_active', true)
                    .order('last_login', { ascending: false });
                if (error) {
                    logger_1.logger.error('Error obteniendo sesiones activas', { error: error.message });
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
            }
            catch (error) {
                logger_1.logger.error('Error obteniendo sesiones activas', { error: error instanceof Error ? error.message : 'Unknown error' });
                return [];
            }
        });
    }
    /**
     * Forzar limpieza de todas las sesiones (solo para administradores)
     */
    forceCleanupAllSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.warn('Limpieza forzada de todas las sesiones iniciada');
                if (!supabase_1.supabaseAdmin) {
                    logger_1.logger.warn('Supabase admin no disponible para limpieza forzada');
                    return { cleaned: 0, total: 0 };
                }
                // Obtener todos los usuarios activos
                const { data: allUsers, error: usersError } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .select('id, email')
                    .eq('is_active', true);
                if (usersError) {
                    logger_1.logger.error('Error obteniendo usuarios para limpieza forzada', { error: usersError.message });
                    return { cleaned: 0, total: 0 };
                }
                if (!allUsers || allUsers.length === 0) {
                    logger_1.logger.info('No hay usuarios activos para limpiar');
                    return { cleaned: 0, total: 0 };
                }
                // Desactivar todos los usuarios
                const { error: updateError } = yield supabase_1.supabaseAdmin
                    .from('agents')
                    .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                    .eq('is_active', true);
                if (updateError) {
                    logger_1.logger.error('Error en limpieza forzada de sesiones', { error: updateError.message });
                    return { cleaned: 0, total: allUsers.length };
                }
                logger_1.logger.warn('Limpieza forzada de sesiones completada');
                return { cleaned: allUsers.length, total: allUsers.length };
            }
            catch (error) {
                logger_1.logger.error('Error en limpieza forzada de sesiones', { error: error instanceof Error ? error.message : 'Unknown error' });
                return { cleaned: 0, total: 0 };
            }
        });
    }
    /**
     * Detener el servicio de limpieza automática
     */
    stopAutomaticCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger_1.logger.info('Servicio de limpieza automática de sesiones detenido');
        }
    }
    /**
     * Reiniciar el servicio de limpieza automática
     */
    restartAutomaticCleanup() {
        this.stopAutomaticCleanup();
        this.startAutomaticCleanup();
    }
    /**
     * Obtener estadísticas del servicio
     */
    getServiceStats() {
        return {
            isRunning: this.cleanupInterval !== null,
            interval: this.CLEANUP_INTERVAL,
            timeout: this.SESSION_TIMEOUT
        };
    }
}
exports.SessionCleanupService = SessionCleanupService;
// Exportar instancia singleton
exports.sessionCleanupService = SessionCleanupService.getInstance();
