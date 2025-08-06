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
    console.log('  Remember auth:', localStorage.getItem('rememberAuth'));
    console.log('  User data:', localStorage.getItem('userData'));
    
    return payload;
  } catch (error) {
    console.error('❌ Error decodificando token:', error);
    return null;
  }
}

// NUEVO: Función global para limpiar sesión
export function clearSession() {
  console.log('🧹 LIMPIANDO SESIÓN...');
  
  // Limpiar localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('rememberAuth');
  localStorage.removeItem('userData');
  localStorage.removeItem('appState');
  localStorage.removeItem('chatState');
  
  // Limpiar sessionStorage
  sessionStorage.clear();
  
  // Limpiar cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log('✅ Sesión limpiada completamente');
  console.log('🔄 Recargando página...');
  
  // Redirigir a login
  window.location.href = '/login';
}

// NUEVO: Función para verificar estado de autenticación
export function checkAuthState() {
  console.log('🔍 ESTADO DE AUTENTICACIÓN:');
  console.log('  Token:', localStorage.getItem('authToken') ? 'Presente' : 'Ausente');
  console.log('  Remember auth:', localStorage.getItem('rememberAuth'));
  console.log('  User data:', localStorage.getItem('userData'));
  console.log('  Session storage:', sessionStorage.length > 0 ? 'Con datos' : 'Vacío');
  console.log('  Cookies:', document.cookie ? 'Presentes' : 'Ausentes');
  
  if (localStorage.getItem('authToken')) {
    console.log('\n💡 Para limpiar la sesión, ejecuta: clearSession()');
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

// NUEVO: Función para probar conexión con el backend
export function testBackendConnection() {
  console.log('🔍 PROBANDO CONEXIÓN CON BACKEND...');
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://dev-apiwaprueba.aova.mx';
  console.log('🌐 URL del backend:', backendUrl);
  
  // Probar endpoint de health
  fetch(`${backendUrl}/api/health`)
    .then(response => {
      console.log('✅ Backend responde:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('📊 Respuesta del backend:', data);
    })
    .catch(error => {
      console.error('❌ Error conectando al backend:', error);
    });
}

// NUEVO: Función para probar login con credenciales demo
export function testLogin() {
  console.log('🔐 PROBANDO LOGIN...');
  
  const credentials = {
    email: 'k.alvarado@aova.mx',
    password: 'Agente2024!'
  };
  
  console.log('📧 Credenciales de prueba:', credentials.email);
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://dev-apiwaprueba.aova.mx';
  
  fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials)
  })
    .then(response => {
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('📊 Datos de respuesta:', data);
      
      if (data.success && data.data?.session?.access_token) {
        console.log('✅ Login exitoso! Token recibido');
        localStorage.setItem('authToken', data.data.session.access_token);
        console.log('💾 Token guardado en localStorage');
      } else {
        console.error('❌ Login falló:', data.message || 'Respuesta inválida');
      }
    })
    .catch(error => {
      console.error('❌ Error en login:', error);
    });
}

// NUEVO: Función para verificar estado completo del sistema
export function checkSystemStatus() {
  console.log('🔍 VERIFICANDO ESTADO DEL SISTEMA...\n');
  
  // 1. Verificar variables de entorno
  console.log('1️⃣ VARIABLES DE ENTORNO:');
  console.log('  VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
  console.log('  NODE_ENV:', import.meta.env.NODE_ENV);
  console.log('  DEV:', import.meta.env.DEV);
  
  // 2. Verificar localStorage
  console.log('\n2️⃣ LOCALSTORAGE:');
  console.log('  authToken:', localStorage.getItem('authToken') ? 'Presente' : 'Ausente');
  console.log('  rememberAuth:', localStorage.getItem('rememberAuth'));
  console.log('  userData:', localStorage.getItem('userData'));
  
  // 3. Verificar sessionStorage
  console.log('\n3️⃣ SESSIONSTORAGE:');
  console.log('  Elementos:', sessionStorage.length);
  
  // 4. Verificar cookies
  console.log('\n4️⃣ COOKIES:');
  console.log('  Cookies:', document.cookie || 'No hay cookies');
  
  // 5. Verificar conexión de red
  console.log('\n5️⃣ CONEXIÓN DE RED:');
  console.log('  Online:', navigator.onLine);
  console.log('  User Agent:', navigator.userAgent.substring(0, 50) + '...');
  
  console.log('\n💡 Para probar el backend, ejecuta: testBackendConnection()');
  console.log('💡 Para probar login, ejecuta: testLogin()');
}

// Hacer funciones disponibles globalmente
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.debugAuth = debugAuth;
  // @ts-ignore
  window.clearSession = clearSession;
  // @ts-ignore
  window.checkAuthState = checkAuthState;
  // @ts-ignore
  window.testWebSocket = testWebSocketConnection;
  // @ts-ignore
  window.testBackendConnection = testBackendConnection;
  // @ts-ignore
  window.testLogin = testLogin;
  // @ts-ignore
  window.checkSystemStatus = checkSystemStatus;
  
  console.log('🔧 Funciones de debug disponibles:');
  console.log('  debugAuth() - Analizar token actual');
  console.log('  clearSession() - Limpiar sesión completamente');
  console.log('  checkAuthState() - Verificar estado de autenticación');
  console.log('  testWebSocket() - Probar conexión WebSocket');
  console.log('  testBackendConnection() - Probar conexión con backend');
  console.log('  testLogin() - Probar login con credenciales demo');
  console.log('  checkSystemStatus() - Verificar estado completo del sistema');
}