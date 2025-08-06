/**
 * Hook personalizado para manejar chat en tiempo real con Supabase Broadcasts
 * Combina carga de mensajes históricos, envío de mensajes y actualizaciones en tiempo real
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { realtimeBroadcastService, type BroadcastMessage } from '../services/realtime-broadcast.service';
import { whatsappApi } from '../services/whatsapp-api';
import logger from '../services/logger';

interface Message {
  id: number | string;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'bot';
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
  client_id?: string;
  status?: string;
  metadata?: any;
}

interface UseRealtimeChatOptions {
  onNewMessage?: (message: Message) => void;
  onMessageStatusUpdate?: (message: Message) => void;
  onPresenceUpdate?: (presences: any[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  autoMarkAsRead?: boolean;
}

export function useRealtimeChat(
  conversationId: string,
  options: UseRealtimeChatOptions = {}
) {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Cargar mensajes históricos con paginación infinita
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = undefined }) => {
      logger.info('Cargando mensajes históricos', { conversationId, cursor: pageParam }, 'useRealtimeChat');
      
      const response = await whatsappApi.getConversationMessages(
        conversationId,
        50,
        pageParam
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Error cargando mensajes');
      }
      
      return response.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: any) => {
      return lastPage?.nextCursor || undefined;
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos (antes cacheTime)
  });

  // Mutation para enviar mensajes con optimistic update
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Enviando mensaje', { conversationId, messageLength: message.length, clientId }, 'useRealtimeChat');
      
      const response = await whatsappApi.sendMessage(conversationId, message, clientId);
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Error enviando mensaje');
      }
      
      return response;
    },
    onMutate: async (message: string) => {
      setIsSending(true);
      
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot del cache actual
      const previousMessages = queryClient.getQueryData(queryKey);
      
      // Crear mensaje optimista
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        content: message,
        sender_type: 'agent',
        created_at: new Date().toISOString(),
        status: 'sending',
        conversation_id: conversationId,
        message_type: 'text',
        is_read: true,
        client_id: `client_${Date.now()}`
      };
      
      // Optimistic update
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        
        logger.debug('Aplicando optimistic update', { messageId: optimisticMessage.id }, 'useRealtimeChat');
        
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                messages: [optimisticMessage, ...(page.messages || [])]
              };
            }
            return page;
          })
        };
      });
      
      return { previousMessages };
    },
    onSuccess: (data: any, message: string) => {
      logger.info('Mensaje enviado exitosamente', { messageId: data?.messageId }, 'useRealtimeChat');
      
      // Notificar callback si existe
      if (options.onNewMessage) {
        options.onNewMessage({
          id: data?.messageId || `msg_${Date.now()}`,
          content: message,
          sender_type: 'agent',
          created_at: new Date().toISOString(),
          status: 'sent',
          conversation_id: conversationId,
          message_type: 'text',
          is_read: true
        });
      }
    },
    onError: (err: any, _message: string, context: any) => {
      logger.error('Error enviando mensaje', { error: err.message }, 'useRealtimeChat');
      
      // Revertir en caso de error
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
      
      // Mostrar error al usuario
      console.error('Error enviando mensaje:', err);
    },
    onSettled: () => {
      setIsSending(false);
      
      // Invalidar para sincronizar con el servidor
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Función para agregar mensaje al cache
  const addMessageToCache = useCallback((message: BroadcastMessage | Message) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      
      // Verificar si el mensaje ya existe para evitar duplicados
      const exists = old.pages.some((page: any) =>
        page.messages?.some((m: any) => 
          m.id === message.id || 
          (m.client_id && m.client_id === message.client_id)
        )
      );
      
      if (exists) {
        logger.debug('Mensaje ya existe en cache, ignorando', { messageId: message.id }, 'useRealtimeChat');
        return old;
      }
      
      logger.debug('Agregando mensaje al cache', { messageId: message.id }, 'useRealtimeChat');
      
      return {
        ...old,
        pages: old.pages.map((page: any, index: number) => {
          if (index === 0) {
            return {
              ...page,
              messages: [message, ...(page.messages || [])]
            };
          }
          return page;
        })
      };
    });
  }, [queryClient, queryKey]);

  // Función para actualizar estado de mensaje
  const updateMessageStatus = useCallback((messageUpdate: BroadcastMessage | Message) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      
      logger.debug('Actualizando estado de mensaje', { 
        messageId: messageUpdate.id, 
        status: messageUpdate.status 
      }, 'useRealtimeChat');
      
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages?.map((m: any) =>
            m.id === messageUpdate.id || m.client_id === messageUpdate.client_id
              ? { ...m, ...messageUpdate }
              : m
          )
        }))
      };
    });
  }, [queryClient, queryKey]);

  // Función para marcar mensajes como leídos
  const markMessagesAsRead = useCallback(async () => {
    if (!options.autoMarkAsRead) return;
    
    const messages = data?.pages.flatMap((page: any) => page.messages || []) || [];
    const unreadMessages = messages.filter((m: any) => !m.is_read && m.sender_type === 'user');
    
    if (unreadMessages.length > 0) {
      logger.info(`Marcando ${unreadMessages.length} mensajes como leídos`, {}, 'useRealtimeChat');
      
      // Aquí podrías hacer una llamada a la API para marcar como leídos
      // Por ahora solo actualizamos el cache local
      unreadMessages.forEach((msg: any) => {
        updateMessageStatus({ ...msg, is_read: true });
      });
    }
  }, [data, options.autoMarkAsRead, updateMessageStatus]);

  // Efecto para suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    if (!conversationId || !realtimeBroadcastService.isRealtimeEnabled()) {
      logger.warn('Realtime deshabilitado o sin conversationId', { conversationId }, 'useRealtimeChat');
      return;
    }
    
    logger.info('Suscribiendo a conversación', { conversationId }, 'useRealtimeChat');
    
    const subscription = realtimeBroadcastService.subscribeToConversation(
      conversationId,
      {
        onNewMessage: (message: BroadcastMessage) => {
          logger.info('Nuevo mensaje recibido vía broadcast', { messageId: message.id }, 'useRealtimeChat');
          
          // Agregar al cache si no es nuestro mensaje
          const currentUserId = localStorage.getItem('userId');
          if (message.sender_type === 'user' || 
              (message.metadata?.sender_id && message.metadata.sender_id !== currentUserId)) {
            addMessageToCache(message);
            
            // Notificar callback
            if (options.onNewMessage) {
              options.onNewMessage(message);
            }
          }
        },
        onMessageStatusUpdate: (message: BroadcastMessage) => {
          logger.info('Estado de mensaje actualizado', { 
            messageId: message.id, 
            status: message.status 
          }, 'useRealtimeChat');
          
          updateMessageStatus(message);
          
          // Notificar callback
          if (options.onMessageStatusUpdate) {
            options.onMessageStatusUpdate(message);
          }
        },
        onMessageRead: (message: BroadcastMessage) => {
          logger.info('Mensaje marcado como leído', { messageId: message.id }, 'useRealtimeChat');
          updateMessageStatus({ ...message, is_read: true });
        },
        onConversationUpdate: (conversation: any) => {
          logger.info('Conversación actualizada', { conversationId: conversation.id }, 'useRealtimeChat');
          
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
        },
        onPresenceSync: (presences: any[]) => {
          logger.info('Sincronización de presencia', { 
            userCount: presences.length 
          }, 'useRealtimeChat');
          
          setActiveUsers(presences);
          
          if (options.onPresenceUpdate) {
            options.onPresenceUpdate(presences);
          }
        },
        onPresenceJoin: (presence: any) => {
          logger.info('Usuario se unió', { userId: presence.user_id }, 'useRealtimeChat');
          
          setActiveUsers(prev => [...prev, presence]);
        },
        onPresenceLeave: (presence: any) => {
          logger.info('Usuario salió', { userId: presence.user_id }, 'useRealtimeChat');
          
          setActiveUsers(prev => prev.filter(p => p.user_id !== presence.user_id));
        },
        onConnect: () => {
          logger.info('Conectado a realtime', {}, 'useRealtimeChat');
          setIsConnected(true);
          
          if (options.onConnectionChange) {
            options.onConnectionChange(true);
          }
        },
        onDisconnect: () => {
          logger.warn('Desconectado de realtime', {}, 'useRealtimeChat');
          setIsConnected(false);
          
          if (options.onConnectionChange) {
            options.onConnectionChange(false);
          }
        },
        onError: (error: any) => {
          logger.error('Error en realtime', { error }, 'useRealtimeChat');
          setIsConnected(false);
        }
      }
    );
    
    subscriptionRef.current = subscription;
    
    // Cleanup al desmontar o cambiar conversación
    return () => {
      logger.info('Desuscribiendo de conversación', { conversationId }, 'useRealtimeChat');
      realtimeBroadcastService.unsubscribeFromConversation(conversationId);
      subscriptionRef.current = null;
      setIsConnected(false);
    };
  }, [
    conversationId, 
    addMessageToCache, 
    updateMessageStatus, 
    queryClient, 
    options
  ]);

  // Auto-marcar como leídos cuando se cargan mensajes
  useEffect(() => {
    markMessagesAsRead();
  }, [data, markMessagesAsRead]);

  // Función para recargar mensajes
  const reload = useCallback(() => {
    logger.info('Recargando mensajes', { conversationId }, 'useRealtimeChat');
    refetch();
  }, [refetch, conversationId]);

  // Función para enviar mensaje
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) {
      logger.warn('Intento de enviar mensaje vacío', {}, 'useRealtimeChat');
      return;
    }
    
    sendMessageMutation.mutate(message);
  }, [sendMessageMutation]);

  return {
    // Datos
    messages: data?.pages.flatMap((page: any) => page.messages || []) || [],
    activeUsers,
    
    // Estados
    isLoading,
    isSending: isSending || sendMessageMutation.isPending,
    isConnected,
    error,
    
    // Paginación
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    
    // Acciones
    sendMessage,
    reload,
    markMessagesAsRead,
    
    // Utilidades
    stats: {
      totalMessages: data?.pages.reduce((acc: number, page: any) => acc + (page.messages?.length || 0), 0) || 0,
      activeUsers: activeUsers.length,
      isConnected
    }
  };
}