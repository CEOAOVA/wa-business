import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../stores/appStore';

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
    clientId?: string; // NUEVO: Identificador único del frontend para evitar duplicados
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
  maxRetries: 15,
  baseDelay: 500, // 0.5 segundos
  maxDelay: 30000, // 30 segundos
  heartbeatInterval: 25000, // 25 segundos
  heartbeatTimeout: 3000, // 3 segundos
  reconnectOnClose: true,
  autoReconnect: true,
  messageQueueSize: 100,
};

export function useWebSocketOptimized(config: Partial<WebSocketConfig> = {}) {
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
  
  const { setConnectionState, incrementRetryCount, resetRetryCount, addNotification } = useAppStore();

  // Calcular delay exponencial con jitter mejorado
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(1.5, attempt), // Backoff más suave
      finalConfig.maxDelay
    );
    
    // Jitter más inteligente basado en el intento
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

    isConnectingRef.current = true;
    connectionStartTimeRef.current = Date.now();
    
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    
    setConnectionState({
      isConnecting: true,
      connectionError: undefined,
    });

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
      // Configuraciones adicionales para mejor rendimiento
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
      
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        lastConnected: new Date(),
        connectionError: undefined,
        retryCount: 0,
      });

      resetRetryCount();
      setupHeartbeat();
      processMessageQueue(); // Procesar mensajes en cola
      
      addNotification({
        type: 'success',
        title: 'Conectado',
        message: `Conexión establecida en ${connectionTime}ms`,
        isRead: false,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
      isConnectingRef.current = false;
      clearTimeouts();
      
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: reason || 'Desconexión desconocida',
      });

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
      
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        connectionError: error.message,
      });

      if (finalConfig.autoReconnect) {
        handleReconnect();
      }
    });

    // Eventos de heartbeat
    socket.on('pong', handlePong);

    // Eventos de mensajería con optimizaciones
    socket.on('new_message', (data: WebSocketMessage) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      // El store se encargará de procesar el mensaje
    });

    socket.on('conversation_updated', (data: ConversationUpdateEvent) => {
      console.log('📝 Conversación actualizada:', data);
      // El store se encargará de procesar la actualización
    });

    // Eventos de estado de conexión
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión ${attemptNumber}`);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión automática');
    });

    // Asignar el socket DESPUÉS de configurar todos los listeners
    socketRef.current = socket;
  }, [retryCount, finalConfig, setConnectionState, resetRetryCount, setupHeartbeat, addNotification, clearTimeouts, handlePong, processMessageQueue]);

  // Manejar reconexión con backoff exponencial mejorado
  const handleReconnect = useCallback(() => {
    if (retryCount >= finalConfig.maxRetries) {
      console.error(`❌ Máximo número de reintentos alcanzado (${finalConfig.maxRetries})`);
      setConnectionError('No se pudo establecer conexión después de múltiples intentos');
      
      addNotification({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
        isRead: false,
      });
      
      return;
    }

    const delay = calculateDelay(retryCount);
    console.log(`🔄 Reintentando conexión en ${delay}ms...`);
    
    incrementRetryCount();
    setRetryCount(prev => prev + 1);
    
    retryTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [retryCount, finalConfig.maxRetries, calculateDelay, incrementRetryCount, connect, addNotification]);

  // Desconectar WebSocket
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
    
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      connectionError: undefined,
      retryCount: 0,
    });
  }, [clearTimeouts, setConnectionState]);

  // Reconectar manualmente
  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual iniciada...');
    disconnect();
    setRetryCount(0);
    resetRetryCount();
    
    setTimeout(() => {
      connect();
    }, 500); // Reducido para reconexión más rápida
  }, [disconnect, connect, resetRetryCount]);

  // Unirse a una conversación específica
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📨 Uniéndose a conversación: ${conversationId}`);
      socketRef.current.emit('join_conversation', conversationId);
    } else {
      console.warn('⚠️ No se puede unir a conversación - WebSocket no conectado');
      // Agregar a la cola para enviar cuando se reconecte
      messageQueueRef.current.push({
        event: 'join_conversation',
        data: conversationId,
        timestamp: Date.now()
      });
    }
  }, []);

  // Salir de una conversación
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Saliendo de conversación: ${conversationId}`);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  // Enviar mensaje personalizado con cola
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Enviando evento ${event}:`, data);
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn('⚠️ No se puede enviar mensaje - WebSocket no conectado, agregando a cola');
      
      // Agregar a la cola si hay espacio
      if (messageQueueRef.current.length < finalConfig.messageQueueSize) {
        messageQueueRef.current.push({
          event,
          data,
          timestamp: Date.now()
        });
      }
      return false;
    }
  }, [finalConfig.messageQueueSize]);

  // Efecto para conectar automáticamente
  useEffect(() => {
    const isMountedRef = { current: true };
    
    if (isMountedRef.current) {
      connect();
    }

    // Cleanup al desmontar
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, []); // Solo ejecutar una vez al montar

  // Efecto para manejar cambios en el estado de conexión
  useEffect(() => {
    if (!isConnected && !connectionError && retryCount === 0) {
      // Primera conexión fallida
      handleReconnect();
    }
  }, [isConnected, connectionError, retryCount, handleReconnect]);

  // Callbacks para eventos de WebSocket
  const [newMessageCallback, setNewMessageCallback] = useState<((data: WebSocketMessage) => void) | null>(null);
  const [conversationUpdateCallback, setConversationUpdateCallback] = useState<((data: ConversationUpdateEvent) => void) | null>(null);

  // Configurar callbacks para eventos
  const onNewMessage = useCallback((callback: (data: WebSocketMessage) => void) => {
    setNewMessageCallback(() => callback);
  }, []);

  const onConversationUpdate = useCallback((callback: (data: ConversationUpdateEvent) => void) => {
    setConversationUpdateCallback(() => callback);
  }, []);

  // Efecto para manejar eventos de WebSocket
  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (data: WebSocketMessage) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      if (newMessageCallback) {
        newMessageCallback(data);
      }
    };

    const handleConversationUpdate = (data: ConversationUpdateEvent) => {
      console.log('📝 Conversación actualizada:', data);
      if (conversationUpdateCallback) {
        conversationUpdateCallback(data);
      }
    };

    socketRef.current.on('new_message', handleNewMessage);
    socketRef.current.on('conversation_updated', handleConversationUpdate);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message', handleNewMessage);
        socketRef.current.off('conversation_updated', handleConversationUpdate);
      }
    };
  }, [newMessageCallback, conversationUpdateCallback]);

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
    canSend: isConnected && socketRef.current?.connected,
    messageQueueSize: messageQueueRef.current.length,
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