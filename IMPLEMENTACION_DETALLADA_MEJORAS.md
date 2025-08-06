# 🔧 GUÍA DE IMPLEMENTACIÓN DETALLADA - MEJORAS CRÍTICAS

## 📌 Introducción

Este documento complementa el Plan de Acción con código específico y ejemplos detallados para implementar las mejoras críticas del sistema WhatsApp Business Platform.

---

## 1️⃣ OPTIMIZACIÓN DE WEBSOCKET - IMPLEMENTACIÓN COMPLETA

### 1.1 Actualización del Backend (app.ts)

```typescript
// backend/src/app.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './config/logger';

const app = express();
const httpServer = createServer(app);

// ✅ CONFIGURACIÓN OPTIMIZADA DE SOCKET.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  
  // 🚀 OPTIMIZACIONES DE RENDIMIENTO
  transports: ['websocket', 'polling'], // Mantener polling como fallback
  allowEIO3: false,
  
  // ⚡ TIMEOUTS OPTIMIZADOS PARA TIEMPO REAL
  pingTimeout: 10000,   // Optimizado para detección rápida
  pingInterval: 5000,   // Heartbeat frecuente
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
  connectTimeout: 20000, // Conexión rápida
  
  // 🔧 CONFIGURACIÓN DE RECONEXIÓN
  allowRequest: (req, callback) => {
    // Validación rápida del token
    const token = req.headers.authorization || req._query?.token;
    const isValid = token && token.length > 50;
    callback(null, isValid);
  },
  
  // 📊 CONFIGURACIÓN DE COMPRESIÓN
  perMessageDeflate: {
    threshold: 1024 // Comprimir mensajes > 1KB
  }
});

// 🔐 MIDDLEWARE DE AUTENTICACIÓN MEJORADO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token as string;
    
    if (!token) {
      logger.warn('Socket.IO: Intento de conexión sin token');
      return next(new Error('No authentication token'));
    }
    
    // Validación con cache para reducir llamadas a DB
    const cachedUser = await getCachedUser(token);
    if (cachedUser) {
      (socket as any).userId = cachedUser.id;
      (socket as any).userEmail = cachedUser.email;
      return next();
    }
    
    // Si no está en cache, validar con Supabase
    const { supabaseAdmin } = require('./config/supabase');
    const cleanToken = token.replace('Bearer ', '');
    
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(cleanToken);
    
    if (error || !user) {
      logger.error('Socket.IO: Token inválido', { error: error?.message });
      return next(new Error('Invalid or expired token'));
    }
    
    // Guardar en cache con TTL configurable
    await setCachedUser(token, user);
    
    (socket as any).userId = user.id;
    (socket as any).userEmail = user.email;
    
    logger.info('Socket.IO: Usuario autenticado', { 
      userId: user.id, 
      email: user.email 
    });
    
    next();
  } catch (error) {
    logger.error('Socket.IO: Error en autenticación', { error });
    next(new Error('Authentication error'));
  }
});

// 🎯 MANEJO OPTIMIZADO DE EVENTOS
io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  const userEmail = (socket as any).userEmail;
  
  logger.info('Cliente conectado', { 
    socketId: socket.id, 
    userId, 
    userEmail 
  });
  
  // Unirse automáticamente a sala del usuario
  socket.join(`user:${userId}`);
  
  // Heartbeat optimizado con respuesta inmediata
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ timestamp: Date.now() });
    }
  });
  
  // Manejo de salas de conversación
  socket.on('join_conversation', async (conversationId: string) => {
    // Validar que el usuario tenga acceso a la conversación
    const hasAccess = await validateUserAccess(userId, conversationId);
    
    if (hasAccess) {
      socket.join(`conversation:${conversationId}`);
      socket.emit('joined_conversation', { 
        conversationId, 
        timestamp: Date.now() 
      });
      
      logger.debug('Usuario unido a conversación', { 
        userId, 
        conversationId 
      });
    } else {
      socket.emit('error', { 
        message: 'No tienes acceso a esta conversación' 
      });
    }
  });
  
  // Manejo mejorado de desconexión
  socket.on('disconnect', (reason) => {
    logger.info('Cliente desconectado', { 
      socketId: socket.id, 
      userId, 
      reason 
    });
    
    // Limpiar recursos específicos del usuario
    cleanupUserResources(userId);
  });
});

// 🧹 LIMPIEZA PERIÓDICA DE RECURSOS
setInterval(() => {
  const sockets = io.sockets.sockets;
  const activeSockets = sockets.size;
  
  logger.debug('Estado de WebSocket', {
    activeSockets,
    rooms: io.sockets.adapter.rooms.size
  });
  
  // Limpiar salas vacías
  io.sockets.adapter.rooms.forEach((sockets, roomId) => {
    if (sockets.size === 0 && roomId !== '/') {
      io.sockets.adapter.rooms.delete(roomId);
    }
  });
}, 60000); // Intervalo configurable
```

