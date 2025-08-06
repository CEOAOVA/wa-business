import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

// Configuración del backend - Usando variables de entorno
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'https://dev-apiwaprueba.aova.mx');

export interface WebSocketMessage {
  message: {
    id: string;
    waMessageId: string;
    from: string;
    to: string;
    message: string;
    timestamp: Date;
    type: string;
    read: boolean;
    conversationId: string;
    contactId: string;
    clientId?: string;
  };
  conversation: {
    id: string;
    contactId: string;
    contactName: string;
    unreadCount: number;
  };
}

export interface ConversationUpdateEvent {
  conversationId: string;
  lastMessage: any;
  unreadCount: number;
}

interface WebSocketConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  reconnectOnClose: boolean;
  autoReconnect: boolean;
  messageQueueSize: number;
}

export function useWebSocketOptimized(config: Partial<WebSocketConfig> = {}) {
  // Configuración por defecto estable
  const defaultConfig: WebSocketConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    heartbeatInterval: 25000,
    heartbeatTimeout: 8000,
    reconnectOnClose: true,
    autoReconnect: true,
    messageQueueSize: 50,
  };

  const finalConfig = useMemo(() => ({
    ...defaultConfig,
    ...config,
  }), [config]);

  // Estados estables
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('poor');

  // Refs estables
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef<number>(0);
  const connectionStartTimeRef = useRef<number>(0);
  const messageQueueRef = useRef<Array<{ event: string; data: any; timestamp: number }>>([]);
  const hasInitializedRef = useRef(false);

  // Callbacks para eventos de WebSocket
  const [newMessageCallback, setNewMessageCallback] = useState<((data: WebSocketMessage) => void) | null>(null);
  const [conversationUpdateCallback, setConversationUpdateCallback] = useState<((data: ConversationUpdateEvent) => void) | null>(null);

  // Verificar token de forma estable - SOLO UNA VEZ
  const hasValidToken = useMemo(() => {
    const token = localStorage.getItem('authToken');
    return token && token.length >= 100;
  }, []);

  // Calcular delay exponencial con jitter mejorado - ESTABLE
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(1.5, attempt),
      finalConfig.maxDelay
    );
    
    const jitterFactor = Math.min(attempt * 0.1, 0.5);
    const jitter = Math.random() * jitterFactor * exponentialDelay;
    return exponentialDelay + jitter;
  }, [finalConfig.baseDelay, finalConfig.maxDelay]);

  // Limpiar timeouts y intervals - ESTABLE
  const clearTimeouts = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Procesar cola de mensajes - ESTABLE
  const processMessageQueue = useCallback(() => {
    if (!socketRef.current?.connected || messageQueueRef.current.length === 0) {
      return;
    }

    const messages = [...messageQueueRef.current];
    messageQueueRef.current = [];

    messages.forEach(({ event, data, timestamp }) => {
      const age = Date.now() - timestamp;
      if (age < 30000) {
        socketRef.current?.emit(event, data);
      }
    });
  }, []);

  // Configurar heartbeat optimizado - ESTABLE
  const setupHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const now = Date.now();
        lastPingTimeRef.current = now;
        
        console.log('💓 Enviando heartbeat...');
        socketRef.current.emit('ping', { timestamp: now });
        
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Heartbeat timeout - reconectando...');
          setConnectionQuality('poor');
          socketRef.current?.disconnect();
        }, finalConfig.heartbeatTimeout);
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval, finalConfig.heartbeatTimeout]);

  // Manejar heartbeat response con métricas - ESTABLE
  const handlePong = useCallback((data: { timestamp: number }) => {
    const now = Date.now();
    const latency = now - data.timestamp;
    
    setLastHeartbeat(new Date());
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (latency < 100) {
      setConnectionQuality('excellent');
    } else if (latency < 500) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }

    console.log(`💓 Heartbeat recibido - Latencia: ${latency}ms`);
  }, []);

  // Conectar WebSocket con optimizaciones - ESTABLE
  const connect = useCallback(() => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log('🌐 WebSocket ya está conectando/conectado');
      return;
    }

    // NO CONECTAR SI NO HAY TOKEN VÁLIDO
    const authToken = localStorage.getItem('authToken');
    if (!authToken || authToken.length < 100) {
      console.log('🔒 No hay token válido - saltando conexión');
      return;
    }

    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);

    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn('⚠️ Error limpiando socket anterior:', error);
      }
      socketRef.current = null;
    }
    
    console.log('🔐 Token encontrado, longitud:', authToken.length);
    console.log('🔐 Primeros 30 caracteres:', authToken.substring(0, 30) + '...');
    console.log('🌐 Conectando a:', BACKEND_URL);
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: {
        token: authToken
      },
      query: {
        token: authToken
      },
      timeout: 30000,
      forceNew: true,
      reconnection: false,
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: false,
      reconnectionAttempts: 0,
      withCredentials: true,
    });

    socket.on('connect', () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      
      setupHeartbeat();
      processMessageQueue();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      
      if (reason !== 'io client disconnect' && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Error de conexión WebSocket:', {
        type: error.type || 'unknown',
        message: error.message || 'Connection failed',
        data: error.data || null
      });
      
      if (error.message?.includes('auth') || error.message?.includes('Invalid') || error.message?.includes('No authentication')) {
        console.error('❌ Token inválido o expirado, requiere nuevo login');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }
      
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      
      if (finalConfig.autoReconnect && !error.message?.includes('auth') && !error.message?.includes('token')) {
        handleReconnect();
      }
    });

    socket.on('pong', handlePong);
    socket.on('new_message', (data) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      if (newMessageCallback) {
        newMessageCallback(data);
      }
    });
    
    socket.on('conversation_updated', (data) => {
      console.log('📝 Conversación actualizada:', data);
      if (conversationUpdateCallback) {
        conversationUpdateCallback(data);
      }
    });

    socketRef.current = socket;
  }, [retryCount, finalConfig.maxRetries, finalConfig.reconnectOnClose, finalConfig.autoReconnect, setupHeartbeat, processMessageQueue, clearTimeouts, handlePong, newMessageCallback, conversationUpdateCallback]);

  // Manejar reconexión con backoff exponencial mejorado - ESTABLE
  const handleReconnect = useCallback(() => {
    if (retryCount >= finalConfig.maxRetries) {
      console.error(`❌ Máximo número de reintentos alcanzado (${finalConfig.maxRetries})`);
      setConnectionError('No se pudo establecer conexión después de múltiples intentos');
      return;
    }

    const delay = calculateDelay(retryCount);
    console.log(`🔄 Reintentando conexión en ${delay}ms...`);
    
    setRetryCount(prev => prev + 1);
    
    retryTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [retryCount, finalConfig.maxRetries, calculateDelay, connect]);

  // Desconectar WebSocket - ESTABLE
  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando WebSocket...');
    clearTimeouts();
    
    if (socketRef.current) {
      try {
        if (socketRef.current.connected) {
          console.log('🔌 Socket activo, desconectando...');
          socketRef.current.disconnect();
        } else {
          console.log('🔌 Socket no está conectado, solo limpiando referencia');
        }
      } catch (error) {
        console.warn('⚠️ Error durante desconexión:', error);
      } finally {
        socketRef.current = null;
      }
    }
    
    setIsConnected(false);
    setConnectionError(null);
    setRetryCount(0);
    isConnectingRef.current = false;
  }, [clearTimeouts]);

  // Reconectar manualmente - ESTABLE
  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual iniciada...');
    disconnect();
    setRetryCount(0);
    
    setTimeout(() => {
      connect();
    }, 500);
  }, [disconnect, connect]);

  // Unirse a una conversación específica - ESTABLE
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📨 Uniéndose a conversación: ${conversationId}`);
      socketRef.current.emit('join_conversation', conversationId);
    } else {
      console.warn('⚠️ No se puede unir a conversación - WebSocket no conectado');
      messageQueueRef.current.push({
        event: 'join_conversation',
        data: conversationId,
        timestamp: Date.now()
      });
    }
  }, []);

  // Salir de una conversación - ESTABLE
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Saliendo de conversación: ${conversationId}`);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  // Enviar mensaje personalizado con cola - ESTABLE
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ No se puede enviar mensaje - WebSocket no conectado');
      if (messageQueueRef.current.length < finalConfig.messageQueueSize) {
        messageQueueRef.current.push({
          event,
          data,
          timestamp: Date.now()
        });
      }
    }
  }, [finalConfig.messageQueueSize]);

  // Configurar callbacks para eventos
  const onNewMessage = useCallback((callback: (data: WebSocketMessage) => void) => {
    setNewMessageCallback(() => callback);
  }, []);

  const onConversationUpdate = useCallback((callback: (data: ConversationUpdateEvent) => void) => {
    setConversationUpdateCallback(() => callback);
  }, []);

  // UN SOLO EFECTO PARA INICIALIZAR - SIN BUCLE
  useEffect(() => {
    // Solo inicializar una vez
    if (hasInitializedRef.current) {
      return;
    }
    
    hasInitializedRef.current = true;
    
    // Solo conectar si hay token válido Y no está ya conectado
    if (hasValidToken && !isConnected && !isConnectingRef.current) {
      console.log('🔌 [useWebSocketOptimized] Inicializando conexión...');
      connect();
    } else {
      console.log('🔒 [useWebSocketOptimized] No hay token válido o ya está conectando');
    }

    return () => {
      disconnect();
    };
  }, []); // SIN DEPENDENCIAS - SOLO UNA VEZ

  // Memoizar valores de retorno para evitar re-renders innecesarios
  const returnValue = useMemo(() => ({
    // Estado
    isConnected,
    connectionError,
    retryCount,
    lastHeartbeat,
    connectionQuality,
    
    // Acciones
    connect,
    disconnect,
    reconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    
    // Eventos
    onNewMessage,
    onConversationUpdate,
    
    // Utilidades
    socket: socketRef.current,
  }), [
    isConnected,
    connectionError,
    retryCount,
    lastHeartbeat,
    connectionQuality,
    connect,
    disconnect,
    reconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    onNewMessage,
    onConversationUpdate,
  ]);

  return returnValue;
} 