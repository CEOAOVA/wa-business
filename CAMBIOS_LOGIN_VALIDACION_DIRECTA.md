# 🔐 Cambios en Sistema de Login - Validación Directa contra Tabla Agents

## 📋 Resumen de Cambios

Se modificó el sistema de autenticación para validar directamente contra la tabla `agents` en Supabase, eliminando la dependencia de Supabase Auth y usando comparación exacta de `username` y `password`.

## 🎯 Objetivo

Cambiar el flujo de login de:
- **Antes:** Email + Password → Supabase Auth → Buscar en tabla agents
- **Después:** Username + Password → Validación directa en tabla agents

## 🔧 Cambios Realizados

### 1. Backend - Servicio de Autenticación

**Archivo:** `backend/src/services/auth.service.ts`

#### Cambios Principales:
- ✅ **Importaciones actualizadas:** Agregado `jsonwebtoken` para generar tokens manualmente
- ✅ **Interfaz LoginData modificada:** Cambio de `email` a `username`
- ✅ **Método login completamente reescrito:**
  - Eliminada dependencia de Supabase Auth
  - Validación directa contra tabla `agents`
  - Comparación exacta de `username` y `password`
  - Generación manual de JWT tokens
  - Manejo de usuarios inactivos

#### Código Clave:
```typescript
// Antes
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: loginData.email,
  password: loginData.password
});

// Después
const { data: agent, error: agentError } = await supabaseAdmin
  .from('agents')
  .select('*')
  .eq('username', loginData.username)
  .single();

if (agent.password !== loginData.password) {
  throw new Error('Usuario o contraseña incorrectos');
}
```

### 2. Backend - Rutas de Autenticación

**Archivo:** `backend/src/routes/auth.ts`

#### Cambios:
- ✅ **Validación de campos:** Cambio de `email` a `username`
- ✅ **Mensajes de error actualizados:** "Usuario y contraseña son requeridos"

### 3. Frontend - Componente de Login

**Archivo:** `frontend/src/pages/Login.tsx`

#### Cambios Principales:
- ✅ **Estado del formulario:** Cambio de `email` a `username`
- ✅ **Input del formulario:** 
  - Tipo cambiado de `email` a `text`
  - Placeholder actualizado
  - Icono cambiado de `Mail` a `User`
- ✅ **Credenciales demo actualizadas:** Campo `email` → `username`
- ✅ **Validaciones:** Todas las referencias a `email` cambiadas a `username`

#### Código Clave:
```typescript
// Antes
const [email, setEmail] = useState("");
<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

// Después
const [username, setUsername] = useState("");
<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
```

### 4. Frontend - Servicio de API

**Archivo:** `frontend/src/services/auth-api.ts`

#### Cambios:
- ✅ **Interfaz LoginRequest:** Campo `email` → `username`

### 5. Frontend - Tipos

**Archivo:** `frontend/src/types/index.ts`

#### Cambios:
- ✅ **Interfaz LoginCredentials:** Campo `email` → `username`

### 6. Frontend - Contexto de Autenticación

**Archivo:** `frontend/src/context/AuthContext.tsx`

#### Cambios:
- ✅ **Logging actualizado:** Cambio de `email` a `username` en logs

## 🔑 Credenciales Demo Actualizadas

Las credenciales demo se mantuvieron pero ahora usan `username` en lugar de `email`:

| Usuario | Username | Password | Rol | Redirección |
|---------|----------|----------|-----|-------------|
| **Administrador** | `moises.s@aova.mx` | `Admin2024!` | admin | `/admin/dashboard` |
| **Agente 1** | `k.alvarado@aova.mx` | `Agente2024!` | agent | `/chats` |
| **Agente 2** | `elisa.n@synaracare.com` | `Agente2024!` | agent | `/chats` |

## 🛡️ Seguridad

### Consideraciones Importantes:
- ⚠️ **Contraseñas en texto plano:** El sistema actual compara contraseñas directamente
- 🔒 **JWT Tokens:** Generados manualmente con expiración configurable
- 🚨 **Recomendación:** En producción, implementar hash de contraseñas (bcrypt)

### Mejoras de Seguridad Sugeridas:
```typescript
// Futura implementación con hash
import bcrypt from 'bcrypt';

// En lugar de comparación directa
if (agent.password !== loginData.password) {
  // Usar hash
  const isValid = await bcrypt.compare(loginData.password, agent.password);
  if (!isValid) {
    throw new Error('Usuario o contraseña incorrectos');
  }
}
```

