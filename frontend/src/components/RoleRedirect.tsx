import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRedirectProps {
  children?: React.ReactNode;
}

const RoleRedirect: React.FC<RoleRedirectProps> = ({ children }) => {
  const { state } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 [RoleRedirect] Estado actual:', {
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
      user: state.user
    });
    
    // Solo redirigir si no está cargando y está autenticado
    if (!state.isLoading && state.isAuthenticated && state.user) {
      const userRole = state.user.role;
      console.log('✅ [RoleRedirect] Usuario autenticado, redirigiendo según rol:', userRole);
      
      // Redirigir según el rol del usuario
      switch (userRole) {
        case 'admin':
          console.log('✅ [RoleRedirect] Redirigiendo a dashboard de admin');
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'agent':
          console.log('✅ [RoleRedirect] Redirigiendo a chats');
          navigate('/chats', { replace: true });
          break;
        default:
          console.log('✅ [RoleRedirect] Redirigiendo a chats (rol por defecto)');
          navigate('/chats', { replace: true });
      }
    }
  }, [state.isLoading, state.isAuthenticated, state.user, navigate]);

  // Mostrar loading mientras se verifica la autenticación
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-embler-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-embler-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras se redirige
  if (state.isAuthenticated && state.user) {
    return (
      <div className="min-h-screen bg-embler-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-embler-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleRedirect; 