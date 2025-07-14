import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { useDebounce } from "../hooks/useDebounce";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import { MESSAGES } from "../constants/messages";
import { WebSocketStatus } from "./WebSocketStatus";
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
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-embler-accent/50 group hover:bg-embler-accent/50 ${
        isSelected ? 'bg-embler-accent border-l-4 border-l-embler-yellow' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`w-12 h-12 flex items-center justify-center rounded-full text-lg font-bold ${avatarColor} transition-transform group-hover:scale-105`}>
        {initials}
      </div>
      
      {/* Información del chat */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-white truncate group-hover:text-embler-yellow transition-colors">
            {chat.clientName}
          </span>
          
          {/* Indicadores de estado */}
          {chat.status === 'open' && (
            <span className="w-2 h-2 bg-embler-yellow rounded-full animate-pulse"></span>
          )}
          {chat.priority === 'high' && (
            <span className="text-red-400 text-xs">●</span>
          )}
          
          {/* Badge de notificaciones */}
          {chat.unreadCount > 0 && (
            <span className="ml-auto bg-embler-yellow text-embler-dark text-xs font-bold rounded-full px-2 py-0.5 shadow-lg animate-pulse">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
        
        {/* Último mensaje */}
        <div className="text-gray-400 text-sm truncate">
          {getLastMessagePreview(chat)}
        </div>
        
        {/* Tags */}
        {chat.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {chat.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs bg-embler-accent text-embler-yellow px-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Hora */}
      <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
        {getRelativeTime(chat.updatedAt)}
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filtrar chats según la búsqueda
  const filteredChats = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      // Ordenar por: chats con mensajes no leídos primero, luego por última actualización
      return [...chats].sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
    return performSearch(debouncedSearchQuery);
  }, [chats, debouncedSearchQuery, performSearch]);

  const handleChatSelect = (chat: Chat) => {
    changeChat(chat);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <aside className="w-80 min-w-[20rem] max-w-xs bg-embler-gray flex flex-col border-r border-embler-accent h-full shadow-xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-embler-accent flex items-center gap-2 sticky top-0 bg-embler-gray z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-embler-yellow tracking-wide">{MESSAGES.UI.BRAND_NAME}</span>
          <span className="text-xs text-gray-400">{MESSAGES.UI.CHAT_LABEL}</span>
        </div>
        
        {/* Indicadores del header */}
        <div className="ml-auto flex items-center gap-2">
          {/* Contador de notificaciones */}
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          
          {/* Estado del usuario */}
          {authState.user && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-embler-yellow rounded-full animate-pulse"></div>
              <span className="text-xs text-embler-yellow">{MESSAGES.SYSTEM.ONLINE}</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-4 py-3 bg-embler-gray sticky top-[73px] z-10 border-b border-embler-accent/50">
        <div className="relative">
          <input 
            type="text" 
            placeholder={MESSAGES.SEARCH.PLACEHOLDER} 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 pl-10 rounded-lg bg-embler-accent text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-embler-yellow transition-all duration-200 text-sm"
          />
          {/* Icono de búsqueda */}
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {/* Limpiar búsqueda */}
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="px-4 py-2 border-b border-embler-accent/50">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{chatStats.totalChats} {MESSAGES.STATS.CHATS}</span>
          <span>{chatStats.totalUnread} {MESSAGES.STATS.UNREAD}</span>
          <span>{chatStats.activeChats} {MESSAGES.STATS.ACTIVE}</span>
        </div>
      </div>

      {/* Estado de WebSocket */}
      <div className="px-4 py-2 border-b border-embler-accent/50">
        <WebSocketStatus />
      </div>

      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-embler-accent scrollbar-track-embler-gray">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-center">
              {searchQuery ? MESSAGES.SEARCH.NO_RESULTS : MESSAGES.SEARCH.NO_CHATS}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-embler-yellow hover:underline text-sm"
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
      <div className="px-4 py-3 border-t border-embler-accent bg-embler-gray">
        {/* Información del usuario y botón logout */}
        {authState.user && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-embler-yellow text-embler-dark rounded-full flex items-center justify-center text-sm font-bold">
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
            
            <button
              onClick={() => {
                if (window.confirm(MESSAGES.UI.LOGOUT_CONFIRM)) {
                  logout();
                }
              }}
              className="p-2 rounded-lg hover:bg-embler-accent transition-colors text-gray-400 hover:text-white group"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4 group-hover:text-embler-yellow transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Navegación */}
        <div className="space-y-2 mb-2">
          <button
            onClick={() => navigate('/whatsapp-test')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
            </svg>
            {MESSAGES.UI.WHATSAPP_TEST}
          </button>
        </div>
        
        {/* Estadísticas */}
        <div className="text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>{MESSAGES.STATS.TIME_LABEL}: {chatStats.avgResponseTime}</span>
            <span className="text-embler-yellow">{MESSAGES.STATS.VERSION}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 