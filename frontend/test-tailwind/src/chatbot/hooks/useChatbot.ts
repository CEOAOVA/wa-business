import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  UseChatbotReturn,
  ConversationState,
  ChatbotMessage,
  ClientInfo,
  DataCollectionStatus
} from '../types/chatbot';
import { AutopartsConversationService } from '../services/conversation-service';
import { isClientInfoComplete } from '../types/chatbot';

/**
 * Hook principal para el chatbot de repuestos automotrices
 * Proporciona interfaz limpia para componentes React
 */
export function useChatbot(userId?: string): UseChatbotReturn {
  // Estado local del hook
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Referencias para mantener instancias estables
  const conversationServiceRef = useRef<AutopartsConversationService | null>(null);
  const conversationIdRef = useRef<string>('');
  const userIdRef = useRef<string>(userId || 'client-' + Date.now());

  // Inicializar servicio de conversación
  useEffect(() => {
    if (!conversationServiceRef.current) {
      console.log('[useChatbot] Inicializando servicio de conversación...');
      
      try {
        conversationServiceRef.current = new AutopartsConversationService();
        conversationIdRef.current = `conv-${userIdRef.current}-${Date.now()}`;
        
        // Iniciar conversación automáticamente
        startNewConversation();
      } catch (err) {
        console.error('[useChatbot] Error inicializando servicio:', err);
        setError('Error inicializando el chatbot. Por favor recarga la página.');
      }
    }
  }, []);

  /**
   * Iniciar nueva conversación
   */
  const startNewConversation = useCallback(async () => {
    if (!conversationServiceRef.current) return;

    try {
      setError(null);
      setIsThinking(true);

      const result = await conversationServiceRef.current.startConversation(
        conversationIdRef.current,
        userIdRef.current
      );

      setConversationState(result.conversationState);
      setIsThinking(false);

      console.log('[useChatbot] Nueva conversación iniciada:', conversationIdRef.current);
    } catch (err) {
      console.error('[useChatbot] Error iniciando conversación:', err);
      setError('Error iniciando la conversación');
      setIsThinking(false);
    }
  }, []);

  /**
   * Enviar mensaje del usuario
   */
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!conversationServiceRef.current || !message.trim()) {
      return;
    }

    if (isThinking) {
      console.warn('[useChatbot] Ya hay un mensaje siendo procesado');
      return;
    }

    try {
      setError(null);
      setIsThinking(true);

      console.log(`[useChatbot] Enviando mensaje: "${message.substring(0, 50)}..."`);

      const result = await conversationServiceRef.current.processMessage(
        conversationIdRef.current,
        message.trim(),
        userIdRef.current
      );

      // Actualizar estado de la conversación
      setConversationState(result.conversationState);

      if (result.error) {
        setError(result.error);
      }

      if (result.functionCalled) {
        console.log(`[useChatbot] Función ejecutada: ${result.functionName}`);
      }

      console.log('[useChatbot] Respuesta del bot:', result.content.substring(0, 100) + '...');

    } catch (err) {
      console.error('[useChatbot] Error enviando mensaje:', err);
      setError('Error procesando el mensaje. Intenta de nuevo.');
    } finally {
      setIsThinking(false);
    }
  }, [isThinking]);

  /**
   * Resetear conversación
   */
  const resetConversation = useCallback(async (): Promise<void> => {
    if (!conversationServiceRef.current) return;

    try {
      setError(null);
      setIsThinking(true);

      // Generar nuevo ID de conversación
      conversationIdRef.current = `conv-${userIdRef.current}-${Date.now()}`;

      const newState = await conversationServiceRef.current.resetConversation(
        conversationIdRef.current,
        userIdRef.current
      );

      setConversationState(newState);
      console.log('[useChatbot] Conversación reseteada');

    } catch (err) {
      console.error('[useChatbot] Error reseteando conversación:', err);
      setError('Error reseteando la conversación');
    } finally {
      setIsThinking(false);
    }
  }, []);

  /**
   * Obtener historial de mensajes
   */
  const getConversationHistory = useCallback((): ChatbotMessage[] => {
    if (!conversationState) return [];
    return conversationState.messages;
  }, [conversationState]);

  /**
   * Obtener información del cliente recopilada
   */
  const clientInfo: ClientInfo = conversationState?.clientInfo || {};

  /**
   * Calcular progreso de recopilación
   */
  const collectionProgress = useCallback(() => {
    const requiredFields = [
      'nombre',
      'piezaNecesaria', 
      'vehiculo.marca',
      'vehiculo.modelo',
      'vehiculo.año',
      'vehiculo.litraje',
      'vehiculo.numeroSerie'
    ];

    const completedFields: string[] = [];
    const missingFields: string[] = [];

    // Verificar nombre
    if (clientInfo.nombre) {
      completedFields.push('nombre');
    } else {
      missingFields.push('nombre');
    }

    // Verificar pieza necesaria
    if (clientInfo.piezaNecesaria) {
      completedFields.push('piezaNecesaria');
    } else {
      missingFields.push('piezaNecesaria');
    }

    // Verificar campos del vehículo
    const vehiculo = clientInfo.vehiculo;
    if (vehiculo) {
      const vehicleFields = [
        { key: 'marca', value: vehiculo.marca },
        { key: 'modelo', value: vehiculo.modelo },
        { key: 'año', value: vehiculo.año },
        { key: 'litraje', value: vehiculo.litraje },
        { key: 'numeroSerie', value: vehiculo.numeroSerie }
      ];

      vehicleFields.forEach(field => {
        if (field.value) {
          completedFields.push(`vehiculo.${field.key}`);
        } else {
          missingFields.push(`vehiculo.${field.key}`);
        }
      });
    } else {
      missingFields.push(
        'vehiculo.marca',
        'vehiculo.modelo',
        'vehiculo.año',
        'vehiculo.litraje',
        'vehiculo.numeroSerie'
      );
    }

    const progressPercentage = Math.round(
      (completedFields.length / requiredFields.length) * 100
    );

    return {
      status: conversationState?.status || 'greeting' as DataCollectionStatus,
      completedFields,
      missingFields,
      progressPercentage
    };
  }, [clientInfo, conversationState?.status]);

  /**
   * Debug info (solo desarrollo)
   */
  useEffect(() => {
    if (import.meta.env.MODE === 'development' && conversationState) {
      console.log('[useChatbot] Estado actualizado:', {
        conversationId: conversationState.conversationId,
        status: conversationState.status,
        messageCount: conversationState.messages.length,
        clientInfo: conversationState.clientInfo,
        progress: collectionProgress()
      });
    }
  }, [conversationState, collectionProgress]);

  /**
   * Validar configuración del chatbot
   */
  const validateChatbot = useCallback((): { isValid: boolean; errors: string[] } => {
    if (!conversationServiceRef.current) {
      return {
        isValid: false,
        errors: ['Servicio de conversación no inicializado']
      };
    }

    return conversationServiceRef.current.validateService();
  }, []);

  /**
   * Obtener estadísticas del chatbot (debug)
   */
  const getChatbotStats = useCallback(() => {
    if (!conversationServiceRef.current) return null;
    return conversationServiceRef.current.getStats();
  }, []);

  /**
   * Verificar si la información está completa
   */
  const isDataComplete = useCallback((): boolean => {
    return isClientInfoComplete(clientInfo);
  }, [clientInfo]);

  /**
   * Obtener siguiente campo a recopilar
   */
  const getNextField = useCallback((): string | null => {
    const progress = collectionProgress();
    if (progress.missingFields.length === 0) return null;
    return progress.missingFields[0].replace('vehiculo.', '');
  }, [collectionProgress]);

  return {
    // Estado principal
    conversationState,
    isThinking,
    error,

    // Métodos principales
    sendMessage,
    resetConversation,
    getConversationHistory,

    // Información del cliente
    clientInfo,
    collectionProgress: collectionProgress(),

    // Métodos de utilidad
    validateChatbot,
    getChatbotStats,
    isDataComplete,
    getNextField
  };
}

/**
 * Hook simplificado para uso básico
 */
export function useSimpleChatbot(userId?: string) {
  const chatbot = useChatbot(userId);

  return {
    sendMessage: chatbot.sendMessage,
    messages: chatbot.getConversationHistory(),
    isThinking: chatbot.isThinking,
    error: chatbot.error,
    resetConversation: chatbot.resetConversation
  };
}

/**
 * Hook para obtener solo información del cliente
 */
export function useChatbotClientInfo(userId?: string) {
  const chatbot = useChatbot(userId);

  return {
    clientInfo: chatbot.clientInfo,
    progress: chatbot.collectionProgress,
    isComplete: chatbot.isDataComplete(),
    nextField: chatbot.getNextField()
  };
} 