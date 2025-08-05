import { useAppOptimized } from '../context/AppContextOptimized';

export const WebSocketStatus = () => {
  const { isWebSocketConnected, webSocketError } = useAppOptimized();

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>{isWebSocketConnected ? 'Conectado' : 'Desconectado'}</span>
      {webSocketError && <span className="text-red-500">({webSocketError})</span>}
    </div>
  );
}; 