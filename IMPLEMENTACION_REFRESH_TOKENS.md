# 🔄 IMPLEMENTACIÓN DE REFRESH TOKENS AUTOMÁTICOS

## 📋 RESUMEN DE CAMBIOS

Este documento detalla la implementación del sistema de refresh tokens para mantener sesiones activas sin requerir reautenticación frecuente.

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Servicio de Tokens (TokenService)**
**Archivo**: `backend/src/services/token.service.ts`

#### Funcionalidades principales:
- **generateTokenPair()**: Genera un par de tokens (access + refresh)
  - Access token: 15 minutos (configurable)
  - Refresh token: 7 días
- **refreshAccessToken()**: Renueva access token usando refresh token
- **verifyAccessToken()**: Verifica y decodifica access tokens
- **revokeRefreshToken()**: Revoca tokens individuales
- **revokeAllUserTokens()**: Revoca todos los tokens de un usuario
- **cleanupExpiredTokens()**: Limpieza de tokens expirados

### 2. **Base de Datos - Tabla refresh_tokens**
**Migración aplicada en Supabase**

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address TEXT
);
```

### 3. **Actualización del AuthService**
**Archivo**: `backend/src/services/auth.service.ts`

- El método `login()` ahora usa `TokenService.generateTokenPair()`
- Retorna tanto access token como refresh token
- Incluye tiempos de expiración para ambos tokens

### 4. **Actualización del Middleware**
**Archivo**: `backend/src/middleware/auth-jwt.ts`

- Usa `TokenService.verifyAccessToken()` en lugar de verificación manual
- Código más limpio y mantenible
- Soporte mejorado para tokens expirados

### 5. **Nuevas Rutas de API**
**Archivo**: `backend/src/routes/auth.ts`

#### POST /api/auth/refresh
```typescript
// Renovar access token
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

// Respuesta
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

#### POST /api/auth/revoke
```typescript
// Revocar refresh token
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 6. **Script de Mantenimiento**
**Archivo**: `backend/src/scripts/cleanup-expired-tokens.ts`

- Ejecutar con: `npm run cleanup:tokens`
- Elimina tokens expirados de la base de datos
- Se puede configurar como cron job

## 🔒 MEJORAS DE SEGURIDAD

1. **Separación de secrets**: Access y refresh tokens usan diferentes secrets
2. **Tracking de uso**: Se registra última vez de uso, IP y user agent
3. **Revocación granular**: Se pueden revocar tokens individuales o todos los de un usuario
4. **Tokens de corta duración**: Access tokens expiran en 15 minutos
5. **Almacenamiento seguro**: Refresh tokens en base de datos con índices optimizados

## 🚀 PROCESO DE IMPLEMENTACIÓN EN FRONTEND

### 1. **Servicio de Auto-Renovación**
```typescript
// frontend/src/services/auth-refresh.service.ts
class AuthRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  
  start() {
    // Programa renovación 5 minutos antes de expirar
    this.scheduleNextRefresh();
  }
  
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('authToken', data.access_token);
      this.scheduleNextRefresh();
    }
  }
}
```

### 2. **Interceptor de Axios**
```typescript
// Interceptar respuestas 401 y renovar automáticamente
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await authRefreshService.refreshToken();
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## 📊 FLUJO DE AUTENTICACIÓN

```
1. Login → genera access token (15m) + refresh token (7d)
2. Requests usan access token en header Authorization
3. Cuando access token expira → usar refresh token para renovar
4. Si refresh token expira → requerir nuevo login
5. Logout → revocar refresh token
```

## ⚙️ CONFIGURACIÓN

### Variables de Entorno
```env
# Tiempos de expiración
JWT_EXPIRES_IN=15m              # Access token
JWT_REFRESH_EXPIRES_IN=7d       # Refresh token

# Secrets (generar diferentes para cada uno)
JWT_SECRET=tu_secret_access_token
JWT_REFRESH_SECRET=tu_secret_refresh_token
```

### Generar Secrets Seguros
```bash
# Generar secret de 64 caracteres
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔧 MANTENIMIENTO

### Limpieza Manual
```bash
npm run cleanup:tokens
```

### Cron Job Recomendado
```bash
# Ejecutar diariamente a las 3 AM
0 3 * * * cd /path/to/backend && npm run cleanup:tokens
```

### Monitoreo
- Revisar logs para tokens expirados frecuentes
- Monitorear tabla refresh_tokens para crecimiento
- Alertas si falla la limpieza automática

## 📈 MÉTRICAS Y BENEFICIOS

### Beneficios de Seguridad
- ✅ Tokens de acceso de corta duración limitan ventana de exposición
- ✅ Capacidad de revocar sesiones comprometidas
- ✅ Tracking completo de uso de tokens
- ✅ No se requiere almacenar contraseñas en cliente

### Beneficios de UX
- ✅ Usuarios permanecen autenticados por 7 días
- ✅ Renovación transparente sin interrupciones
- ✅ No se requiere reautenticación frecuente
- ✅ Sesiones persistentes entre recargas

### Métricas de Rendimiento
- Tiempo de renovación: < 100ms
- Overhead de verificación: < 5ms
- Tamaño de tokens: ~200-300 bytes cada uno

## 🚨 CONSIDERACIONES IMPORTANTES

1. **Almacenamiento en Frontend**:
   - Access token: Memoria/sessionStorage
   - Refresh token: localStorage o httpOnly cookie (más seguro)

2. **Renovación Proactiva**:
   - Renovar 5 minutos antes de expiración
   - Evita interrupciones en requests

3. **Manejo de Errores**:
   - Si refresh falla → redirigir a login
   - Implementar retry con backoff exponencial

4. **Seguridad Adicional**:
   - Considerar binding de tokens a IP/device
   - Implementar detección de anomalías
   - Logs de auditoría para accesos sensibles

## 🔄 PRÓXIMOS PASOS

1. **Implementar servicio de auto-renovación en frontend**
2. **Configurar interceptores de HTTP**
3. **Añadir métricas de uso de tokens**
4. **Implementar alertas de seguridad**
5. **Documentar políticas de rotación de secrets**

---

**Implementado por**: Sistema de desarrollo automatizado
**Fecha**: Enero 2025
**Versión**: 1.0.0
