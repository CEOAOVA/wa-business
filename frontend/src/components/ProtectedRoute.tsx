import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'agent';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo 
}) => {
  const { state } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-embler-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-embler-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole && state.user?.role !== requiredRole) {
    // Redirigir según el rol del usuario
    const userRole = state.user?.role;
    let targetRoute = redirectTo;

    if (!targetRoute) {
      switch (userRole) {
        case 'admin':
          targetRoute = '/admin/dashboard';
          break;
        case 'agent':
          targetRoute = '/chats';
          break;
        default:
          targetRoute = '/chats';
      }
    }

    return <Navigate to={targetRoute} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 