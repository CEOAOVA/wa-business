/**
 * Utilidad para probar la conexión WebSocket desde la consola del navegador
 * 
 * USO:
 * 1. Abre la consola del navegador (F12)
 * 2. Copia y pega este código
 * 3. Ejecuta: testWebSocket()
 */

export function testWebSocket() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE WEBSOCKET...\n');
  
  // 1. Verificar token
  const token = localStorage.getItem('authToken');
  console.log('1️⃣ TOKEN DE AUTENTICACIÓN:');
  if (token) {
    console.log('   ✅ Token presente:', token.substring(0, 30) + '...');
  } else {
    console.error('   ❌ NO HAY TOKEN - Necesitas iniciar sesión primero');
    return;
  }
  
  // 2. Verificar URL del backend
  console.log('\n2️⃣ CONFIGURACIÓN DEL BACKEND:');
  // @ts-ignore
  const backendUrl = import.meta.env?.VITE_BACKEND_URL || 'No configurado';
  console.log('   📍 Backend URL:', backendUrl);
  
  // 3. Intentar conexión manual
  console.log('\n3️⃣ PROBANDO CONEXIÓN MANUAL...');
  
  // @ts-ignore
  if (typeof io === 'undefined') {
    console.error('   ❌ Socket.IO no está cargado');
    return;
  }
  
  // @ts-ignore
  const testSocket = io(backendUrl || 'https://dev-apiwaprueba.aova.mx', {
    transports: ['websocket'],
    auth: { token },
    withCredentials: true,
    timeout: 20000
  });
  
  testSocket.on('connect', () => {
    console.log('   ✅ CONEXIÓN EXITOSA!');
    console.log('   🆔 Socket ID:', testSocket.id);
    console.log('   🚀 El WebSocket funciona correctamente');
    
    // Limpiar
    setTimeout(() => {
      testSocket.disconnect();
      console.log('   🔌 Desconectado de prueba');
    }, 2000);
  });
  
  testSocket.on('connect_error', (error: any) => {
    console.error('   ❌ ERROR DE CONEXIÓN:', error.message || 'Connection failed');
    console.error('   📝 Detalles:', {
      type: error.type || 'unknown',
      data: error.data || null
    });
    
    // Diagnóstico del error
    if (error.message?.includes('auth') || error.message?.includes('token')) {
      console.error('\n   🔐 PROBLEMA: Token inválido o expirado');
      console.error('   💡 SOLUCIÓN: Cierra sesión y vuelve a iniciar');
    } else if (error.message?.includes('CORS')) {
      console.error('\n   🌐 PROBLEMA: Error de CORS');
      console.error('   💡 SOLUCIÓN: Verificar configuración CORS en el backend');
    } else if (error.message?.includes('timeout')) {
      console.error('\n   ⏱️ PROBLEMA: Timeout de conexión');
      console.error('   💡 SOLUCIÓN: Verificar que el backend esté funcionando');
    } else {
      console.error('\n   ❓ PROBLEMA: Error desconocido');
      console.error('   💡 SOLUCIÓN: Revisar logs del backend');
    }
  });
  
  // Timeout para evitar que quede colgado
  setTimeout(() => {
    if (!testSocket.connected) {
      console.error('\n⏱️ TIMEOUT: No se pudo conectar en 10 segundos');
      testSocket.disconnect();
    }
  }, 10000);
}

/**
 * Función para limpiar y resetear la conexión
 */
export function resetWebSocket() {
  console.log('🧹 Limpiando conexión WebSocket...');
  
  // Limpiar token si está corrupto
  const token = localStorage.getItem('authToken');
  if (token && token.length < 10) {
    console.log('   ❌ Token parece inválido, limpiando...');
    localStorage.removeItem('authToken');
  }
  
  // Recargar la página para resetear todo
  console.log('   🔄 Recargando página en 2 segundos...');
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

/**
 * Función para monitorear mensajes en tiempo real
 */
export function monitorMessages() {
  console.log('👁️ MONITOREANDO MENSAJES EN TIEMPO REAL...\n');
  
  // @ts-ignore
  const socket = window.__socket || window.socket;
  
  if (!socket || !socket.connected) {
    console.error('❌ No hay conexión WebSocket activa');
    console.log('💡 Ejecuta primero: testWebSocket()');
    return;
  }
  
  console.log('✅ Escuchando eventos...');
  
  socket.on('new_message', (data: any) => {
    console.log('📨 NUEVO MENSAJE:', data);
  });
  
  socket.on('conversation_updated', (data: any) => {
    console.log('📝 CONVERSACIÓN ACTUALIZADA:', data);
  });
  
  socket.on('error', (error: any) => {
    console.error('❌ ERROR:', error);
  });
  
  console.log('   Deja esta ventana abierta para ver los mensajes en tiempo real');
  console.log('   Para detener el monitoreo, recarga la página');
}

// Exportar funciones al objeto window para uso en consola
if (typeof window !== 'undefined') {
  (window as any).testWebSocket = testWebSocket;
  (window as any).resetWebSocket = resetWebSocket;
  (window as any).monitorMessages = monitorMessages;
  
  console.log(`
🚀 HERRAMIENTAS DE DIAGNÓSTICO WEBSOCKET CARGADAS

Comandos disponibles:
  testWebSocket()    - Probar conexión WebSocket
  resetWebSocket()   - Limpiar y resetear conexión
  monitorMessages()  - Monitorear mensajes en tiempo real

Ejecuta: testWebSocket() para empezar el diagnóstico
  `);
}