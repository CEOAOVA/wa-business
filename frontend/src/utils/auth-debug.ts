/**
 * Utilidades de debug para autenticación
 * Usar desde la consola del navegador: debugAuth()
 */

export function debugAuth() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('❌ NO HAY TOKEN');
    console.log('💡 Solución: Inicia sesión en la aplicación');
    return null;
  }
  
  console.log('🔍 ANALIZANDO TOKEN...\n');
  
  // Decodificar JWT (sin verificar firma)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Token no es JWT válido (debe tener 3 partes)');
      console.log('Partes encontradas:', parts.length);
      return null;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 INFORMACIÓN DEL TOKEN:');
    console.log('  👤 Usuario ID:', payload.sub);
    console.log('  📧 Email:', payload.email || 'No disponible');
    console.log('  🎭 Rol:', payload.role);
    console.log('  🏢 Emisor:', payload.iss);
    console.log('  📅 Emitido:', new Date(payload.iat * 1000).toLocaleString());
    console.log('  ⏰ Expira:', new Date(payload.exp * 1000).toLocaleString());
    
    // Verificar si está expirado
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.error('\n❌ TOKEN EXPIRADO');
      console.log('  ⏱️ Expiró hace:', Math.round((now - payload.exp) / 60), 'minutos');
      console.log('  💡 Solución: Cierra sesión y vuelve a iniciar');
      
      // Ofrecer limpiar token
      console.log('\n🧹 Para limpiar el token expirado, ejecuta:');
      console.log('  localStorage.removeItem("authToken"); window.location.href = "/login";');
    } else {
      console.log('\n✅ TOKEN VÁLIDO');
      console.log('  ⏱️ Válido por:', Math.round((payload.exp - now) / 60), 'minutos más');
    }
    
    console.log('\n📊 DETALLES ADICIONALES:');
    console.log('  Longitud del token:', token.length, 'caracteres');
    console.log('  Session ID:', payload.session_id || 'No disponible');
    console.log('  AAL:', payload.aal || 'No disponible');
    
    return payload;
  } catch (error) {
    console.error('❌ Error decodificando token:', error);
    console.log('💡 El token puede estar corrupto. Intenta cerrar sesión y volver a iniciar.');
    return null;
  }
}

/**
 * Test de conexión WebSocket con el token actual
 */
export async function testWebSocketConnection() {
  console.log('🔌 PROBANDO CONEXIÓN WEBSOCKET...\n');
  
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('❌ No hay token para probar');
    return;
  }
  
  // Primero verificar el token
  const tokenInfo = debugAuth();
  if (!tokenInfo) {
    console.error('❌ No se puede probar con un token inválido');
    return;
  }
  
  // @ts-ignore
  const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'https://dev-apiwaprueba.aova.mx';
  
  console.log('🌐 Conectando a:', backendUrl);
  console.log('🔐 Con token de:', tokenInfo.email || tokenInfo.sub);
  
  // @ts-ignore
  if (typeof io === 'undefined') {
    console.error('❌ Socket.IO no está cargado en la página');
    return;
  }
  
  // @ts-ignore
  const testSocket = io(backendUrl, {
    transports: ['websocket'],
    auth: { token },
    query: { token },
    timeout: 30000,
    withCredentials: true
  });
  
  testSocket.on('connect', () => {
    console.log('✅ CONEXIÓN EXITOSA!');
    console.log('🆔 Socket ID:', testSocket.id);
    console.log('📡 WebSocket funcionando correctamente');
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
      testSocket.disconnect();
      console.log('🔌 Desconectado (prueba completada)');
    }, 3000);
  });
  
  testSocket.on('connect_error', (error: any) => {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
    console.log('📝 Tipo de error:', error.type || 'unknown');
    
    // Diagnóstico específico
    if (error.message?.includes('Invalid or expired token')) {
      console.error('\n🔐 PROBLEMA: Token expirado o inválido');
      console.error('💡 SOLUCIÓN: Cierra sesión y vuelve a iniciar');
    } else if (error.message?.includes('No authentication token')) {
      console.error('\n🔐 PROBLEMA: No se envió el token');
      console.error('💡 SOLUCIÓN: Verifica que el token existe en localStorage');
    } else if (error.message?.includes('User not found')) {
      console.error('\n👤 PROBLEMA: Usuario no encontrado');
      console.error('💡 SOLUCIÓN: El usuario puede haber sido eliminado');
    } else if (error.message?.includes('CORS')) {
      console.error('\n🌐 PROBLEMA: Error de CORS');
      console.error('💡 SOLUCIÓN: Verificar configuración CORS en el backend');
    } else {
      console.error('\n❓ PROBLEMA: Error desconocido');
      console.error('💡 SOLUCIÓN: Revisar logs del backend');
    }
    
    testSocket.disconnect();
  });
  
  // Timeout de seguridad
  setTimeout(() => {
    if (!testSocket.connected) {
      console.error('\n⏱️ TIMEOUT: No se pudo conectar en 30 segundos');
      testSocket.disconnect();
    }
  }, 30000);
}

/**
 * Limpiar sesión y recargar
 */
export function clearAndReload() {
  console.log('🧹 Limpiando sesión...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('rememberAuth');
  console.log('✅ Sesión limpiada');
  console.log('🔄 Recargando en 2 segundos...');
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
}

// Hacer disponibles en consola global
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).testWebSocket = testWebSocketConnection;
  (window as any).clearAuth = clearAndReload;
  
  console.log('🛠️ Herramientas de debug disponibles:');
  console.log('  debugAuth() - Analizar token JWT');
  console.log('  testWebSocket() - Probar conexión WebSocket');
  console.log('  clearAuth() - Limpiar sesión y recargar');
}