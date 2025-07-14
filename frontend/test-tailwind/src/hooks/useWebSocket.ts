import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Callbacks para eventos
  const eventHandlers = useRef<{
    onNewMessage?: (data: WebSocketMessage) => void;
    onConversationUpdate?: (data: ConversationUpdateEvent) => void;
    onConnectionChange?: (connected: boolean) => void;
  }>({});

  // Conectar a WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🌐 WebSocket ya está conectado');
      return;
    }

    console.log('🔌 Conectando a WebSocket...', BACKEND_URL);
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      eventHandlers.current.onConnectionChange?.(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      setIsConnected(false);
      eventHandlers.current.onConnectionChange?.(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      eventHandlers.current.onConnectionChange?.(false);
    });

    // Eventos de mensajería
    socket.on('new_message', (data: WebSocketMessage) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      eventHandlers.current.onNewMessage?.(data);
    });

    socket.on('conversation_updated', (data: ConversationUpdateEvent) => {
      console.log('📝 Conversación actualizada:', data);
      eventHandlers.current.onConversationUpdate?.(data);
    });

    socketRef.current = socket;
  }, []);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Unirse a una conversación específica
  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📨 Uniéndose a conversación: ${conversationId}`);
      socketRef.current.emit('join_conversation', conversationId);
    }
  }, []);

  // Salir de una conversación
  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      console.log(`📤 Saliendo de conversación: ${conversationId}`);
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  // Registrar manejadores de eventos
  const onNewMessage = useCallback((handler: (data: WebSocketMessage) => void) => {
    eventHandlers.current.onNewMessage = handler;
  }, []);

  const onConversationUpdate = useCallback((handler: (data: ConversationUpdateEvent) => void) => {
    eventHandlers.current.onConversationUpdate = handler;
  }, []);

  const onConnectionChange = useCallback((handler: (connected: boolean) => void) => {
    eventHandlers.current.onConnectionChange = handler;
  }, []);

  // Reconexión automática
  const reconnect = useCallback(() => {
    console.log('🔄 Intentando reconectar WebSocket...');
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Efecto para conectar automáticamente
  useEffect(() => {
    connect();

    // Cleanup al desmontar
    return () => {
      disconnect();
    };
  }, []);

  // Efecto para reconexión automática cuando se pierde la conexión
  useEffect(() => {
    if (!isConnected && !connectionError) {
      const reconnectTimer = setTimeout(() => {
        console.log('🔄 Reconectando automáticamente...');
        reconnect();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [isConnected, connectionError, reconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnect,
    joinConversation,
    leaveConversation,
    onNewMessage,
    onConversationUpdate,
    onConnectionChange,
  };
} 