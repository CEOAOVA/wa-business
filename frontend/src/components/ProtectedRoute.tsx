import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

// Componente para proteger rutas que requieren autenticación
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { state } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (state.isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-embler-dark flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-embler-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Verificando autenticación...</p>
          </div>
        </div>
      )
    );
  }

  // Redirigir al login si no está autenticado
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Renderizar los children si está autenticado
  return <>{children}</>;
}; 