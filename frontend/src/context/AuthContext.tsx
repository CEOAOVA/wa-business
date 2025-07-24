import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, User, LoginCredentials } from '../types';
import { authApiService } from '../services/auth-api';
import { cleanupInvalidAuth, clearAllAuthData, refreshTokenIfNeeded } from '../utils/auth-cleanup';

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
      checkAuthStatus: () => {
        const token = localStorage.getItem('authToken');
        const rememberAuth = localStorage.getItem('rememberAuth');
        const sessionData = sessionStorage.length;
        
        console.log('🔍 Estado de autenticación:');
        console.log('  • Token:', token ? '✅ Presente' : '❌ No encontrado');
        console.log('  • Remember Auth:', rememberAuth ? '✅ Activado' : '❌ No activado');
        console.log('  • Session Storage:', sessionData > 0 ? `⚠️ ${sessionData} elementos` : '✅ Vacío');
        
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const currentTime = Math.floor(Date.now() / 1000);
              const isExpired = payload.exp && payload.exp < currentTime;
              console.log('  • Token expirado:', isExpired ? '❌ Sí' : '✅ No');
            }
          } catch (error) {
            console.log('  • Error al decodificar token:', error);
          }
        }
        
        return { hasToken: !!token, hasRememberAuth: !!rememberAuth, sessionDataCount: sessionData };
      },
      clearAuthSession: () => {
        console.log('🗑️ Limpiando sesión...');
        clearAllAuthData();
        dispatch({ type: 'LOGOUT' });
        console.log('✅ Sesión limpiada');
      },
      forceLogout: () => {
        console.log('🚪 Forzando logout...');
        clearAllAuthData();
        dispatch({ type: 'LOGOUT' });
        window.location.href = '/login';
      },
      reloadPage: () => {
        console.log('🔄 Recargando página...');
        window.location.reload();
      },
      goToLogin: () => {
        console.log('🚀 Navegando al login...');
        window.location.href = '/login';
      },
      getAuthState: () => {
        console.log('📊 Estado del contexto:', state);
        return state;
      }
    };
    
    console.log('🔧 Debug de autenticación disponible. Usa: window.authDebug.functionName()');
    console.log('📋 Funciones disponibles:');
    console.log('  • window.authDebug.checkAuthStatus()');
    console.log('  • window.authDebug.clearAuthSession()');
    console.log('  • window.authDebug.forceLogout()');
    console.log('  • window.authDebug.reloadPage()');
    console.log('  • window.authDebug.goToLogin()');
    console.log('  • window.authDebug.getAuthState()');
  }, [state]);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApiService.login({
        email: credentials.email,
        password: credentials.password,
      });
      const user = authApiService.convertToUser(response.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      
      // Guardar token si es necesario
      if (credentials.rememberMe) {
        localStorage.setItem('rememberAuth', 'true');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApiService.logout();
    } catch (error) {
      console.error('Error durante logout:', error);
    } finally {
      // Limpiar todos los datos de autenticación
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
      // Limpiar datos de autenticación inválidos antes de verificar
      cleanupInvalidAuth();
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Limpiar estado si no hay token
        dispatch({ type: 'LOGOUT' });
        return;
      }

      // Intentar refrescar el token si es necesario
      const tokenRefreshed = await refreshTokenIfNeeded();
      if (!tokenRefreshed) {
        dispatch({ type: 'LOGOUT' });
        return;
      }

      dispatch({ type: 'AUTH_START' });
      
      try {
        const profile = await authApiService.getProfile();
        const user = authApiService.convertToUser(profile);
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } catch (profileError) {
        console.warn('Error obteniendo perfil, intentando verificar estado de autenticación...');
        
        // Intentar verificar estado de autenticación de forma más simple
        const statusResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/auth/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.data?.isAuthenticated && statusData.data?.user) {
            const user = authApiService.convertToUser(statusData.data.user);
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
            return;
          }
        }
        
        // Si todo falla, limpiar sesión
        throw profileError;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
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