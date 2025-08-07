/**
 * Hook para gestionar historial de mensajes con paginación y cache
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../services/api';

interface Message {
  id: string;
  waMessageId: string;
  conversationId: string;
  content: string;
  from: string;
  to: string;
  type: string;
  status: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
  isFromMe: boolean;
  contact?: {
    id: string;
    phoneNumber: string;
    name: string;
    isVerified: boolean;
  };
}

interface HistoryState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
}

export const useMessageHistory = (conversationId: string) => {
  const [state, setState] = useState<HistoryState>({
    messages: [],
    loading: false,
    error: null,
    hasMore: true,
    nextCursor: null
  });

  const cache = useRef<Map<string, Message[]>>(new Map());
  const isLoadingRef = useRef(false);

  // Cargar mensajes desde localStorage
  useEffect(() => {
    const cacheKey = `messages_${conversationId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 minutos
          setState(prev => ({
            ...prev,
            messages: parsed.messages
          }));
          cache.current.set(conversationId, parsed.messages);
        }
      } catch (error) {
        console.error('Error parsing cached messages:', error);
      }
    }
  }, [conversationId]);

  // Guardar mensajes en localStorage
  const saveToCache = useCallback((messages: Message[]) => {
    const cacheKey = `messages_${conversationId}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        messages,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, [conversationId]);

  // Cargar mensajes iniciales
  const loadInitialMessages = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.get(`/history/conversations/${conversationId}/messages`, {
        params: { limit: 50 }
      });

      const { messages, pagination } = response.data.data;
      
      setState({
        messages,
        loading: false,
        error: null,
        hasMore: pagination.hasMore,
        nextCursor: pagination.nextCursor
      });

      // Guardar en cache
      cache.current.set(conversationId, messages);
      saveToCache(messages);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || 'Error cargando mensajes'
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [conversationId, saveToCache]);

  // Cargar más mensajes (scroll infinito)
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !state.hasMore || !state.nextCursor) return;
    
    isLoadingRef.current = true;
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await api.get(`/history/conversations/${conversationId}/messages`, {
        params: { 
          limit: 50,
          cursor: state.nextCursor
        }
      });

      const { messages: newMessages, pagination } = response.data.data;
      
      setState(prev => {
        const updatedMessages = [...prev.messages, ...newMessages];
        
        // Actualizar cache
        cache.current.set(conversationId, updatedMessages);
        saveToCache(updatedMessages);
        
        return {
          messages: updatedMessages,
          loading: false,
          error: null,
          hasMore: pagination.hasMore,
          nextCursor: pagination.nextCursor
        };
      });

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.error || 'Error cargando más mensajes'
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [conversationId, state.hasMore, state.nextCursor, saveToCache]);

  // Agregar nuevo mensaje al estado
  const addMessage = useCallback((message: Message) => {
    setState(prev => {
      const exists = prev.messages.some(m => m.id === message.id);
      if (exists) return prev;

      const updatedMessages = [message, ...prev.messages];
      
      // Actualizar cache
      cache.current.set(conversationId, updatedMessages);
      saveToCache(updatedMessages);
      
      return {
        ...prev,
        messages: updatedMessages
      };
    });
  }, [conversationId, saveToCache]);

  // Actualizar estado de mensaje
  const updateMessageStatus = useCallback((messageId: string, status: string) => {
    setState(prev => {
      const updatedMessages = prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, status } : msg
      );
      
      // Actualizar cache
      cache.current.set(conversationId, updatedMessages);
      saveToCache(updatedMessages);
      
      return {
        ...prev,
        messages: updatedMessages
      };
    });
  }, [conversationId, saveToCache]);

  // Limpiar cache
  const clearCache = useCallback(() => {
    cache.current.delete(conversationId);
    localStorage.removeItem(`messages_${conversationId}`);
    setState({
      messages: [],
      loading: false,
      error: null,
      hasMore: true,
      nextCursor: null
    });
  }, [conversationId]);

  // Buscar mensajes
  const searchMessages = useCallback(async (query: string) => {
    try {
      const response = await api.get('/history/search', {
        params: {
          q: query,
          conversationId,
          limit: 50
        }
      });

      return response.data.data.results;
    } catch (error: any) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, [conversationId]);

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    loadInitialMessages,
    loadMore,
    addMessage,
    updateMessageStatus,
    clearCache,
    searchMessages
  };
};
