/**
 * Script de prueba para verificar las mejoras en el sistema de autenticación
 * Prueba las nuevas funcionalidades implementadas
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3002';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123456';

// Colores para console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, result, details = '') {
  const status = result ? '✅ PASÓ' : '❌ FALLÓ';
  const color = result ? 'green' : 'red';
  log(`${status} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { response: null, data: null, error: error.message };
  }
}

async function testAuthStatus() {
  log('\n🔍 Probando endpoint de estado de autenticación...', 'blue');
  
  const { response, data } = await makeRequest('/api/auth/status');
  
  if (response && response.ok) {
    logTest('GET /api/auth/status', true, 'Endpoint responde correctamente');
    logTest('Estructura de respuesta válida', 
      data && data.success && data.data && typeof data.data.isAuthenticated === 'boolean',
      'Respuesta incluye estructura esperada'
    );
  } else {
    logTest('GET /api/auth/status', false, `Error: ${response?.status || 'No response'}`);
  }
}

async function testLoginFlow() {
  log('\n🔐 Probando flujo de login mejorado...', 'blue');
  
  // Intentar login con credenciales de prueba
  const { response, data } = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });
  
  if (response && response.ok) {
    logTest('POST /api/auth/login', true, 'Login exitoso');
    logTest('Token de sesión presente', 
      data.data && data.data.session && data.data.session.access_token,
      'Token de acceso incluido en respuesta'
    );
    logTest('Datos de usuario presentes', 
      data.data && data.data.user && data.data.user.email,
      'Perfil de usuario incluido en respuesta'
    );
    
    return data.data.session.access_token;
  } else {
    logTest('POST /api/auth/login', false, `Error: ${response?.status || 'No response'}`);
    if (data && data.message) {
      log(`   Mensaje: ${data.message}`, 'yellow');
    }
    return null;
  }
}

async function testRefreshToken(token) {
  if (!token) {
    logTest('POST /api/auth/refresh', false, 'No hay token para probar');
    return null;
  }
  
  log('\n🔄 Probando refresco de token...', 'blue');
  
  const { response, data } = await makeRequest('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response && response.ok) {
    logTest('POST /api/auth/refresh', true, 'Token refrescado exitosamente');
    logTest('Datos de usuario actualizados', 
      data.data && data.data.user,
      'Perfil de usuario incluido en respuesta'
    );
    return true;
  } else {
    logTest('POST /api/auth/refresh', false, `Error: ${response?.status || 'No response'}`);
    return false;
  }
}

async function testSessionManagement(token) {
  if (!token) {
    logTest('Gestión de sesiones', false, 'No hay token para probar');
    return;
  }
  
  log('\n🧹 Probando gestión de sesiones...', 'blue');
  
  // Probar obtener sesiones activas
  const { response: sessionsResponse, data: sessionsData } = await makeRequest('/api/auth/sessions', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (sessionsResponse && sessionsResponse.ok) {
    logTest('GET /api/auth/sessions', true, 'Sesiones obtenidas correctamente');
    logTest('Estructura de sesiones válida', 
      sessionsData.data && Array.isArray(sessionsData.data.sessions),
      'Lista de sesiones incluida en respuesta'
    );
  } else {
    logTest('GET /api/auth/sessions', false, `Error: ${sessionsResponse?.status || 'No response'}`);
  }
  
  // Probar limpieza de sesiones
  const { response: cleanupResponse, data: cleanupData } = await makeRequest('/api/auth/sessions/cleanup', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (cleanupResponse && cleanupResponse.ok) {
    logTest('POST /api/auth/sessions/cleanup', true, 'Limpieza de sesiones exitosa');
    logTest('Datos de limpieza presentes', 
      cleanupData.data && typeof cleanupData.data.cleaned === 'number',
      'Estadísticas de limpieza incluidas'
    );
  } else {
    logTest('POST /api/auth/sessions/cleanup', false, `Error: ${cleanupResponse?.status || 'No response'}`);
  }
}

async function testOptionalAuth() {
  log('\n🔓 Probando autenticación opcional...', 'blue');
  
  // Probar sin token
  const { response: noTokenResponse, data: noTokenData } = await makeRequest('/api/auth/status');
  
  if (noTokenResponse && noTokenResponse.ok) {
    logTest('GET /api/auth/status (sin token)', true, 'Endpoint responde sin token');
    logTest('Estado no autenticado', 
      noTokenData.data && noTokenData.data.isAuthenticated === false,
      'Correctamente marcado como no autenticado'
    );
  } else {
    logTest('GET /api/auth/status (sin token)', false, `Error: ${noTokenResponse?.status || 'No response'}`);
  }
}

async function testErrorHandling() {
  log('\n⚠️ Probando manejo de errores...', 'blue');
  
  // Probar con token inválido
  const { response: invalidTokenResponse, data: invalidTokenData } = await makeRequest('/api/auth/status', {
    headers: {
      'Authorization': 'Bearer invalid_token_here'
    }
  });
  
  if (invalidTokenResponse && invalidTokenResponse.ok) {
    logTest('GET /api/auth/status (token inválido)', true, 'Endpoint maneja token inválido gracefully');
    logTest('Estado no autenticado con token inválido', 
      invalidTokenData.data && invalidTokenData.data.isAuthenticated === false,
      'Correctamente marcado como no autenticado'
    );
  } else {
    logTest('GET /api/auth/status (token inválido)', false, `Error: ${invalidTokenResponse?.status || 'No response'}`);
  }
}

async function runAllTests() {
  log('🚀 Iniciando pruebas de mejoras de autenticación...', 'bold');
  log(`📡 URL del backend: ${BASE_URL}`, 'blue');
  
  // Ejecutar pruebas
  await testAuthStatus();
  await testOptionalAuth();
  await testErrorHandling();
  
  const token = await testLoginFlow();
  if (token) {
    await testRefreshToken(token);
    await testSessionManagement(token);
  }
  
  log('\n🎯 Pruebas completadas', 'bold');
  log('📋 Revisa los resultados arriba para verificar que todas las mejoras funcionan correctamente.', 'blue');
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runAllTests().catch(error => {
    log(`❌ Error ejecutando pruebas: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  testAuthStatus,
  testLoginFlow,
  testRefreshToken,
  testSessionManagement,
  testOptionalAuth,
  testErrorHandling,
  runAllTests
}; 