### 1.2 Hook Unificado de Frontend

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import logger from '../services/logger';

interface WebSocketConfig {
  autoConnect?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  heartbeatInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  latency: number;
  retryCount: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

const DEFAULT_CONFIG: WebSocketConfig = {
  autoConnect: true,
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  heartbeatInterval: 5000
};

export function useWebSocket(config: WebSocketConfig = {}) {
  const { state: authState } = useAuth();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Estado unificado
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    latency: 0,
    retryCount: 0,
    connectionQuality: 'disconnected'
  });
  
  // Referencias
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingRef = useRef<number>(0);
  
  // Event handlers
  const eventHandlers = useRef<{
    [key: string]: ((data: any) => void)[]
  }>({});
  
  // 📊 Calcular calidad de conexión
  const calculateConnectionQuality = useCallback((latency: number): WebSocketState['connectionQuality'] => {
    if (!state.isConnected) return 'disconnected';
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    return 'poor';
  }, [state.isConnected]);
  
  // ❤️ Heartbeat mejorado
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      const timestamp = Date.now();
      lastPingRef.current = timestamp;
      
      socketRef.current.emit('ping', (response: { timestamp: number }) => {
        const latency = Date.now() - timestamp;
        const quality = calculateConnectionQuality(latency);
        
        setState(prev => ({
          ...prev,
          latency,
          connectionQuality: quality
        }));
        
        if (latency > 1000) {
          logger.warn('Latencia alta detectada', { latency });
        }
      });
    }
  }, [calculateConnectionQuality]);
  
  // 🔌 Conectar con reintentos inteligentes
  const connect = useCallback(() => {
    // Validaciones previas
    if (!authState.isAuthenticated || !authState.user) {
      logger.debug('No autenticado, saltando conexión WebSocket');
      return;
    }
    
    if (socketRef.current?.connected || state.isConnecting) {
      logger.debug('Ya conectado o conectando');
      return;
    }
    
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Token no encontrado' 
      }));
      return;
    }
    
    // Limpiar socket anterior
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Crear nueva conexión
    const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002', {
      transports: ['websocket', 'polling'],
      auth: { token },
      query: { token },
      timeout: 20000,
      reconnection: false, // Manejar manualmente
      autoConnect: true
    });
    
    // Event handlers
    socket.on('connect', () => {
      logger.info('WebSocket conectado', { socketId: socket.id });
      
      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        latency: 0,
        retryCount: 0,
        connectionQuality: 'good'
      });
      
      // Iniciar heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      heartbeatIntervalRef.current = setInterval(
        sendHeartbeat, 
        finalConfig.heartbeatInterval
      );
      
      // Emitir evento de conexión
      emit('user_connected', { timestamp: Date.now() });
    });
    
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket desconectado', { reason });
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
      
      // Limpiar heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Reconectar si no fue desconexión manual
      if (reason !== 'io client disconnect' && state.retryCount < finalConfig.maxRetries!) {
        scheduleReconnect();
      }
    });
    
    socket.on('connect_error', (error) => {
      logger.error('Error de conexión', { error: error.message });
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message
      }));
      
      if (state.retryCount < finalConfig.maxRetries!) {
        scheduleReconnect();
      }
    });
    
    // Registrar handlers personalizados
    Object.entries(eventHandlers.current).forEach(([event, handlers]) => {
      handlers.forEach(handler => {
        socket.on(event, handler);
      });
    });
    
    socketRef.current = socket;
  }, [authState, state.isConnecting, state.retryCount, finalConfig, sendHeartbeat]);
  
  // 🔄 Programar reconexión con backoff exponencial
  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      finalConfig.baseDelay! * Math.pow(2, state.retryCount),
      finalConfig.maxDelay!
    );
    
    logger.info(`Reintentando conexión en ${delay}ms (intento ${state.retryCount + 1})`);
    
    setState(prev => ({ 
      ...prev, 
      retryCount: prev.retryCount + 1 
    }));
    
    retryTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [state.retryCount, finalConfig, connect]);
  
  // 📤 Emitir eventos
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      logger.debug('Evento emitido', { event, data });
    } else {
      logger.warn('No se puede emitir, socket desconectado', { event });
    }
  }, []);
  
  // 📥 Suscribirse a eventos
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current[event]) {
      eventHandlers.current[event] = [];
    }
    
    eventHandlers.current[event].push(handler);
    
    // Si ya estamos conectados, registrar inmediatamente
    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler);
    }
    
    // Retornar función de limpieza
    return () => {
      const handlers = eventHandlers.current[event];
      const index = handlers?.indexOf(handler);
      
      if (index !== undefined && index > -1) {
        handlers.splice(index, 1);
      }
      
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);
  
  // 🔌 Auto-conectar cuando hay autenticación
  useEffect(() => {
    if (finalConfig.autoConnect && authState.isAuthenticated) {
      connect();
    }
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [authState.isAuthenticated, finalConfig.autoConnect]);
  
  return {
    ...state,
    connect,
    disconnect: () => socketRef.current?.disconnect(),
    emit,
    on,
    socket: socketRef.current
  };
}
```

---

## 2️⃣ AUTO-REFRESH DE TOKENS - IMPLEMENTACIÓN COMPLETA

### 2.1 Servicio de Refresh

```typescript
// frontend/src/services/auth-refresh.service.ts
import { supabase } from '../config/supabase';
import logger from './logger';

