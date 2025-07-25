/**
 * Utilidades para limpiar la autenticación
 */

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

// Función para refrescar el token automáticamente
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  if (!isTokenExpiringSoon()) return true;
  
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://dev-apiwaprueba.aova.mx'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Token refrescado automáticamente');
      return true;
    } else {
      console.warn('Error al refrescar token, limpiando sesión...');
      clearAllAuthData();
      return false;
    }
  } catch (error) {
    console.error('Error al refrescar token:', error);
    return false;
  }
}; 