# 🧪 GUÍA DE PRUEBA Y VERIFICACIÓN

## ✅ CAMBIOS APLICADOS

### 1. **Backend (`backend/src/app.ts`)**
- ✅ Agregada validación de token en `allowRequest`
- ✅ Verifica autenticación con Supabase antes de permitir conexión
- ✅ Registra usuario conectado en logs

### 2. **Frontend (`frontend/src/hooks/useWebSocketOptimized.ts`)**
- ✅ Cambiado a usar SOLO `websocket` como transport
- ✅ Agregado envío de token en `auth`
- ✅ Mejorado manejo de errores de autenticación
- ✅ Agregado `withCredentials` para CORS

### 3. **Frontend (`frontend/src/context/AppContextOptimized.tsx`)**
- ✅ Agregada verificación de token al iniciar
- ✅ Manejo de errores 401 (token inválido)
- ✅ Carga condicional de conversaciones

### 4. **Herramientas de Prueba**
- ✅ `test-websocket.html` - Interfaz web para pruebas
- ✅ `test-connection.ts` - Utilidades para consola del navegador

## 🚀 INSTRUCCIONES DE PRUEBA

### **Paso 1: Reiniciar Servicios**

```bash
# Backend
cd backend
npm run build
npm run start

# Frontend (en otra terminal)
cd frontend
npm run dev
```

### **Paso 2: Verificar en el Navegador**

1. **Abrir la aplicación** en `https://dev-waprueba.aova.mx`

2. **Abrir la consola del navegador** (F12)

3. **Ejecutar diagnóstico básico:**
```javascript
// Verificar token
localStorage.getItem('authToken')

// Verificar backend URL
import.meta.env.VITE_BACKEND_URL
```

### **Paso 3: Probar Conexión Manual**

En la consola del navegador, ejecutar:

```javascript
// Conexión de prueba
const token = localStorage.getItem('authToken');
const socket = io('https://dev-apiwaprueba.aova.mx', {
  transports: ['websocket'],
  auth: { token },
  withCredentials: true
});

socket.on('connect', () => console.log('✅ CONECTADO:', socket.id));
socket.on('connect_error', (e) => console.error('❌ ERROR:', e));
socket.on('new_message', (data) => console.log('📨 MENSAJE:', data));
```

### **Paso 4: Usar Herramienta de Prueba HTML**

1. Abrir `test-websocket.html` en el navegador
2. Pegar el token de autenticación
3. Click en "Probar Conexión"
4. Verificar que muestre "CONECTADO"

### **Paso 5: Monitorear Logs del Backend**

Deberías ver:
```
✅ Socket.IO: Conectado usuario: k.alvarado@aova.mx
🔌 Cliente uniéndose a conversación: 9a37cf37-e830-4f0a-aab0-a909cd7b577e
📨 Nuevo mensaje recibido...
🌐 [Socket] Evento 'new_message' emitido...
```

## 🔍 VERIFICACIÓN DE FUNCIONAMIENTO

### **✅ Si TODO funciona correctamente:**

1. **En los logs del backend verás:**
   - `✅ Socket.IO: Conectado usuario: [email]`
   - `🌐 [Socket] Evento 'new_message' emitido`

2. **En la consola del navegador verás:**
   - `✅ WebSocket conectado en XXXms`
   - `📨 Nuevo mensaje recibido: [datos]`

3. **En la interfaz verás:**
   - Mensajes apareciendo en tiempo real
   - Historial de conversaciones cargado
   - Capacidad de enviar mensajes

### **❌ Si algo NO funciona:**

#### **Error: "No authentication token"**
- **Causa:** No hay token en localStorage
- **Solución:** Iniciar sesión nuevamente

#### **Error: "Invalid token"**
- **Causa:** Token expirado o inválido
- **Solución:** 
  ```javascript
  localStorage.removeItem('authToken');
  // Luego iniciar sesión nuevamente
  ```

#### **Error: "CORS"**
- **Causa:** URL del frontend no autorizada
- **Verificar:** Variable `FRONTEND_URL` en backend
- **Debe ser:** `https://dev-waprueba.aova.mx`

#### **No se conecta (timeout)**
- **Verificar:** Backend está corriendo
- **Verificar:** Puerto correcto (3001)
- **Verificar:** Firewall/proxy no bloquea WebSocket

## 📊 COMANDOS DE DIAGNÓSTICO RÁPIDO

```javascript
// 1. Estado completo
console.log({
  token: !!localStorage.getItem('authToken'),
  backend: import.meta.env.VITE_BACKEND_URL,
  socket: window.socket?.connected
});

// 2. Limpiar y reintentar
localStorage.removeItem('authToken');
window.location.reload();

// 3. Ver todos los eventos Socket.IO
if (window.socket) {
  window.socket.onAny((event, ...args) => {
    console.log('📡 Evento:', event, args);
  });
}
```

## 🎯 CHECKLIST FINAL

- [ ] Backend reiniciado con nuevos cambios
- [ ] Frontend reiniciado con nuevos cambios
- [ ] Token de autenticación presente
- [ ] URL del backend correcta
- [ ] WebSocket conecta exitosamente
- [ ] Mensajes se reciben en tiempo real
- [ ] Historial de conversaciones se carga
- [ ] Se pueden enviar mensajes

## 💡 TIPS ADICIONALES

1. **Siempre verificar token primero** - Es la causa más común
2. **Revisar logs del backend** - Dan información detallada
3. **Usar herramienta de prueba** - Aísla problemas de conexión
4. **Limpiar caché del navegador** - Si hay comportamiento extraño

## 🆘 SI NADA FUNCIONA

1. Ejecutar en la consola:
```javascript
// Diagnóstico completo
fetch('https://dev-apiwaprueba.aova.mx/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

2. Verificar que el backend responde:
```bash
curl https://dev-apiwaprueba.aova.mx/health
```

3. Compartir:
   - Screenshot de la consola del navegador
   - Logs del backend
   - Resultado del diagnóstico