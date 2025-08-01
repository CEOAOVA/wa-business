import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, User, LoginCredentials } from '../types';
import { authApiService } from '../services/auth-api';
import { cleanupInvalidAuth, clearAllAuthData, refreshTokenIfNeeded, getRefreshStats } from '../utils/auth-cleanup';
import logger from '../services/logger';

// Estado inicial
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Acciones del reducer
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// Contexto
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  getRefreshStats: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar autenticación al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  // Hacer funciones de debug disponibles globalmente
  useEffect(() => {
    // @ts-ignore - Hacer funciones disponibles globalmente para debug
    window.authDebug = {
      checkAuth,
      getRefreshStats,
      getAuthState: () => state,
    };
  }, [state]);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      logger.debug('Iniciando login', { email: credentials.email }, 'AuthContext');

      const response = await authApiService.login(credentials);
      
      // El response ya contiene user y session directamente
      if (response.user && response.session) {
        // Guardar token en localStorage
        if (response.session.access_token) {
          localStorage.setItem('authToken', response.session.access_token);
          localStorage.setItem('rememberAuth', 'true');
        }
        
        // Convertir el usuario al formato esperado
        const user = authApiService.convertToUser(response.user);
        
        logger.info('Login exitoso', { userId: user.id, email: user.email }, 'AuthContext');
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido en login';
      logger.error('Error en login', { error: errorMessage }, 'AuthContext');
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  const logout = async () => {
    try {
      logger.debug('Iniciando logout', {}, 'AuthContext');
      
      // Llamar al endpoint de logout del backend
      await authApiService.logout();
      
      // Limpiar datos locales
      clearAllAuthData();
      
      logger.info('Logout exitoso', {}, 'AuthContext');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      logger.error('Error en logout', { error: error instanceof Error ? error.message : String(error) }, 'AuthContext');
      // Aún limpiar datos locales aunque falle el logout del backend
      clearAllAuthData();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const checkAuth = async () => {
    try {
      logger.debug('Verificando autenticación', {}, 'AuthContext');
      
      // Limpiar datos de autenticación inválidos antes de verificar
      logger.debug('Antes de cleanupInvalidAuth', { 
        hasToken: !!localStorage.getItem('authToken') 
      }, 'AuthContext');
      
      cleanupInvalidAuth();
      
      logger.debug('Después de cleanupInvalidAuth', { 
        hasToken: !!localStorage.getItem('authToken') 
      }, 'AuthContext');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        logger.debug('No hay token, usuario no autenticado', {}, 'AuthContext');
        dispatch({ type: 'LOGOUT' });
        return;
      }

      logger.debug('Token encontrado, verificando validez', {}, 'AuthContext');

      // Intentar refrescar el token si es necesario
      const tokenRefreshed = await refreshTokenIfNeeded();
      if (!tokenRefreshed) {
        logger.warn('Token no válido, limpiando sesión', {}, 'AuthContext');
        dispatch({ type: 'LOGOUT' });
        return;
      }

      dispatch({ type: 'AUTH_START' });
      
      try {
        logger.debug('Obteniendo perfil de usuario', {}, 'AuthContext');
        const profile = await authApiService.getProfile();
        // El perfil ya es un User, no necesitamos convertirlo
        dispatch({ type: 'AUTH_SUCCESS', payload: profile });
        logger.info('Usuario autenticado', { name: profile.name }, 'AuthContext');
      } catch (profileError) {
        logger.warn('Error obteniendo perfil, intentando verificar estado', { 
          error: profileError instanceof Error ? profileError.message : String(profileError) 
        }, 'AuthContext');
        
        // Intentar verificar estado de autenticación de forma más simple
        try {
          const statusResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/auth/status`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.data?.isAuthenticated && statusData.data?.user) {
              // El usuario del status ya es un User, no necesitamos convertirlo
              dispatch({ type: 'AUTH_SUCCESS', payload: statusData.data.user });
              logger.info('Usuario autenticado via status check', {}, 'AuthContext');
              return;
            }
          }
        } catch (statusError) {
          logger.warn('Error en status check', { 
            error: statusError instanceof Error ? statusError.message : String(statusError) 
          }, 'AuthContext');
        }
        
        // Si todo falla, limpiar sesión
        throw profileError;
      }
    } catch (error) {
      logger.error('Error verificando autenticación', { 
        error: error instanceof Error ? error.message : String(error) 
      }, 'AuthContext');
      // Limpiar token inválido y estado
      clearAllAuthData();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const value: AuthContextType = {
    state,
    login,
    logout,
    updateUser,
    clearError,
    checkAuth,
    getRefreshStats,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 