## 🔄 Flujo de Autenticación Actualizado

### 1. Frontend (Usuario)
```
Usuario ingresa username y password
↓
Formulario valida campos requeridos
↓
Contexto de Auth llama a login()
↓
Servicio API envía POST /api/auth/login
```

### 2. Backend (Servidor)
```
Recibe { username, password }
↓
Busca usuario en tabla agents por username
↓
Compara password exacto
↓
Verifica que usuario esté activo
↓
Genera JWT token manualmente
↓
Retorna { user, session }
```

### 3. Frontend (Respuesta)
```
Recibe respuesta exitosa
↓
Guarda token en localStorage
↓
Inicia auto-refresh de tokens
↓
Actualiza estado global
↓
RoleRedirect redirige según rol
```

## 🧪 Pruebas Realizadas

### ✅ Compilación Exitosa
- **Backend:** `npm run build` ✅
- **Frontend:** `npm run build` ✅
- **TypeScript:** Sin errores ✅

### ✅ Funcionalidades Verificadas
- **Login con credenciales demo** ✅
- **Redirección por roles** ✅
- **Manejo de errores** ✅
- **Validación de campos** ✅

## 📝 Notas de Implementación

### Archivos Modificados:
1. `backend/src/services/auth.service.ts` - Lógica principal de autenticación
2. `backend/src/routes/auth.ts` - Endpoint de login
3. `frontend/src/pages/Login.tsx` - Interfaz de usuario
4. `frontend/src/services/auth-api.ts` - Servicio de API
5. `frontend/src/types/index.ts` - Tipos TypeScript
6. `frontend/src/context/AuthContext.tsx` - Contexto de autenticación

### Dependencias Verificadas:
- ✅ `jsonwebtoken` ya instalado en backend
- ✅ `@types/jsonwebtoken` ya instalado en backend
- ✅ Todas las importaciones funcionando correctamente

## 🚨 Error de Rate Limiting - SOLUCIONADO

### Problema Identificado:
El error **"Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos"** **NO viene de Supabase**, sino que está **programado en el sistema** mediante rate limiting.

### Ubicación del Rate Limiting:
**Archivo:** `backend/src/config/rate-limits.ts`
```typescript
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  message: {
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  }
});
```

**Aplicación:** `backend/src/app.ts:205`
```typescript
app.use('/api/auth', authRateLimit, authRoutes);
```

### Solución Implementada:
✅ **Rate limiting más permisivo en desarrollo:**
- **Desarrollo:** 50 intentos por 15 minutos (en lugar de 5)
- **Producción:** 5 intentos por 15 minutos (mantenido)
- **IPs locales:** Rate limiting deshabilitado en desarrollo

### Código de la Solución:
```typescript
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Más permisivo en desarrollo
  message: {
    error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Agregar configuración para saltar rate limiting en desarrollo
  skip: (req) => {
    // Saltar rate limiting para IPs locales en desarrollo
    const ip = req.ip || req.connection.remoteAddress || '';
    const isLocalDev = process.env.NODE_ENV === 'development' && (
      ip.includes('127.0.0.1') || 
      ip.includes('::1') || 
      ip.includes('localhost') ||
      ip.includes('192.168.')
    );
    
    // Saltar para health checks
    const isHealthCheck = req.path === '/health';
    
    return isLocalDev || isHealthCheck;
  }
});
```

## 🚀 Próximos Pasos

### Mejoras Sugeridas:
1. **Implementar hash de contraseñas** con bcrypt
2. **Agregar rate limiting** para intentos de login
3. **Implementar auditoría** de intentos de acceso
4. **Agregar validación de complejidad** de contraseñas
5. **Implementar recuperación** de contraseñas

### Configuración de Producción:
```env
# Variables de entorno requeridas
JWT_SECRET=tu_jwt_secret_super_seguro_256_bits
JWT_EXPIRES_IN=8h
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## ✅ Estado Final

El sistema de login ahora:
- ✅ Valida directamente contra la tabla `agents`
- ✅ Usa `username` en lugar de `email`
- ✅ Mantiene las redirecciones por rol
- ✅ Genera tokens JWT manualmente
- ✅ Compila sin errores
- ✅ Mantiene compatibilidad con el frontend existente
- ✅ **Rate limiting configurado para desarrollo** (50 intentos vs 5 en producción)

**Estado:** ✅ **IMPLEMENTACIÓN COMPLETADA Y FUNCIONAL** 