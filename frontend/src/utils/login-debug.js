/**
 * Script de diagnóstico para el problema de login
 * Se ejecuta en la consola del navegador para debuggear el flujo de autenticación
 */

console.log('🔍 Iniciando diagnóstico de login...');

// Función para verificar el estado actual de autenticación
function checkAuthState() {
  console.log('📊 Estado actual de autenticación:');
  console.log('- Token en localStorage:', localStorage.getItem('authToken') ? 'Presente' : 'Ausente');
  console.log('- RememberAuth:', localStorage.getItem('rememberAuth'));
  
  // Verificar si hay errores en la consola
  console.log('- Errores en consola:', window.consoleErrors || 'Ninguno');
  
  return {
    hasToken: !!localStorage.getItem('authToken'),
    hasRememberAuth: !!localStorage.getItem('rememberAuth'),
    tokenValue: localStorage.getItem('authToken')?.substring(0, 20) + '...'
  };
}

// Función para simular un login y ver el flujo completo
async function testLoginFlow(email = 'moises.s@aova.mx', password = 'Admin2024!') {
  console.log('🧪 Probando flujo de login...');
  
  try {
    // 1. Limpiar estado actual
    console.log('1️⃣ Limpiando estado actual...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('rememberAuth');
    
    // 2. Hacer request de login
    console.log('2️⃣ Haciendo request de login...');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('📡 Status de respuesta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en login:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Respuesta de login:', data);
    
    // 3. Verificar estructura de respuesta
    console.log('3️⃣ Verificando estructura de respuesta...');
    if (!data.user) {
      console.error('❌ No hay user en la respuesta');
      return false;
    }
    
    if (!data.session?.access_token) {
      console.error('❌ No hay token en la respuesta');
      return false;
    }
    
    // 4. Simular guardado de token
    console.log('4️⃣ Guardando token...');
    localStorage.setItem('authToken', data.session.access_token);
    
    // 5. Verificar que se guardó correctamente
    const savedToken = localStorage.getItem('authToken');
    console.log('✅ Token guardado:', savedToken ? 'Sí' : 'No');
    
    // 6. Probar obtener perfil
    console.log('5️⃣ Probando obtener perfil...');
    const profileResponse = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status de perfil:', profileResponse.status);
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log('✅ Perfil obtenido:', profile);
    } else {
      console.error('❌ Error obteniendo perfil');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en test de login:', error);
    return false;
  }
}

// Función para verificar el contexto de autenticación
function checkAuthContext() {
  console.log('🔍 Verificando contexto de autenticación...');
  
  // Intentar acceder al contexto global si existe
  if (window.authDebug) {
    console.log('✅ Contexto de debug disponible');
    console.log('- Estado actual:', window.authDebug.getState());
    return true;
  } else {
    console.log('⚠️ Contexto de debug no disponible');
    return false;
  }
}

// Función para limpiar todo y reiniciar
function resetAuth() {
  console.log('🧹 Limpiando toda la autenticación...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('rememberAuth');
  sessionStorage.clear();
  console.log('✅ Autenticación limpiada');
}

// Función principal de diagnóstico
function runLoginDiagnostic() {
  console.log('🔍 === DIAGNÓSTICO DE LOGIN ===');
  
  // 1. Verificar estado actual
  console.log('\n1️⃣ Estado actual:');
  const currentState = checkAuthState();
  console.log(currentState);
  
  // 2. Verificar contexto
  console.log('\n2️⃣ Contexto de autenticación:');
  const hasContext = checkAuthContext();
  
  // 3. Probar flujo de login
  console.log('\n3️⃣ Probando flujo de login:');
  testLoginFlow().then(success => {
    console.log('✅ Test de login:', success ? 'Exitoso' : 'Falló');
    
    // 4. Verificar estado después del test
    console.log('\n4️⃣ Estado después del test:');
    checkAuthState();
    
    console.log('\n🔍 === FIN DEL DIAGNÓSTICO ===');
  });
}

// Hacer funciones disponibles globalmente
window.loginDebug = {
  checkAuthState,
  testLoginFlow,
  checkAuthContext,
  resetAuth,
  runLoginDiagnostic
};

console.log('✅ Script de diagnóstico cargado. Usa:');
console.log('- loginDebug.runLoginDiagnostic() para ejecutar diagnóstico completo');
console.log('- loginDebug.checkAuthState() para ver estado actual');
console.log('- loginDebug.testLoginFlow() para probar login');
console.log('- loginDebug.resetAuth() para limpiar todo'); 