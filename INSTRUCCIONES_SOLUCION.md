# 🚀 INSTRUCCIONES PARA SOLUCIONAR PROBLEMAS DE AUTENTICACIÓN

## ✅ CAMBIOS YA APLICADOS

Los siguientes archivos ya han sido modificados y compilados:

1. **Backend (`backend/src/app.ts`)**: 
   - Mejorada validación de tokens en Socket.IO
   - Mejor manejo de errores y logs detallados
   - Token se limpia de "Bearer " antes de validar

2. **Frontend (`frontend/src/hooks/useWebSocketOptimized.ts`)**:
   - Validación de token antes de conectar
   - Redirección automática a login si no hay token
   - Timeout aumentado a 30 segundos

3. **Herramientas de Debug (`frontend/src/utils/auth-debug.ts`)**:
   - Funciones para analizar y verificar tokens
   - Test de conexión WebSocket

## 📋 PASOS A SEGUIR

### 1️⃣ REINICIAR EL BACKEND

```bash
# En PowerShell o terminal
cd backend
npm run start
```

### 2️⃣ VERIFICAR TOKEN EN EL FRONTEND

Abre la aplicación en el navegador y abre la consola (F12), luego ejecuta:

```javascript
// Ver estado del token
debugAuth()
```

### 3️⃣ CASOS Y SOLUCIONES

#### CASO A: "❌ NO HAY TOKEN"
```javascript
// Solución: Iniciar sesión en la aplicación
window.location.href = '/login'
```

#### CASO B: "❌ TOKEN EXPIRADO"
```javascript
// Solución: Limpiar y recargar
clearAuth()
// O manualmente:
localStorage.removeItem('authToken')
window.location.href = '/login'
```

#### CASO C: "✅ TOKEN VÁLIDO"
```javascript
// Probar conexión WebSocket
testWebSocket()
```

### 4️⃣ VERIFICAR CONEXIÓN WEBSOCKET

Si el token es válido pero sigue sin conectar:

```javascript
// Test manual detallado
const token = localStorage.getItem('authToken');
const socket = io('https://dev-apiwaprueba.aova.mx', {
  transports: ['websocket'],
  auth: { token },
  query: { token },
  timeout: 30000
});

socket.on('connect', () => {
  console.log('✅ CONECTADO - ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ ERROR:', error.message);
});
```

### 5️⃣ VERIFICAR MENSAJES EN SUPABASE

Para confirmar que los mensajes se están guardando:

```javascript
// En la consola, verificar las conversaciones
fetch('https://dev-apiwaprueba.aova.mx/api/dashboard/conversations/public', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('📊 Conversaciones:', data);
  // Si hay conversaciones, obtener mensajes de la primera
  if (data.length > 0) {
    const convId = data[0].id;
    return fetch(`https://dev-apiwaprueba.aova.mx/api/dashboard/conversations/${convId}/messages`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
  }
})
.then(r => r?.json())
.then(messages => {
  if (messages) {
    console.log('💬 Mensajes:', messages);
  }
})
.catch(err => console.error('Error:', err));
```

## 🔍 DIAGNÓSTICO RÁPIDO

Ejecuta este comando en la consola para un diagnóstico completo:

```javascript
(async () => {
  console.log('🔍 DIAGNÓSTICO COMPLETO\n');
  console.log('='.repeat(50));
  
  // 1. Token
  const token = localStorage.getItem('authToken');
  console.log('1. TOKEN:', token ? '✅ Presente' : '❌ Ausente');
  
  if (token) {
    // 2. Validez del token
    debugAuth();
    
    // 3. Test de API
    console.log('\n2. TEST DE API:');
    try {
      const response = await fetch('https://dev-apiwaprueba.aova.mx/api/dashboard/system/info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('   Estado:', response.status);
      console.log('   API:', response.ok ? '✅ Funcionando' : '❌ Error');
    } catch (e) {
      console.error('   ❌ Error de conexión:', e.message);
    }
    
    // 4. Test WebSocket
    console.log('\n3. TEST WEBSOCKET:');
    testWebSocket();
  } else {
    console.log('\n❌ No se puede continuar sin token');
    console.log('💡 Ejecuta: window.location.href = "/login"');
  }
})();
```

## ⚠️ IMPORTANTE

1. **Siempre verificar primero el token** con `debugAuth()`
2. **Si el token expiró**, es normal - los tokens de Supabase expiran después de 1 hora
3. **Si cambias el backend**, debes compilar con `npm run build` antes de reiniciar
4. **Los logs del backend** mostrarán detalles de cada intento de conexión

## 🆘 SI NADA FUNCIONA

1. Limpiar todo y empezar de nuevo:
```javascript
// En la consola del navegador
localStorage.clear();
sessionStorage.clear();
window.location.href = '/login';
```

2. Verificar que el backend esté corriendo y accesible:
```javascript
fetch('https://dev-apiwaprueba.aova.mx/api/health')
  .then(r => r.json())
  .then(data => console.log('Backend:', data))
  .catch(err => console.error('Backend no accesible:', err));
```

3. Revisar los logs del backend en la consola donde está corriendo

## 📞 SOPORTE

Si después de seguir todos estos pasos sigues teniendo problemas:

1. Ejecuta el diagnóstico completo y copia el resultado
2. Revisa los logs del backend
3. Comparte ambos resultados para análisis adicional