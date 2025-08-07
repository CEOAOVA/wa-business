# 🚨 Diagnóstico de Errores de Login

## 📋 Situación Actual

### Error Local:
```
❌ [AuthMiddleware] Token inválido o expirado {
  error: 'invalid JWT: unable to parse or verify signature, token signature is invalid: signature is invalid',       
  hasUser: false,
  userId: undefined
}
```

### Error Web (Coolify):
```
HTTP 400: "email y contraseña requeridos"
```

## 🔍 Análisis del Problema

### ✅ **SOLUCIONADO: JWT Token Validation**
- **Problema:** El middleware `auth.ts` usaba `supabase.auth.getUser()` para validar tokens JWT generados manualmente
- **Solución:** Creado nuevo middleware `auth-jwt.ts` que valida tokens JWT con `jsonwebtoken`
- **Estado:** ✅ Implementado y compilando

### 🚨 **PENDIENTE: Discrepancia Frontend/Backend**
- **Backend espera:** `{ username: string, password: string }`
- **Error sugiere:** Aún se envía o valida `email` en algún lugar

## 🛠️ Soluciones Implementadas

### 1. Nuevo Middleware JWT (`backend/src/middleware/auth-jwt.ts`)
```typescript
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Valida JWT tokens generados manualmente
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const decoded = jwt.verify(token, jwtSecret) as any;
  const userProfile = await AuthService.getUserById(decoded.sub);
  // ...
};
```

### 2. Rutas Actualizadas
- ✅ `auth.ts` → importa de `auth-jwt.ts`
- ✅ `chat.ts` → importa de `auth-jwt.ts`
- ✅ `dashboard.ts` → importa de `auth-jwt.ts`
- ✅ `queue.ts` → importa de `auth-jwt.ts`

### 3. Rate Limiting Configurado
- ✅ Desarrollo: 50 intentos por 15 minutos
- ✅ Producción: 5 intentos por 15 minutos
- ✅ IPs locales: Sin rate limiting en desarrollo

## 🧪 Pasos de Debugging

### Para el Error Local:
1. ✅ Middleware JWT implementado
2. 🔄 Restart backend con nuevo middleware
3. 🔄 Limpiar localStorage del frontend
4. 🔄 Intentar login nuevamente

### Para el Error Web (Coolify):
1. 🔄 Verificar variables de entorno en Coolify
2. 🔄 Verificar que el build incluye los nuevos cambios
3. 🔄 Revisar logs del backend en Coolify

## 📝 Checklist de Verificación

### Backend:
- ✅ `auth.service.ts` genera JWT manualmente
- ✅ `auth-jwt.ts` valida JWT manualmente
- ✅ `routes/auth.ts` usa nuevo middleware
- ✅ Rate limiting configurado
- ✅ Compila sin errores

### Frontend:
- ✅ `Login.tsx` envía `username` (no `email`)
- ✅ `auth-api.ts` tiene `LoginRequest` con `username`
- ✅ `types/index.ts` tiene `LoginCredentials` con `username`
- ✅ `AuthContext.tsx` usa `username` en logs

### Configuración:
- 🔄 `JWT_SECRET` configurado en ambos entornos
- 🔄 Variables de entorno de Supabase configuradas
- 🔄 CORS configurado correctamente

## 🚀 Próximos Pasos

1. **Restart del backend** con nuevos cambios
2. **Limpiar caché/localStorage** del frontend
3. **Verificar logs** en tiempo real durante login
4. **Testing con credenciales demo**
5. **Deploy a Coolify** con cambios actualizados

## 🔧 Variables de Entorno Críticas

```env
# Backend
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=8h
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Frontend
VITE_BACKEND_URL=http://localhost:3002 (local) / https://tu-dominio.com (producción)
```

## 📊 Estado de Implementación

- ✅ **Login con validación directa:** COMPLETADO
- ✅ **JWT manual generation:** COMPLETADO  
- ✅ **JWT manual validation:** COMPLETADO
- ✅ **Rate limiting ajustado:** COMPLETADO
- ✅ **Middleware actualizado:** COMPLETADO
- 🔄 **Testing local:** PENDIENTE
- 🔄 **Deploy a producción:** PENDIENTE

**SIGUIENTE ACCIÓN:** Restart backend y probar login local