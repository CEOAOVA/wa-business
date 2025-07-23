import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "../hooks/useChat";
import { useDebounce } from "../hooks/useDebounce";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { MESSAGES } from "../constants/messages";
import { WebSocketStatus } from "./WebSocketStatus";
import SearchBar from "./SearchBar";
import Logo from "./Logo";
import type { Chat } from "../types";

// Componente individual de chat en la lista
const ChatItem: React.FC<{ 
  chat: Chat; 
  isSelected: boolean; 
  onClick: () => void;
  getRelativeTime: (date: Date) => string;
  getLastMessagePreview: (chat: Chat) => string;
}> = ({ chat, isSelected, onClick, getRelativeTime, getLastMessagePreview }) => {
  // Generar iniciales del nombre del cliente
  const initials = chat.clientName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Color del avatar basado en el estado
  const avatarColor = chat.priority === 'high' 
    ? 'bg-red-500' 
    : chat.unreadCount > 0 
      ? 'bg-embler-yellow text-embler-dark' 
      : 'bg-gray-500';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-300 border-b border-white/5 group hover:bg-white/5 ${
        isSelected ? 'bg-gradient-primary/20 border-l-4 border-l-blue-500 shadow-glow' : ''
      }`}
      whileHover={{ x: 3, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <motion.div 
        className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold ${avatarColor} shadow-soft flex-shrink-0`}
        whileHover={{ scale: 1.05, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
      >
        {initials}
      </motion.div>
      
      {/* Información del chat */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-white truncate group-hover:text-gradient-primary transition-colors text-sm">
            {chat.clientName}
          </span>
          
          {/* Indicadores de estado */}
          {chat.status === 'open' && (
            <motion.span 
              className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {chat.priority === 'high' && (
            <motion.span 
              className="text-red-400 text-xs flex-shrink-0"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ●
            </motion.span>
          )}
          
          {/* Badge de notificaciones */}
          {chat.unreadCount > 0 && (
            <motion.span 
              className="ml-auto bg-gradient-primary text-white text-xs font-bold rounded-full px-1.5 py-0.5 shadow-glow flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </motion.span>
          )}
        </div>
        
        {/* Último mensaje */}
        <div className="text-gray-400 text-xs truncate mb-1">
          {getLastMessagePreview(chat)}
        </div>
        
        {/* Tags */}
        {chat.tags.length > 0 && (
          <div className="flex gap-1">
            {chat.tags.slice(0, 1).map(tag => (
              <motion.span 
                key={tag} 
                className="text-xs bg-gradient-yellow/20 text-embler-yellow px-1.5 py-0.5 rounded-full border border-embler-yellow/30"
                whileHover={{ scale: 1.05 }}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        )}
      </div>
      
      {/* Hora */}
      <div className="text-xs text-gray-500 ml-2 whitespace-nowrap flex-shrink-0">
        {getRelativeTime(chat.updatedAt)}
      </div>
    </motion.div>
  );
};

const Sidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  
  const { 
    chats, 
    currentChat, 
    changeChat, 
    performSearch, 
    getRelativeTime, 
    getLastMessagePreview,
    chatStats 
  } = useChat();
  
  const { unreadCount } = useNotifications();
  const { state: authState, logout } = useAuth();
  const { loadWhatsAppMessages, loadNewSchemaConversations } = useApp();

  // Filtrar chats según la búsqueda y filtros
  const filteredChats = useMemo(() => {
    let filtered = chats;
    
    // Aplicar filtros
    switch (activeFilter) {
      case 'unread':
        filtered = chats.filter(chat => chat.unreadCount > 0);
        break;
      case 'priority':
        filtered = chats.filter(chat => chat.priority === 'high');
        break;
      case 'recent':
        filtered = chats.filter(chat => {
          const lastMessageTime = new Date(chat.updatedAt).getTime();
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
          return lastMessageTime > oneDayAgo;
        });
        break;
      case 'all':
      default:
        filtered = chats;
        break;
    }
    
    // Aplicar búsqueda
    if (!debouncedSearchQuery.trim()) {
      // Ordenar por: chats con mensajes no leídos primero, luego por última actualización
      return filtered.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
    return performSearch(debouncedSearchQuery).filter(chat => 
      filtered.some(f => f.id === chat.id)
    );
  }, [chats, debouncedSearchQuery, performSearch, activeFilter]);

  const handleChatSelect = (chat: Chat) => {
    changeChat(chat);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Función para cargar conversaciones manualmente (DEBUG)
  const handleLoadMessages = async () => {
    setIsLoadingMessages(true);
    try {
      await loadWhatsAppMessages();
      await loadNewSchemaConversations();
      console.log('🔄 Conversaciones cargadas manualmente');
    } catch (error) {
      console.error('❌ Error cargando conversaciones:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  return (
    <aside className="w-80 min-w-[20rem] max-w-xs bg-glass-dark backdrop-blur-xl flex flex-col border-r border-white/10 h-full shadow-soft">
      {/* Header */}
      <motion.div 
        className="px-4 py-4 border-b border-white/10 flex items-center gap-2 sticky top-0 bg-glass-dark backdrop-blur-xl z-10 shadow-soft"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2">
          <Logo size="lg" />
          <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">{MESSAGES.UI.CHAT_LABEL}</span>
        </div>
        
        {/* Indicadores del header */}
        <div className="ml-auto flex items-center gap-2">
          {/* Contador de notificaciones */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span 
                className="bg-gradient-secondary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-glow"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                whileHover={{ scale: 1.2 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
          
          {/* Estado del usuario */}
          {authState.user && (
            <motion.div 
              className="flex items-center gap-1.5 bg-gradient-primary/20 px-2 py-1 rounded-full border border-blue-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-1.5 h-1.5 bg-embler-yellow rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-embler-yellow font-medium">{MESSAGES.SYSTEM.ONLINE}</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Barra de búsqueda moderna */}
      <div className="px-4 py-3 bg-embler-gray/50 backdrop-blur-sm sticky top-[65px] z-10 border-b border-embler-grayLight">
        <SearchBar
          placeholder={MESSAGES.SEARCH.PLACEHOLDER}
          onSearch={handleSearch}
          onClear={() => setSearchQuery('')}
          showFilters={true}
          filters={[
            { id: 'unread', label: 'No leídos', active: activeFilter === 'unread' },
            { id: 'priority', label: 'Prioritarios', active: activeFilter === 'priority' },
            { id: 'recent', label: 'Recientes', active: activeFilter === 'recent' },
            { id: 'all', label: 'Todos', active: activeFilter === 'all' }
          ]}
          onFilterChange={(filterId) => {
            setActiveFilter(filterId);
            console.log('Filter changed:', filterId);
          }}
        />
      </div>

      {/* Estadísticas rápidas */}
      <div className="px-4 py-2 border-b border-embler-grayLight bg-embler-gray/30">
        <div className="flex justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-embler-yellow rounded-full"></div>
            <span>{chatStats.totalChats} {MESSAGES.STATS.CHATS}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-embler-yellow rounded-full"></div>
            <span>{chatStats.totalUnread} {MESSAGES.STATS.UNREAD}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-embler-yellow rounded-full"></div>
            <span>{chatStats.activeChats} {MESSAGES.STATS.ACTIVE}</span>
          </div>
        </div>
      </div>

      {/* Estado de WebSocket */}
      <div className="px-4 py-2 border-b border-embler-grayLight bg-embler-gray/20">
        <WebSocketStatus />
        {/* Botón DEBUG: Cargar conversaciones */}
        <button
          onClick={handleLoadMessages}
          disabled={isLoadingMessages}
          className="mt-2 w-full px-3 py-1.5 bg-embler-yellow text-embler-dark text-xs font-medium rounded-lg hover:bg-embler-yellowLight disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Cargar conversaciones desde backend (DEBUG)"
        >
          {isLoadingMessages ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-3 h-3 border border-embler-dark border-t-transparent rounded-full animate-spin"></div>
              Cargando...
            </div>
          ) : (
            '🔄 Cargar Conversaciones'
          )}
        </button>
      </div>

      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-embler-yellow scrollbar-track-embler-gray px-1 py-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-center text-sm">
              {searchQuery ? MESSAGES.SEARCH.NO_RESULTS : MESSAGES.SEARCH.NO_CHATS}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-embler-yellow hover:underline text-xs"
              >
                {MESSAGES.SEARCH.CLEAR_SEARCH}
              </button>
            )}
          </div>
        ) : (
          filteredChats.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={currentChat?.id === chat.id}
              onClick={() => handleChatSelect(chat)}
              getRelativeTime={getRelativeTime}
              getLastMessagePreview={getLastMessagePreview}
            />
          ))
        )}
      </div>

      {/* Footer con información adicional */}
      <div className="px-4 py-3 border-t border-embler-grayLight bg-embler-gray">
        {/* Información del usuario */}
        {authState.user && (
          <div className="flex items-center gap-2 min-w-0 mb-2">
            <div className="w-7 h-7 bg-embler-yellow text-embler-dark rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {authState.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {authState.user.name}
              </div>
              <div className="text-gray-400 text-xs">
                {authState.user.role === 'admin' ? MESSAGES.UI.ADMIN_ROLE : MESSAGES.UI.AGENT_ROLE}
              </div>
            </div>
          </div>
        )}
        
        {/* Navegación */}
        <div className="space-y-2 mb-3">
          {/* Botones solo para administradores */}
          {authState.user?.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('/client-chat')}
                className="w-full bg-embler-gray hover:bg-embler-grayLight text-white py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Ir a Chat Cliente"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat Cliente
              </button>
              
              <button
                onClick={() => navigate('/whatsapp-test')}
                className="w-full bg-embler-yellow hover:bg-embler-yellowDark text-black py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                title="Ir a WhatsApp Test"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                </svg>
                {MESSAGES.UI.WHATSAPP_TEST}
              </button>
            </>
          )}
          
          <button
            onClick={() => {
              if (window.confirm(MESSAGES.UI.LOGOUT_CONFIRM)) {
                logout();
              }
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
            title="Cerrar sesión"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
        
        {/* Estadísticas */}
        <div className="text-xs text-gray-500 pt-2 border-t border-embler-grayLight">
          <div className="flex justify-between items-center">
            <span>{MESSAGES.STATS.TIME_LABEL}: {chatStats.avgResponseTime}</span>
            <span className="text-embler-yellow font-medium">{MESSAGES.STATS.VERSION}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 