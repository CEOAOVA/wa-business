import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Use relative path to leverage Vite proxy in development
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

const DEFAULT_CONFIG: WebSocketConfig = {
  maxRetries: 10, // Reducido de 15 para evitar bucles infinitos
  baseDelay: 500,
  maxDelay: 30000,
  heartbeatInterval: 5000, // Sincronizado con backend
  heartbeatTimeout: 8000, // Sincronizado con backend
  reconnectOnClose: true,
  autoReconnect: true,
  messageQueueSize: 100,
};

export function useWebSocket(config: Partial<WebSocketConfig> = {}) {
  // Chequeo de token al inicio del hook
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const hasValidToken = !!authToken && authToken.length > 100;
  // Si no hay token válido, retorna early un objeto mínimo sin conectar
  if (!hasValidToken) {
    return {
      isConnected: false,
      connectionError: 'No hay token de autenticación',
      connect: () => {},
      disconnect: () => {},
      sendMessage: () => {},
      onNewMessage: () => {},
      onConversationUpdate: () => {},
      onConnectionChange: () => {},
      connectionQuality: 'poor',
      retryCount: 0,
      lastHeartbeat: null,
      processMessageQueue: () => {},
      addNotification: () => {},
    };
  }
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');
  
  const socketRef = useRef<Socket | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const messageQueueRef = useRef<any[]>([]);
  const lastPingTimeRef = useRef<number>(0);
  const connectionStartTimeRef = useRef<number>(0);
  const circuitBreakerRef = useRef<'CLOSED' | 'OPEN' | 'HALF_OPEN'>('CLOSED');
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef(0);

  // Calcular delay exponencial con jitter
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(1.5, attempt),
      finalConfig.maxDelay
    );
    
    const jitterFactor = Math.min(attempt * 0.1, 0.5);
    const jitter = Math.random() * jitterFactor * exponentialDelay;
    return exponentialDelay + jitter;
  }, [finalConfig]);

  // Limpiar timeouts y intervals
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

  // Circuit breaker logic
  const shouldAttemptConnection = useCallback(() => {
    const now = Date.now();
    
    if (circuitBreakerRef.current === 'OPEN') {
      // Si está abierto, verificar si ha pasado suficiente tiempo para intentar
      if (now - lastFailureTimeRef.current > 30000) { // 30 segundos
        circuitBreakerRef.current = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return true;
  }, []);

  // Procesar cola de mensajes
  const processMessageQueue = useCallback(() => {
    if (!socketRef.current?.connected || messageQueueRef.current.length === 0) {
      return;
    }

    const messages = [...messageQueueRef.current];
    messageQueueRef.current = [];

    messages.forEach(({ event, data, timestamp }) => {
      const age = Date.now() - timestamp;
      if (age < 30000) { // Solo procesar mensajes de menos de 30 segundos
        socketRef.current?.emit(event, data);
      }
    });
  }, []);

  // Configurar heartbeat optimizado
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
        
        // Configurar timeout para heartbeat
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

  // Manejar heartbeat response con métricas
  const handlePong = useCallback((data: { timestamp: number }) => {
    const now = Date.now();
    const latency = now - data.timestamp;
    
    setLastHeartbeat(new Date());
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    // Evaluar calidad de conexión basada en latencia
    if (latency < 100) {
      setConnectionQuality('excellent');
    } else if (latency < 500) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }

    console.log(`💓 Heartbeat recibido - Latencia: ${latency}ms`);
  }, []);

  // Conectar WebSocket con optimizaciones
  const connect = useCallback(() => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log('🌐 WebSocket ya está conectando/conectado');
      return;
    }

    if (!shouldAttemptConnection()) {
      console.log('🚫 Circuit breaker abierto - no intentando conexión');
      return;
    }

    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    
    // Limpiar cualquier socket anterior
    if (socketRef.current) {
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (error) {
        console.warn('⚠️ Error limpiando socket anterior:', error);
      }
      socketRef.current = null;
    }

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 15000, // Reducido para conexión más rápida
      forceNew: true,
      reconnection: false, // Manejar reconexión manualmente
      autoConnect: true,
      closeOnBeforeunload: false,
      upgrade: true,
      reconnectionAttempts: 0, // Deshabilitar reconexión automática
    });

    // Configurar listeners ANTES de asignar el socket
    socket.on('connect', () => {
      const connectionTime = Date.now() - connectionStartTimeRef.current;
      console.log(`✅ WebSocket conectado en ${connectionTime}ms:`, socket.id);
      
      setIsConnected(true);
      setConnectionError(null);
      setRetryCount(0);
      isConnectingRef.current = false;
      
      // Reset circuit breaker on successful connection
      circuitBreakerRef.current = 'CLOSED';
      failureCountRef.current = 0;

      setupHeartbeat();
      processMessageQueue();
      
      if (eventHandlers.current.onConnectionChange) {
        eventHandlers.current.onConnectionChange(true);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      
      if (eventHandlers.current.onConnectionChange) {
        eventHandlers.current.onConnectionChange(false);
      }
      
      // Solo reconectar si no fue una desconexión intencional
      if (reason !== 'io client disconnect' && finalConfig.reconnectOnClose) {
        handleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      isConnectingRef.current = false;
      
      // Circuit breaker logic
      failureCountRef.current++;
      lastFailureTimeRef.current = Date.now();
      
      if (failureCountRef.current >= 3) {
        circuitBreakerRef.current = 'OPEN';
        console.warn('🚫 Circuit breaker abierto - demasiados fallos consecutivos');
      }
      
      if (finalConfig.autoReconnect) {
        handleReconnect();
      }
    });

    // Eventos de heartbeat
    socket.on('pong', handlePong);

    // Eventos de mensajería
    socket.on('new_message', (data: WebSocketMessage) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      if (eventHandlers.current.onNewMessage) {
        eventHandlers.current.onNewMessage(data);
      }
    });

    socket.on('conversation_updated', (data: ConversationUpdateEvent) => {
      console.log('📝 Conversación actualizada:', data);
      if (eventHandlers.current.onConversationUpdate) {
        eventHandlers.current.onConversationUpdate(data);
      }
    });

    socketRef.current = socket;
  }, [retryCount, finalConfig, shouldAttemptConnection, setupHeartbeat, processMessageQueue, clearTimeouts, handlePong]);

  // Manejar reconexión con circuit breaker
  const handleReconnect = useCallback(() => {
    if (retryCount >= finalConfig.maxRetries) {
      console.error('❌ Máximo de reintentos alcanzado');
      return;
    }

    if (!shouldAttemptConnection()) {
      console.log('🚫 Circuit breaker abierto - no reintentando');
      return;
    }

    const delay = calculateDelay(retryCount);
    console.log(`🔄 Reintentando conexión en ${delay}ms...`);
    
    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      connect();
    }, delay);
  }, [retryCount, finalConfig.maxRetries, shouldAttemptConnection, calculateDelay, connect]);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    clearTimeouts();
    setIsConnected(false);
    setConnectionError(null);
    setRetryCount(0);
  }, [clearTimeouts]);

  // Enviar mensaje con fallback a cola
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      // Agregar a cola si no está conectado
      if (messageQueueRef.current.length < finalConfig.messageQueueSize) {
        messageQueueRef.current.push({
          event,
          data,
          timestamp: Date.now()
        });
      }
    }
  }, [finalConfig.messageQueueSize]);

  // Callbacks para eventos
  const eventHandlers = useRef<{
    onNewMessage?: (data: WebSocketMessage) => void;
    onConversationUpdate?: (data: ConversationUpdateEvent) => void;
    onConnectionChange?: (connected: boolean) => void;
  }>({});

  // Configurar callbacks
  const setEventHandlers = useCallback((handlers: typeof eventHandlers.current) => {
    eventHandlers.current = handlers;
  }, []);

  // Métodos para compatibilidad con AppContext
  const onNewMessage = useCallback((callback: (data: WebSocketMessage) => void) => {
    eventHandlers.current.onNewMessage = callback;
  }, []);

  const onConversationUpdate = useCallback((callback: (data: ConversationUpdateEvent) => void) => {
    eventHandlers.current.onConversationUpdate = callback;
  }, []);

  const onConnectionChange = useCallback((callback: (connected: boolean) => void) => {
    eventHandlers.current.onConnectionChange = callback;
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    sendMessage('join_conversation', { conversationId });
  }, [sendMessage]);

  const leaveConversation = useCallback((conversationId: string) => {
    sendMessage('leave_conversation', { conversationId });
  }, [sendMessage]);

  // Conectar automáticamente al montar
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    retryCount,
    lastHeartbeat,
    connectionQuality,
    connect,
    disconnect,
    sendMessage,
    setEventHandlers,
    onNewMessage,
    onConversationUpdate,
    onConnectionChange,
    joinConversation,
    leaveConversation,
    socket: socketRef.current
  };
} 