export interface RefreshConfig {
  refreshBeforeExpiry: number; // Configuración de anticipación
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
      
      // Programar refresh
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
        detail: { token: newToken }
      }));
      
      logger.info('Token refrescado exitosamente');
      
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
```

### 2.2 Integración en AuthContext

```typescript
// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authRefreshService } from '../services/auth-refresh.service';
import { authApiService } from '../services/auth-api';
import logger from '../services/logger';

// ... (interfaces y types existentes)

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // 🔄 Escuchar eventos de token refresh
  useEffect(() => {
    const handleTokenRefreshed = (event: CustomEvent) => {
      logger.info('Token actualizado por refresh service');
      
      // Actualizar estado si es necesario
      if (state.isAuthenticated) {
        checkAuth();
      }
    };
    
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed as any);
    
    return () => {
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed as any);
    };
  }, [state.isAuthenticated]);
  
  // 🔐 Login mejorado con auto-refresh
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await authApiService.login(credentials);
      
      if (response.user && response.session) {
        // Guardar token
        localStorage.setItem('authToken', response.session.access_token);
        
        // ✅ INICIAR AUTO-REFRESH
        await authRefreshService.startAutoRefresh();
        
        const user = authApiService.convertToUser(response.user);
        
        logger.info('Login exitoso con auto-refresh activado');
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en login';
      logger.error('Error en login', { error: errorMessage });
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };
  
  // 🚪 Logout mejorado
  const logout = async () => {
    try {
      logger.debug('Iniciando logout');
      
      // ✅ DETENER AUTO-REFRESH
      authRefreshService.stopAutoRefresh();
      
      await authApiService.logout();
      
      // Limpiar todos los datos
      authRefreshService.cleanup();
      localStorage.clear();
      sessionStorage.clear();
      
      dispatch({ type: 'LOGOUT' });
      
      logger.info('Logout completo');
    } catch (error) {
      logger.error('Error durante logout', { error });
      // Forzar limpieza aunque falle el API
      dispatch({ type: 'LOGOUT' });
    }
  };
  
  // 🔍 Check auth mejorado
  const checkAuth = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        dispatch({ type: 'AUTH_FAILURE', payload: 'No hay token' });
        return;
      }
      
      const { user, error } = await authApiService.getCurrentUser();
      
      if (error || !user) {
        // Intentar refresh antes de fallar
        try {
          await authRefreshService.refreshToken();
          const retryResult = await authApiService.getCurrentUser();
          
          if (retryResult.user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: retryResult.user });
            return;
          }
        } catch (refreshError) {
          logger.error('Refresh falló en checkAuth', { refreshError });
        }
        
        dispatch({ type: 'AUTH_FAILURE', payload: error || 'Usuario no encontrado' });
        return;
      }
      
      // ✅ Reactivar auto-refresh si hay sesión válida
      await authRefreshService.startAutoRefresh();
      
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      logger.error('Error verificando autenticación', { error });
      dispatch({ type: 'AUTH_FAILURE', payload: 'Error verificando sesión' });
    }
  };
  
  // ... resto del componente
};
```

---

## 3️⃣ GESTIÓN DE MEMORIA - IMPLEMENTACIÓN

### 3.1 Servicio de Caché con TTL y Límites

```typescript
// backend/src/services/cache/memory-cache.service.ts
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

