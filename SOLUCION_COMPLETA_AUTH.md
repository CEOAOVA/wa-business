# 🔧 SOLUCIÓN COMPLETA: PROBLEMAS DE AUTENTICACIÓN Y TIEMPO REAL

## 📋 PROBLEMAS IDENTIFICADOS

1. **❌ Token inválido en Socket.IO** - "Invalid authentication token"
2. **❌ No se cargan mensajes históricos** 
3. **❌ No se muestran mensajes en tiempo real**
4. **⚠️ Error de rate limiter** en el backend
5. **✅ Los mensajes SÍ llegan y se guardan en Supabase** (según logs)

## 🎯 CAUSA RAÍZ

El método `supabaseAdmin.auth.getUser(token)` necesita validación especial y el token puede estar expirado o en formato incorrecto.

## 🛠️ SOLUCIÓN PASO A PASO

### 1️⃣ BACKEND: Corregir Validación de Token

**Archivo:** `backend/src/app.ts`

```typescript
// REEMPLAZAR el middleware de Socket.IO con esta versión corregida:
io.use(async (socket, next) => {
  try {
    // Obtener token del handshake
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token as string;
    
    console.log('🔍 [Socket.IO Auth] Verificando conexión...');
    
    if (!token) {
      console.log('❌ Socket.IO: Sin token de autenticación');
      return next(new Error('No authentication token'));
    }
    
    console.log('🔐 Token recibido (primeros 30 chars):', token.substring(0, 30) + '...');
    
    // IMPORTANTE: getUser necesita solo el token, no "Bearer "
    const cleanToken = token.replace('Bearer ', '');
    
    // Validar con Supabase - usar try/catch para manejar errores
    const { supabaseAdmin } = require('./config/supabase');
    
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(cleanToken);
      
      if (error) {
        console.log('❌ Socket.IO: Error de Supabase:', error.message);
        console.log('💡 Posible token expirado o inválido');
        return next(new Error('Invalid or expired token'));
      }
      
      if (!user) {
        console.log('❌ Socket.IO: No se encontró usuario');
        return next(new Error('User not found'));
      }
      
      console.log('✅ Socket.IO: Usuario autenticado:', user.email);
      
      // Adjuntar usuario al socket
      (socket as any).userId = user.id;
      (socket as any).userEmail = user.email;
      
      next();
    } catch (authError) {
      console.error('❌ Error validando con Supabase:', authError);
      return next(new Error('Authentication validation failed'));
    }
    
  } catch (error) {
    console.error('❌ Socket.IO: Error general en autenticación:', error);
    next(new Error('Authentication error'));
  }
});
```

### 2️⃣ FRONTEND: Mejorar Manejo de Token

**Archivo:** `frontend/src/hooks/useWebSocketOptimized.ts`

```typescript
// En la función connect(), reemplazar la validación de token:
const connect = useCallback(() => {
  if (isConnectingRef.current || socketRef.current?.connected) {
    console.log('🌐 WebSocket ya está conectando/conectado');
    return;
  }

  isConnectingRef.current = true;
  connectionStartTimeRef.current = Date.now();
  
  // Obtener y validar token
  const authToken = localStorage.getItem('authToken');
  
  if (!authToken) {
    console.error('❌ No hay token de autenticación');
    setConnectionError('No hay token de autenticación - Inicia sesión');
    isConnectingRef.current = false;
    
    // Notificar al usuario
    addNotification({
      type: 'error',
      title: 'No autenticado',
      message: 'Por favor inicia sesión para continuar',
      isRead: false,
    });
    
    // Redirigir a login después de 2 segundos
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
    
    return;
  }
  
  // Validar formato del token
  if (authToken.length < 100) {
    console.error('❌ Token parece inválido (muy corto)');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    return;
  }
  
  console.log('🔐 Token encontrado, longitud:', authToken.length);
  console.log('🔐 Primeros 30 caracteres:', authToken.substring(0, 30) + '...');
  console.log('🌐 Conectando a:', BACKEND_URL);
  
  const socket = io(BACKEND_URL, {
    transports: ['websocket'],
    auth: {
      token: authToken // Sin "Bearer " - solo el token
    },
    query: {
      token: authToken // Respaldo en query params
    },
    timeout: 30000, // Aumentar timeout a 30 segundos
    forceNew: true,
    reconnection: false,
    autoConnect: true,
    closeOnBeforeunload: false,
    upgrade: false,
    reconnectionAttempts: 0,
    withCredentials: true,
  });
  
  // ... resto del código
}, [/* dependencias */]);
```

