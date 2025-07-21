import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '../stores/appStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

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
}

const DEFAULT_CONFIG: WebSocketConfig = {
  maxRetries: 10,
  baseDelay: 1000, // 1 segundo
  maxDelay: 30000, // 30 segundos
  heartbeatInterval: 30000, // 30 segundos
  heartbeatTimeout: 5000, // 5 segundos
};

export function useWebSocketImproved(config: Partial<WebSocketConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const isConnectingRef = useRef(false);
  
  const { setConnectionState, incrementRetryCount, resetRetryCount, addNotification } = useAppStore();

  // Calcular delay exponencial con jitter
  const calculateDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(2, attempt),
      finalConfig.maxDelay
    );
    
    // Agregar jitter para evitar thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }, [finalConfig]);

  // Limpiar timeouts
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

  // Configurar heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        console.log('💓 Enviando heartbeat...');
        socketRef.current.emit('ping');
        
        // Configurar timeout para heartbeat
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ Heartbeat timeout - reconectando...');
          socketRef.current?.disconnect();
        }, finalConfig.heartbeatTimeout);
      }
    }, finalConfig.heartbeatInterval);
  }, [finalConfig.heartbeatInterval, finalConfig.heartbeatTimeout]);

  // Manejar heartbeat response
  const handlePong = useCallback(() => {
    setLastHeartbeat(new Date());
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    console.log('💓 Heartbeat recibido');
  }, []);

  // Conectar WebSocket
  const connect = useCallback(() => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log('🌐 WebSocket ya está conectando/conectado');
      return;
    }

    isConnectingRef.current = true;
    console.log(`🔌 Conectando a WebSocket... (intento ${retryCount + 1}/${finalConfig.maxRetries})`);
    
    setConnectionState({
      isConnecting: true,
      connectionError: undefined,
    });

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: false, // Manejar reconexión manualmente
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
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
      
      addNotification({
        type: 'success',
        title: 'Conectado',
        message: 'Conexión WebSocket establecida',
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
      if (reason !== 'io client disconnect') {
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

      handleReconnect();
    });

    // Eventos de heartbeat
    socket.on('pong', handlePong);

    // Eventos de mensajería
    socket.on('new_message', (data: WebSocketMessage) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      // El store se encargará de procesar el mensaje
    });

    socket.on('conversation_updated', (data: ConversationUpdateEvent) => {
      console.log('📝 Conversación actualizada:', data);
      // El store se encargará de procesar la actualización
    });

    socketRef.current = socket;
  }, [retryCount, finalConfig.maxRetries, setConnectionState, resetRetryCount, setupHeartbeat, addNotification, clearTimeouts, handlePong]);

  // Manejar reconexión con backoff exponencial
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
      socketRef.current.disconnect();
      socketRef.current = null;
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
    }, 1000);
  }, [disconnect, connect, resetRetryCount]);

  // Unirse a una conversación específica
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📨 Uniéndose a conversación: ${conversationId}`);
      socketRef.current.emit('join_conversation', conversationId);
    } else {
      console.warn('⚠️ No se puede unir a conversación - WebSocket no conectado');
    }
  }, []);

  // Salir de una conversación
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Saliendo de conversación: ${conversationId}`);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  // Enviar mensaje personalizado
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Enviando evento ${event}:`, data);
      socketRef.current.emit(event, data);
      return true;
    } else {
      console.warn('⚠️ No se puede enviar mensaje - WebSocket no conectado');
      return false;
    }
  }, []);

  // Efecto para conectar automáticamente
  useEffect(() => {
    connect();

    // Cleanup al desmontar
    return () => {
      disconnect();
    };
  }, []);

  // Efecto para manejar cambios en el estado de conexión
  useEffect(() => {
    if (!isConnected && !connectionError && retryCount === 0) {
      // Primera conexión fallida
      handleReconnect();
    }
  }, [isConnected, connectionError, retryCount, handleReconnect]);

  return {
    // Estado
    isConnected,
    connectionError,
    retryCount,
    lastHeartbeat,
    
    // Acciones
    connect,
    disconnect,
    reconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    
    // Utilidades
    socket: socketRef.current,
    canSend: isConnected && socketRef.current?.connected,
  };
} 