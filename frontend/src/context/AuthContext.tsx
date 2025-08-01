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
      console.log('🔐 [AuthContext] Iniciando login...');
      dispatch({ type: 'AUTH_START' });
      
      const response = await authApiService.login({
        email: credentials.email,
        password: credentials.password,
      });
      
      console.log('✅ [AuthContext] Login exitoso, guardando token...');
      console.log('✅ [AuthContext] Respuesta completa:', response);
      
      // Guardar token inmediatamente después del login exitoso
      if (response.session?.access_token) {
        localStorage.setItem('authToken', response.session.access_token);
        console.log('✅ [AuthContext] Token guardado:', response.session.access_token.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ [AuthContext] No se recibió token en la respuesta');
      }
      
      // El response.user ya es del tipo correcto, solo necesitamos convertirlo al formato del frontend
      console.log('✅ [AuthContext] Convirtiendo usuario:', response.user);
      const user = authApiService.convertToUser(response.user);
      console.log('✅ [AuthContext] Usuario convertido:', user);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      
      // Guardar preferencia de recordar sesión
      if (credentials.rememberMe) {
        localStorage.setItem('rememberAuth', 'true');
      }
      
      console.log('✅ [AuthContext] Login completado exitosamente');
    } catch (error) {
      console.error('❌ [AuthContext] Error en login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 [AuthContext] Iniciando logout...');
      
      // Solo intentar logout en el servidor si hay token
      const token = localStorage.getItem('authToken');
      if (token) {
        await authApiService.logout();
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error durante logout:', error);
    } finally {
      // Limpiar todos los datos de autenticación
      clearAllAuthData();
      dispatch({ type: 'LOGOUT' });
      console.log('✅ [AuthContext] Logout completado');
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
      console.log('🔐 [AuthContext] Verificando autenticación...');
      
      // Limpiar datos de autenticación inválidos antes de verificar
      cleanupInvalidAuth();
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('🔐 [AuthContext] No hay token, usuario no autenticado');
        dispatch({ type: 'LOGOUT' });
        return;
      }

      console.log('🔐 [AuthContext] Token encontrado, verificando validez...');

      // Intentar refrescar el token si es necesario
      const tokenRefreshed = await refreshTokenIfNeeded();
      if (!tokenRefreshed) {
        console.log('🔐 [AuthContext] Token no válido, limpiando sesión');
        dispatch({ type: 'LOGOUT' });
        return;
      }

      dispatch({ type: 'AUTH_START' });
      
      try {
        console.log('🔐 [AuthContext] Obteniendo perfil de usuario...');
        const profile = await authApiService.getProfile();
        // El perfil ya es un User, no necesitamos convertirlo
        dispatch({ type: 'AUTH_SUCCESS', payload: profile });
        console.log('✅ [AuthContext] Usuario autenticado:', profile.name);
      } catch (profileError) {
        console.warn('⚠️ [AuthContext] Error obteniendo perfil, intentando verificar estado...');
        
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
              console.log('✅ [AuthContext] Usuario autenticado via status check');
              return;
            }
          }
        } catch (statusError) {
          console.warn('⚠️ [AuthContext] Error en status check:', statusError);
        }
        
        // Si todo falla, limpiar sesión
        throw profileError;
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error verificando autenticación:', error);
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