interface CacheEntry<T> {
  data: T;
  expires: number;
  size: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheStats {
  entries: number;
  totalSize: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class MemoryCache<T = any> extends EventEmitter {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    entries: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0
  };
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly options: {
      maxEntries?: number;
      maxSizeBytes?: number;
      defaultTTL?: number;
      cleanupIntervalMs?: number;
      evictionPolicy?: 'LRU' | 'LFU' | 'FIFO';
    } = {}
  ) {
    super();
    
    // Valores por defecto
    this.options.maxEntries = this.options.maxEntries || 1000;
    this.options.maxSizeBytes = this.options.maxSizeBytes || 50 * 1024 * 1024; // 50MB
    this.options.defaultTTL = this.options.defaultTTL || 300000; // TTL configurable
    this.options.cleanupIntervalMs = this.options.cleanupIntervalMs || 60000; // Intervalo configurable
    this.options.evictionPolicy = this.options.evictionPolicy || 'LRU';
    
    this.startCleanup();
  }
  
  /**
   * Establecer valor en caché
   */
  set(key: string, value: T, ttl?: number): void {
    try {
      // Calcular tamaño aproximado
      const size = this.calculateSize(value);
      
      // Verificar límites antes de añadir
      if (this.shouldEvict(size)) {
        this.evict(size);
      }
      
      const entry: CacheEntry<T> = {
        data: value,
        expires: Date.now() + (ttl || this.options.defaultTTL!),
        size,
        accessCount: 0,
        lastAccess: Date.now()
      };
      
      // Si ya existe, actualizar stats
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.stats.totalSize -= oldEntry.size;
      } else {
        this.stats.entries++;
      }
      
      this.cache.set(key, entry);
      this.stats.totalSize += size;
      
      this.emit('set', { key, size });
      
    } catch (error) {
      logger.error('Error estableciendo valor en caché', { key, error });
    }
  }
  
  /**
   * Obtener valor del caché
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
    
    // Verificar expiración
    if (Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
    
    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }
  
  /**
   * Eliminar entrada del caché
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.stats.entries--;
      this.cache.delete(key);
      this.emit('delete', { key });
      return true;
    }
    
    return false;
  }
  
  /**
   * Verificar si se debe hacer eviction
   */
  private shouldEvict(newSize: number): boolean {
    return (
      this.stats.entries >= this.options.maxEntries! ||
      this.stats.totalSize + newSize > this.options.maxSizeBytes!
    );
  }
  
  /**
   * Realizar eviction según política
   */
  private evict(requiredSize: number): void {
    const entriesToEvict = this.getEvictionCandidates(requiredSize);
    
    for (const key of entriesToEvict) {
      this.delete(key);
      this.stats.evictions++;
      
      logger.debug('Cache eviction', { key, policy: this.options.evictionPolicy });
    }
    
    this.emit('eviction', { 
      count: entriesToEvict.length, 
      policy: this.options.evictionPolicy 
    });
  }
  
  /**
   * Obtener candidatos para eviction
   */
  private getEvictionCandidates(requiredSize: number): string[] {
    const candidates: string[] = [];
    let freedSize = 0;
    
    // Ordenar según política
    const sortedEntries = Array.from(this.cache.entries()).sort((a, b) => {
      switch (this.options.evictionPolicy) {
        case 'LRU': // Least Recently Used
          return a[1].lastAccess - b[1].lastAccess;
        case 'LFU': // Least Frequently Used
          return a[1].accessCount - b[1].accessCount;
        case 'FIFO': // First In First Out
        default:
          return 0; // Mantener orden de inserción
      }
    });
    
    // Seleccionar candidatos hasta liberar espacio suficiente
    for (const [key, entry] of sortedEntries) {
      candidates.push(key);
      freedSize += entry.size;
      
      if (freedSize >= requiredSize || candidates.length >= this.stats.entries * 0.1) {
        break; // Máximo 10% de entradas en una eviction
      }
    }
    
    return candidates;
  }
  
  /**
   * Calcular tamaño aproximado de un objeto
   */
  private calculateSize(obj: any): number {
    try {
      const str = JSON.stringify(obj);
      return str.length * 2; // Aproximación en bytes (UTF-16)
    } catch {
      return 1024; // Tamaño por defecto si no se puede serializar
    }
  }
  
  /**
   * Actualizar hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
  
  /**
   * Limpieza periódica de entradas expiradas
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expires) {
          this.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.debug(`Cache cleanup: ${cleaned} entradas expiradas eliminadas`);
        this.emit('cleanup', { cleaned });
      }
    }, this.options.cleanupIntervalMs!);
  }
  
  /**
   * Obtener estadísticas del caché
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Limpiar todo el caché
   */
  clear(): void {
    const entries = this.stats.entries;
    this.cache.clear();
    this.stats = {
      entries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0
    };
    
    logger.info(`Cache limpiado: ${entries} entradas eliminadas`);
    this.emit('clear', { entries });
  }
  
  /**
   * Destruir el caché y limpiar recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
    this.removeAllListeners();
    
    logger.info('Cache destruido');
  }
}

// Instancias singleton para diferentes propósitos
export const conversationCache = new MemoryCache({
  maxEntries: 500,
  defaultTTL: 600000, // TTL configurable
  evictionPolicy: 'LRU'
});

export const userCache = new MemoryCache({
  maxEntries: 200,
  defaultTTL: 300000, // TTL configurable
  evictionPolicy: 'LRU'
});

export const messageCache = new MemoryCache({
  maxEntries: 2000,
  defaultTTL: 1800000, // TTL configurable
  evictionPolicy: 'FIFO'
});
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: WebSocket ✅ COMPLETADO
- [x] Actualizar configuración en `backend/src/app.ts` ✅
- [x] Eliminar hooks duplicados de WebSocket ✅
- [x] Actualizar imports en componentes ✅
- [x] Configuración optimizada con ping/pong mejorado ✅
- [x] Reconexión automática implementada ✅

### Fase 2: Auto-Refresh ✅ COMPLETADO
- [x] Crear `auth-refresh.service.ts` ✅
- [x] Integrar en `AuthContext.tsx` ✅
- [x] Crear configuración de Supabase ✅
- [x] Refresh automático funcionando ✅
- [x] Prevención de desconexiones por token expirado ✅

### Fase 3: Memoria ✅ COMPLETADO
- [x] Implementar `memory-cache.service.ts` ✅
- [x] Integrar límites en `chatbot.service.ts` ✅
- [x] Añadir límites a Maps (MAX 1000 conversaciones) ✅
- [x] Sistema de limpieza automática ✅
- [x] Políticas de eviction (LRU, LFU, FIFO) ✅

### Validación Final
- [ ] Tests de carga con usuarios concurrentes
- [ ] Monitoreo continuo
- [ ] Documentación actualizada
- [ ] Code review completado
- [ ] Deploy a staging

---

*Documento técnico de implementación*  
*Versión: 1.0.0*