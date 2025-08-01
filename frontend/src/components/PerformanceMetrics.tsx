import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import logger from '../services/logger';

interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  memory: any;
  metrics: {
    memory_usage: number;
    cpu_usage: number;
    network_connections: number;
    websocket_connections: number;
  };
  timestamp: string;
}

interface PerformanceMetricsProps {
  refreshInterval?: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  refreshInterval = 30000 
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setMetrics(data.data);
      logger.debug('Métricas obtenidas', data.data, 'PerformanceMetrics');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error obteniendo métricas', { error: errorMessage }, 'PerformanceMetrics');
      setError(errorMessage);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/monitoring/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setSystemStatus(data.data);
      logger.debug('Estado del sistema obtenido', data.data, 'PerformanceMetrics');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error obteniendo estado del sistema', { error: errorMessage }, 'PerformanceMetrics');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchSystemStatus()]);
      setLoading(false);
    };

    fetchData();

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'MB') return `${(value / 1024 / 1024).toFixed(1)} MB`;
    if (unit === 'ms') return `${value.toFixed(0)} ms`;
    return `${value.toFixed(1)} ${unit}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error cargando métricas</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado del Sistema */}
      {systemStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Estado del Sistema</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus.status)}`}>
              {systemStatus.status.toUpperCase()}
            </span>
          </div>
          
          {systemStatus.issues.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Problemas Detectados:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {systemStatus.issues.map((issue, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="h-4 w-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(systemStatus.metrics.memory_usage, '%')}
              </div>
              <div className="text-sm text-gray-500">Memoria</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(systemStatus.metrics.cpu_usage, '%')}
              </div>
              <div className="text-sm text-gray-500">CPU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {systemStatus.metrics.network_connections}
              </div>
              <div className="text-sm text-gray-500">Conexiones Red</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {systemStatus.metrics.websocket_connections}
              </div>
              <div className="text-sm text-gray-500">WebSocket</div>
            </div>
          </div>
        </div>
      )}

      {/* Métricas de Rendimiento */}
      {metrics && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Rendimiento</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Memoria */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Uso de Memoria</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { name: 'Actual', value: metrics.performance?.memory_usage?.latest || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Memoria']} />
                  <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de CPU */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Uso de CPU</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { name: 'Actual', value: metrics.performance?.cpu_usage?.latest || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'CPU']} />
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Métricas Detalladas */}
          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">Métricas Detalladas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.performance || {}).map(([key, metric]: [string, any]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatValue(metric.latest || 0, metric.unit || '')}
                  </div>
                  <div className="text-xs text-gray-500">
                    Promedio: {formatValue(metric.average || 0, metric.unit || '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Información de Memoria */}
      {systemStatus?.memory && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Memoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatValue(systemStatus.memory.used || 0, 'MB')}
              </div>
              <div className="text-sm text-gray-500">Memoria Usada</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatValue(systemStatus.memory.total || 0, 'MB')}
              </div>
              <div className="text-sm text-gray-500">Memoria Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {systemStatus.memory.percentage?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-500">Porcentaje</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 