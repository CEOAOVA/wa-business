import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, User, LoginCredentials } from '../types';
import { authApiService } from '../services/auth-api';

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
      localStorage.removeItem('rememberAuth');
      localStorage.removeItem('authToken');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error durante logout:', error);
      // Logout forzado aunque falle la API
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
      const token = localStorage.getItem('authToken');
      if (!token) return;

      dispatch({ type: 'AUTH_START' });
      const profile = await authApiService.getProfile();
      const user = authApiService.convertToUser(profile);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      localStorage.removeItem('authToken');
      dispatch({ type: 'AUTH_FAILURE', payload: 'Sesión expirada' });
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