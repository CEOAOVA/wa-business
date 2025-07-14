import React from 'react';
import { useApp } from '../context/AppContext';

export const WebSocketStatus: React.FC = () => {
  const { isWebSocketConnected, webSocketError } = useApp();

  if (webSocketError) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-red-400 text-sm font-medium">
          WebSocket Error: {webSocketError}
        </span>
      </div>
    );
  }

  if (!isWebSocketConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-yellow-400 text-sm font-medium">
          Conectando...
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="text-green-400 text-sm font-medium">
        Conectado en tiempo real
      </span>
    </div>
  );
}; 