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

// Función para limpiar datos de autenticación inválidos
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
      
      if (payload.exp && payload.exp < currentTime) {
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