// ✅ COMPONENTE CHATS REFACTORIZADO - IMPLEMENTADO
import React from 'react';
import { useChatsPage } from '../hooks/useChatsPage';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import { LoadingPage } from '../components/LoadingPage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';

const Chats: React.FC = () => {
  const {
    isLoading,
    error,
    chats,
    connectionStatus,
    stats,
    handleRefresh
  } = useChatsPage();
  
  // Loading state
  if (isLoading) {
    return <LoadingPage message="Cargando conversaciones..." />;
  }
  
  // Error state
  if (error && !chats.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-embler-dark">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl mb-2">Error al cargar</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-2 bg-embler-primary text-white rounded-lg hover:bg-embler-secondary transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex bg-embler-dark overflow-hidden">
        {/* Sidebar with chat list - usando componente existente */}
        <Sidebar />
        
        {/* Main chat panel - usando componente existente */}
        <ChatPanel />
        
        {/* Development Stats Panel */}
        {import.meta.env.DEV && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm"
              style={{ zIndex: 9999 }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} />
                  <span>Estado: {connectionStatus}</span>
                </div>
                <div>📊 Chats: {stats.totalChats}</div>
                <div>💬 Mensajes: {stats.totalMessages}</div>
                <div>🔴 No leídos: {stats.unreadMessages}</div>
                <div>📡 Latencia: {stats.connectionLatency}ms</div>
                {stats.lastUpdate && (
                  <div>🕐 Actualizado: {stats.lastUpdate.toLocaleTimeString()}</div>
                )}
                {error && (
                  <div className="text-red-400 mt-2">⚠️ {error}</div>
                )}
                <button
                  onClick={handleRefresh}
                  className="mt-2 px-2 py-1 bg-embler-primary text-white rounded text-xs hover:bg-embler-secondary transition-colors w-full"
                >
                  🔄 Refrescar
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Chats;