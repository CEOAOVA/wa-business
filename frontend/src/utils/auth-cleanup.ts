/**
 * Utilidades para limpiar la autenticación
 */

// NUEVO: Configuración de refresh token inteligente
const REFRESH_CONFIG = {
  COOLDOWN_MS: 30000, // 30 segundos de cooldown entre refreshes
  EXPIRY_MARGIN_MS: 300000, // 5 minutos antes de expirar
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000, // 2 segundos entre reintentos
};

// NUEVO: Estado del refresh token
let refreshState = {
  lastRefresh: 0,
  isRefreshing: false,
  retryCount: 0,
  lastError: null as string | null,
};

export const clearAllAuthData = (): void => {
  // Limpiar todos los datos de autenticación del localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('rememberAuth');
  
  // Limpiar cualquier otro dato relacionado con la sesión
  sessionStorage.clear();
  
  // Limpiar cookies relacionadas con la autenticación
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // NUEVO: Resetear estado de refresh
  refreshState = {
    lastRefresh: 0,
    isRefreshing: false,
    retryCount: 0,
    lastError: null,
  };
  
  console.log('✅ Datos de autenticación limpiados completamente');
};

export const forceLogout = (): void => {
  clearAllAuthData();
  
  // Redirigir al login
  window.location.href = '/login';
};

// Función para verificar si hay datos de autenticación
export const hasAuthData = (): boolean => {
  const token = localStorage.getItem('authToken');
  const rememberAuth = localStorage.getItem('rememberAuth');
  
  return !!(token || rememberAuth);
};

// Función para limpiar datos de autenticación inválidos (versión mejorada)
export const cleanupInvalidAuth = (): void => {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    try {
      // Verificar si el token tiene un formato válido (JWT básico)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Token con formato inválido detectado, limpiando...');
        clearAllAuthData();
        return;
      }
      
      // Verificar si el token no está expirado (decodificar payload)
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Agregar margen de tolerancia de 5 minutos para evitar problemas de sincronización
      const tolerance = 5 * 60; // 5 minutos en segundos
      
      if (payload.exp && payload.exp < (currentTime - tolerance)) {
        console.warn('Token expirado detectado, limpiando...');
        clearAllAuthData();
        return;
      }
      
    } catch (error) {
      console.warn('Error al verificar token, limpiando datos de autenticación...');
      clearAllAuthData();
    }
  }
};

// Función para verificar si el token está próximo a expirar
export const isTokenExpiringSoon = (): boolean => {
  const token = localStorage.getItem('authToken');
  
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Considerar que expira pronto si queda menos de 1 hora
    const oneHour = 60 * 60;
    
    return payload.exp && payload.exp < (currentTime + oneHour);
  } catch (error) {
    return true;
  }
};

// NUEVO: Función para verificar si el token necesita refresh (con cooldown)
export const needsTokenRefresh = (): boolean => {
  const token = localStorage.getItem('authToken');
  
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    // Verificar cooldown
    const timeSinceLastRefresh = Date.now() - refreshState.lastRefresh;
    if (timeSinceLastRefresh < REFRESH_CONFIG.COOLDOWN_MS) {
      return false;
    }
    
    // Refresh si expira en menos de 5 minutos
    return timeUntilExpiry < (REFRESH_CONFIG.EXPIRY_MARGIN_MS / 1000);
  } catch (error) {
    return true;
  }
};

// NUEVO: Función para refrescar el token con retry y cooldown
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  // Verificar si ya está refrescando
  if (refreshState.isRefreshing) {
    console.log('🔄 Refresh token ya en progreso, esperando...');
    return true; // Asumir que el refresh actual será exitoso
  }
  
  // Verificar si necesita refresh
  if (!needsTokenRefresh()) {
    return true;
  }
  
  // Verificar cooldown
  const timeSinceLastRefresh = Date.now() - refreshState.lastRefresh;
  if (timeSinceLastRefresh < REFRESH_CONFIG.COOLDOWN_MS) {
    console.log('⏳ Refresh token en cooldown, esperando...');
    return true;
  }
  
  refreshState.isRefreshing = true;
  
  try {
    console.log('🔄 Iniciando refresh token...');
    
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://dev-apiwaprueba.aova.mx'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Actualizar token si se devuelve uno nuevo
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      // Resetear estado de refresh
      refreshState.lastRefresh = Date.now();
      refreshState.isRefreshing = false;
      refreshState.retryCount = 0;
      refreshState.lastError = null;
      
      console.log('✅ Token refrescado exitosamente');
      return true;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    refreshState.isRefreshing = false;
    refreshState.lastError = error instanceof Error ? error.message : String(error);
    refreshState.retryCount++;
    
    console.error('❌ Error al refrescar token:', error);
    
    // Intentar retry si no se han agotado los intentos
    if (refreshState.retryCount < REFRESH_CONFIG.MAX_RETRIES) {
      console.log(`🔄 Reintentando refresh token (${refreshState.retryCount}/${REFRESH_CONFIG.MAX_RETRIES})...`);
      
      setTimeout(() => {
        refreshTokenIfNeeded();
      }, REFRESH_CONFIG.RETRY_DELAY_MS);
      
      return true; // Asumir que el retry será exitoso
    } else {
      console.error('❌ Máximo de reintentos alcanzado, limpiando sesión...');
      clearAllAuthData();
      return false;
    }
  }
};

// NUEVO: Función para obtener estadísticas del refresh token
export const getRefreshStats = () => {
  return {
    lastRefresh: refreshState.lastRefresh,
    isRefreshing: refreshState.isRefreshing,
    retryCount: refreshState.retryCount,
    lastError: refreshState.lastError,
    timeSinceLastRefresh: Date.now() - refreshState.lastRefresh,
  };
}; 