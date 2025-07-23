import { useEffect, useState } from 'react';
import { useWebSocketImproved } from '../hooks/useWebSocketImproved';

export default function WebSocketTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const { isConnected, connectionError, connect, disconnect } = useWebSocketImproved();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog(`WebSocket connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
  }, [isConnected]);

  useEffect(() => {
    if (connectionError) {
      addLog(`Connection error: ${connectionError}`);
    }
  }, [connectionError]);

  const handleConnect = () => {
    addLog('Manual connect attempt...');
    connect();
  };

  const handleDisconnect = () => {
    addLog('Manual disconnect...');
    disconnect();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Connection Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Connect
          </button>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
        
        <div className="space-y-2">
          <p><strong>Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          {connectionError && (
            <p><strong>Error:</strong> <span className="text-red-600">{connectionError}</span></p>
          )}
        </div>
      </div>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        <h3 className="text-white mb-2">Connection Logs:</h3>
        {logs.map((log, index) => (
          <div key={index} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
} 