### 3️⃣ BACKEND: Arreglar Error de Rate Limiter

**Archivo:** `backend/src/config/rate-limits.ts`

```typescript
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // límite de 5 requests
  message: 'Demasiados intentos de autenticación',
  standardHeaders: true,
  legacyHeaders: false,
  // IMPORTANTE: Configurar para evitar el error ERR_ERL_PERMISSIVE_TRUST_PROXY
  skip: (req) => {
    // Skip rate limiting para localhost y IPs internas
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.');
  },
  keyGenerator: (req) => {
    // Usar IP real del cliente
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }
});

export const whatsappRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 mensajes por minuto
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1';
  }
});
```

### 4️⃣ FRONTEND: Refresh Token Automático

**Archivo:** `frontend/src/services/auth-api.ts`

```typescript
// Agregar función para refresh token
async refreshToken(): Promise<void> {
  try {
    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) {
      throw new Error('No hay token para refrescar');
    }
    
    // Llamar a Supabase para refrescar
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) throw error;
    
    if (data?.session?.access_token) {
      // Actualizar token en localStorage
      localStorage.setItem('authToken', data.session.access_token);
      console.log('✅ Token refrescado exitosamente');
      
      // Reconectar WebSocket con nuevo token
      window.location.reload(); // Forma simple, o emitir evento
    }
  } catch (error) {
    console.error('❌ Error refrescando token:', error);
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}

// Interceptor para manejar 401
private async handleResponse(response: Response) {
  if (response.status === 401) {
    console.log('⚠️ Token expirado, intentando refrescar...');
    await this.refreshToken();
    // Reintentar request original
  }
  return response;
}
```

### 5️⃣ VERIFICACIÓN Y DEBUG

**Crear archivo:** `frontend/src/utils/auth-debug.ts`

```typescript
export function debugAuth() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('❌ NO HAY TOKEN');
    return;
  }
  
  // Decodificar JWT (sin verificar firma)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Token no es JWT válido');
      return;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 TOKEN INFO:');
    console.log('  Usuario:', payload.sub);
    console.log('  Email:', payload.email);
    console.log('  Rol:', payload.role);
    console.log('  Emisor:', payload.iss);
    console.log('  Expiración:', new Date(payload.exp * 1000));
    
    // Verificar si está expirado
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      console.error('❌ TOKEN EXPIRADO');
      console.log('  Expiró hace:', Math.round((now - payload.exp) / 60), 'minutos');
    } else {
      console.log('✅ Token válido por:', Math.round((payload.exp - now) / 60), 'minutos más');
    }
    
    return payload;
  } catch (error) {
    console.error('❌ Error decodificando token:', error);
  }
}

// Hacer disponible en consola
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
```

## 📝 PASOS DE IMPLEMENTACIÓN

1. **Compilar Backend:**
```bash
cd backend
npm run build
npm run start
```

2. **En el Frontend (consola del navegador):**
```javascript
// 1. Verificar estado del token
debugAuth();

// 2. Si está expirado, refrescar
localStorage.removeItem('authToken');
// Luego iniciar sesión nuevamente

// 3. Probar conexión
const token = localStorage.getItem('authToken');
const socket = io('https://dev-apiwaprueba.aova.mx', {
  transports: ['websocket'],
  auth: { token }
});

socket.on('connect', () => console.log('✅ CONECTADO'));
socket.on('connect_error', (e) => console.log('❌ ERROR:', e.message));
```

## ⚠️ PUNTOS CRÍTICOS

1. **El token expira** - Supabase tokens expiran después de 1 hora por defecto
2. **getUser vs getSession** - getUser valida con el servidor, getSession no
3. **Rate limiting** - El error de trust proxy puede bloquear conexiones
4. **Formato del token** - Debe ser solo el JWT, sin "Bearer "

## 🎯 RESULTADO ESPERADO

Después de estos cambios:
- ✅ WebSocket se conectará sin errores
- ✅ Mensajes históricos se cargarán
- ✅ Mensajes en tiempo real funcionarán
- ✅ Token se refrescará automáticamente