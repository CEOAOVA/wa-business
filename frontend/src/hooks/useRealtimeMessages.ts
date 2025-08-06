/**
 * Hook para manejar mensajes en tiempo real con Supabase Realtime
 * Integración no invasiva que complementa el sistema WebSocket existente
 * Versión mejorada con integración completa al estado global
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { realtimeService, type RealtimeMessage } from '../services/realtime.service';
import { useAppOptimized } from '../context/AppContextOptimized';
import type { Message } from '../types';

export interface UseRealtimeMessagesOptions {
  enabled?: boolean; // Permite habilitar/deshabilitar Realtime
  fallbackToWebSocket?: boolean; // Si usar WebSocket como fallback
  onMessage?: (message: RealtimeMessage) => void; // Callback personalizado
  autoReconnect?: boolean; // Reconexión automática
  maxReconnectAttempts?: number; // Máximo intentos de reconexión
}

export interface RealtimeStats {
  isEnabled: boolean;
  isSubscribed: boolean;
  lastMessageReceived?: Date;
  messagesReceived: number;
  errors: number;
  reconnectAttempts: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export const useRealtimeMessages = (
  conversationId: string | undefined,
  options: UseRealtimeMessagesOptions = {}
) => {
  // Chequeo de token al inicio del hook
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const hasValidToken = !!authToken && authToken.length > 100;
  if (!hasValidToken) {
    return {
      stats: {
        isEnabled: false,
        isSubscribed: false,
        messagesReceived: 0,
        errors: 0,
        reconnectAttempts: 0,
        connectionStatus: 'disconnected',
      },
      cleanup: () => {},
    };
  }
  const { dispatch } = useAppOptimized();
  const [stats, setStats] = useState<RealtimeStats>({
    isEnabled: false,
    isSubscribed: false,
    messagesReceived: 0,
    errors: 0,
    reconnectAttempts: 0,
    connectionStatus: 'disconnected'
  });

  const {
    enabled = true,
    fallbackToWebSocket = true,
    onMessage,
    autoReconnect = true,
    maxReconnectAttempts = 3
  } = options;

  // Referencias para evitar re-suscripciones innecesarias
  const currentConversationId = useRef<string | undefined>(undefined);
  const isSubscribed = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Función para convertir mensaje de Realtime al formato del contexto
  const convertRealtimeMessage = useCallback((realtimeMessage: RealtimeMessage): Message => {
    return {
      id: realtimeMessage.id.toString(),
      conversation_id: realtimeMessage.conversation_id,
      content: realtimeMessage.content,
      senderId: realtimeMessage.sender_type === 'user' ? 'user' : 
               realtimeMessage.sender_type === 'bot' ? 'bot' : 'agent',
      sender_type: realtimeMessage.sender_type,
      message_type: realtimeMessage.message_type as 'text' | 'image' | 'quote' | 'document',
      timestamp: new Date(realtimeMessage.created_at),
      created_at: realtimeMessage.created_at,
      is_read: realtimeMessage.is_read,
      clientId: realtimeMessage.client_id,
      metadata: realtimeMessage.metadata
    };
  }, []);

  // Función para limpiar suscripciones
  const cleanup = useCallback(() => {
    if (currentConversationId.current) {
      console.log(`🔌 [useRealtimeMessages] Limpiando suscripción para: ${currentConversationId.current}`);
      realtimeService.unsubscribeFromConversation(currentConversationId.current);
      isSubscribed.current = false;
      
      setStats(prev => ({
        ...prev,
        isSubscribed: false,
        connectionStatus: 'disconnected'
      }));
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Función de reconexión
  const attemptReconnect = useCallback(() => {
    if (!autoReconnect || !conversationId) return;
    
    setStats(prev => {
      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        console.error('❌ [useRealtimeMessages] Máximo de intentos de reconexión alcanzado');
        return { ...prev, connectionStatus: 'disconnected' };
      }
      
      const newAttempts = prev.reconnectAttempts + 1;
      console.log(`🔄 [useRealtimeMessages] Intento de reconexión ${newAttempts}/${maxReconnectAttempts}`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setStats(current => ({ ...current, connectionStatus: 'reconnecting' }));
      }, Math.pow(2, newAttempts) * 1000); // Backoff exponencial
      
      return { 
        ...prev, 
        reconnectAttempts: newAttempts,
        connectionStatus: 'reconnecting'
      };
    });
  }, [autoReconnect, conversationId, maxReconnectAttempts]);

  useEffect(() => {
    // Verificar si Realtime está disponible y habilitado
    const isRealtimeAvailable = realtimeService.isRealtimeEnabled();
    
    setStats(prev => ({
      ...prev,
      isEnabled: isRealtimeAvailable && enabled
    }));

    if (!isRealtimeAvailable || !enabled || !conversationId) {
      console.log('🔄 [useRealtimeMessages] Realtime no disponible o deshabilitado, usando WebSocket');
      return;
    }

    // Si es la misma conversación, no re-suscribir
    if (currentConversationId.current === conversationId && isSubscribed.current) {
      return;
    }

    // Limpiar suscripción anterior si existe
    if (currentConversationId.current && currentConversationId.current !== conversationId) {
      realtimeService.unsubscribeFromConversation(currentConversationId.current);
      isSubscribed.current = false;
    }

    console.log(`🔄 [useRealtimeMessages] Suscribiéndose a conversación: ${conversationId}`);

    // Crear nueva suscripción
    const channel = realtimeService.subscribeToConversation(conversationId, {
      onMessageInsert: (message: RealtimeMessage) => {
        console.log('📨 [useRealtimeMessages] Nuevo mensaje via Realtime:', message);
        
        // Convertir y dispatch al contexto global
        const formattedMessage = convertRealtimeMessage(message);
        dispatch({ 
          type: 'ADD_MESSAGE', 
          payload: formattedMessage 
        });
        
        // Callback personalizado
        if (onMessage) {
          onMessage(message);
        }

        // Actualizar estadísticas
        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
          lastMessageReceived: new Date(),
          isSubscribed: true,
          connectionStatus: 'connected',
          reconnectAttempts: 0 // Reset en conexión exitosa
        }));
      },

      onMessageUpdate: (message: RealtimeMessage) => {
        console.log('📝 [useRealtimeMessages] Mensaje actualizado via Realtime:', message);
        
        // Actualizar mensaje existente en el contexto
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            clientId: message.client_id || message.id.toString(),
            updates: {
              is_read: message.is_read,
              content: message.content,
              metadata: message.metadata
            }
          }
        });
        
        // Callback personalizado
        if (onMessage) {
          onMessage(message);
        }
      },

      onConversationUpdate: (conversation: any) => {
        console.log('🔄 [useRealtimeMessages] Conversación actualizada via Realtime:', conversation);
        // Aquí podrías agregar lógica para actualizar el estado de la conversación
      },

      onError: (error: any) => {
        console.error('❌ [useRealtimeMessages] Error en Realtime:', error);
        
        setStats(prev => ({
          ...prev,
          errors: prev.errors + 1,
          connectionStatus: 'disconnected'
        }));

        // Intentar reconexión automática
        attemptReconnect();

        if (fallbackToWebSocket) {
          console.log('🔄 [useRealtimeMessages] Fallback a WebSocket por error en Realtime');
        }
      }
    });

    if (channel) {
      currentConversationId.current = conversationId;
      isSubscribed.current = true;
      
      setStats(prev => ({
        ...prev,
        isSubscribed: true,
        connectionStatus: 'connected'
      }));
    }

    // Cleanup al desmontar o cambiar conversación
    return cleanup;
  }, [conversationId, enabled, onMessage, fallbackToWebSocket, dispatch, convertRealtimeMessage, cleanup, attemptReconnect]);

  // Cleanup general al desmontar el componente
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    stats,
    isRealtimeEnabled: realtimeService.isRealtimeEnabled(),
    realtimeService,
    // Funciones de control
    reconnect: attemptReconnect,
    disconnect: cleanup
  };
};
