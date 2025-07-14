import { useState, useCallback, useEffect } from 'react';
import whatsappApi from '../services/whatsapp-api';
import type { SendMessageRequest, SendTemplateRequest, WhatsAppStatus } from '../services/whatsapp-api';
import { generateMessageId } from '../utils/id-generator';

export interface WhatsAppMessage {
  id: string;
  to: string;
  message: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  error?: string;
  messageId?: string;
}

interface WhatsAppState {
  messages: WhatsAppMessage[];
  isConnected: boolean;
  isLoading: boolean;
  status: WhatsAppStatus | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

// Estado global singleton para evitar duplicados
let globalWhatsAppState: WhatsAppState = {
  messages: [],
  isConnected: false,
  isLoading: false,
  status: null,
  connectionStatus: 'disconnected'
};

// Lista de callbacks suscritos al estado
const stateCallbacks = new Set<(state: WhatsAppState) => void>();

// Función para actualizar el estado global
const updateGlobalState = (updates: Partial<WhatsAppState>) => {
  globalWhatsAppState = { ...globalWhatsAppState, ...updates };
  stateCallbacks.forEach(callback => callback(globalWhatsAppState));
};

export const useWhatsApp = () => {
  const [state, setState] = useState<WhatsAppState>(globalWhatsAppState);

  // Suscribirse a cambios del estado global
  useEffect(() => {
    const callback = (newState: WhatsAppState) => setState(newState);
    stateCallbacks.add(callback);
    
    return () => {
      stateCallbacks.delete(callback);
    };
  }, []);

  // Verificar conexión
  const checkConnection = useCallback(async () => {
    if (globalWhatsAppState.connectionStatus === 'connecting') {
      return; // Evitar múltiples llamadas simultáneas
    }

    updateGlobalState({ connectionStatus: 'connecting', isLoading: true });

    try {
      const [connectionOk, statusResponse] = await Promise.all([
        whatsappApi.checkConnection(),
        whatsappApi.getStatus()
      ]);

      if (connectionOk && statusResponse.success) {
        updateGlobalState({
          isConnected: true,
          connectionStatus: 'connected',
          status: statusResponse.data?.status || null,
          isLoading: false
        });

        console.log('✅ WhatsApp conectado:', statusResponse.data?.status);
      } else {
        throw new Error('Conexión fallida');
      }
    } catch (error: any) {
      console.error('❌ Error conectando WhatsApp:', error);
      updateGlobalState({
        isConnected: false,
        connectionStatus: 'error',
        isLoading: false
      });
    }
  }, []);

  // Enviar mensaje
  const sendMessage = useCallback(async (data: SendMessageRequest): Promise<boolean> => {
    const messageId = generateMessageId();
    const newMessage: WhatsAppMessage = {
      id: messageId,
      to: data.to,
      message: data.message,
      timestamp: new Date(),
      status: 'sending'
    };

    // Agregar mensaje a la lista
    updateGlobalState({
      messages: [...globalWhatsAppState.messages, newMessage]
    });

    try {
      const response = await whatsappApi.sendMessage(data);

      if (response.success) {
        // Actualizar mensaje como enviado
        const updatedMessages = globalWhatsAppState.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'sent' as const, messageId: response.data?.messageId }
            : msg
        );

        updateGlobalState({ messages: updatedMessages });
        console.log(`✅ Mensaje enviado a ${whatsappApi.formatPhoneForDisplay(data.to)}`);
        return true;
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('❌ Error enviando mensaje:', error);

      // Actualizar mensaje como error
      const updatedMessages = globalWhatsAppState.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'error' as const, error: error.message }
          : msg
      );

      updateGlobalState({ messages: updatedMessages });
      return false;
    }
  }, []);

  // Enviar template
  const sendTemplate = useCallback(async (data: SendTemplateRequest): Promise<boolean> => {
    const messageId = generateMessageId();
    const newMessage: WhatsAppMessage = {
      id: messageId,
      to: data.to,
      message: `[Template: ${data.template}]`,
      timestamp: new Date(),
      status: 'sending'
    };

    updateGlobalState({
      messages: [...globalWhatsAppState.messages, newMessage]
    });

    try {
      const response = await whatsappApi.sendTemplate(data);

      if (response.success) {
        const updatedMessages = globalWhatsAppState.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'sent' as const, messageId: response.data?.messageId }
            : msg
        );

        updateGlobalState({ messages: updatedMessages });
        console.log(`✅ Template "${data.template}" enviado a ${whatsappApi.formatPhoneForDisplay(data.to)}`);
        return true;
      } else {
        throw new Error(response.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('❌ Error enviando template:', error);

      const updatedMessages = globalWhatsAppState.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, status: 'error' as const, error: error.message }
          : msg
      );

      updateGlobalState({ messages: updatedMessages });
      return false;
    }
  }, []);

  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    updateGlobalState({ messages: [] });
    console.log('🗑️ Mensajes de WhatsApp limpiados');
  }, []);

  // Reenviar mensaje
  const resendMessage = useCallback(async (messageId: string): Promise<boolean> => {
    const message = globalWhatsAppState.messages.find(msg => msg.id === messageId);
    if (!message) return false;

    return await sendMessage({
      to: message.to,
      message: message.message
    });
  }, [sendMessage]);

  // Obtener estadísticas
  const getStats = useCallback(() => {
    const messages = globalWhatsAppState.messages;
    return {
      total: messages.length,
      sent: messages.filter(msg => msg.status === 'sent').length,
      errors: messages.filter(msg => msg.status === 'error').length,
      sending: messages.filter(msg => msg.status === 'sending').length
    };
  }, []);

  // Auto-conexión al cargar
  useEffect(() => {
    if (globalWhatsAppState.connectionStatus === 'disconnected') {
      checkConnection();
    }
  }, [checkConnection]);

  return {
    // Estado
    messages: state.messages,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    status: state.status,
    connectionStatus: state.connectionStatus,

    // Acciones
    sendMessage,
    sendTemplate,
    clearMessages,
    resendMessage,
    checkConnection,

    // Utilidades
    getStats,
    formatPhone: whatsappApi.formatPhoneForDisplay,
    validatePhone: whatsappApi.validatePhoneNumber,

    // API directa
    api: whatsappApi
  };
}; 