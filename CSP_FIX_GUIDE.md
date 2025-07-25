# 🔒 Guía de Solución de Problemas CSP - WhatsApp Business Platform

## 🚨 Problema: Content Security Policy Error

### Error Típico
```
Error en login: TypeError: Failed to fetch. Refused to connect because it violates the document's Content Security Policy.
```

### 🔍 Diagnóstico

El error ocurre porque:
1. **Frontend intenta conectar a `localhost:3002`** desde el navegador
2. **CSP bloquea conexiones HTTP** en producción
3. **URLs mal configuradas** en variables de entorno

## ✅ Solución Paso a Paso

### 1. Verificar Variables de Entorno en Coolify

En el dashboard de Coolify, asegúrate de que estas variables estén configuradas:

```bash
# Frontend Environment Variables
VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx

# Backend Environment Variables  
CORS_ORIGINS=https://dev-waprueba.aova.mx
NODE_ENV=production
```

### 2. Verificar Configuración CSP

#### Frontend CSP (Docker)
```yaml
# En docker-compose.coolify.yml
- "traefik.http.middlewares.frontend-csp.headers.contentSecurityPolicy=default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https: wss: https://dev-apiwaprueba.aova.mx; font-src 'self' https:; object-src 'none';"
```

#### Backend CSP (Helmet)
```typescript
// En backend/src/middleware/security.ts
connectSrc: ["'self'", "https://api.openrouter.ai", "https://graph.facebook.com", "https://dev-waprueba.aova.mx"]
```

### 3. Ejecutar Script de Verificación

```bash
# En el directorio backend
node check-config.js
```

### 4. Reiniciar Aplicación en Coolify

1. Ve al dashboard de Coolify
2. Encuentra tu aplicación
3. Haz clic en "Redeploy" o "Restart"
4. Espera a que termine el despliegue

### 5. Verificar en el Navegador

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca errores de CSP
4. Verifica que las peticiones vayan a HTTPS

## 🔧 Configuración Correcta

### URLs de Producción
- **Frontend:** https://dev-waprueba.aova.mx
- **Backend:** https://dev-apiwaprueba.aova.mx
- **API:** https://dev-apiwaprueba.aova.mx/api

### Variables Críticas
```bash
# Frontend
VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx

# Backend
CORS_ORIGINS=https://dev-waprueba.aova.mx
NODE_ENV=production
FRONTEND_URL=https://dev-waprueba.aova.mx
```

## 🚨 Problemas Comunes

### 1. "localhost:3002" en Producción
**Síntoma:** Las peticiones van a localhost
**Solución:** Verificar `VITE_BACKEND_URL` en Coolify

### 2. CSP Bloquea Conexiones
**Síntoma:** Error de CSP en consola
**Solución:** Verificar configuración CSP en Docker

### 3. CORS Error
**Síntoma:** Error de CORS en consola
**Solución:** Verificar `CORS_ORIGINS` en backend

### 4. Mixed Content
**Síntoma:** HTTP en HTTPS
**Solución:** Asegurar que todas las URLs sean HTTPS

## 📋 Checklist de Verificación

- [ ] `VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx`
- [ ] `CORS_ORIGINS=https://dev-waprueba.aova.mx`
- [ ] `NODE_ENV=production`
- [ ] CSP incluye `https://dev-apiwaprueba.aova.mx`
- [ ] Todas las URLs son HTTPS
- [ ] Aplicación redeployada en Coolify
- [ ] Sin errores en consola del navegador

## 🔍 Debugging

### Verificar Variables en Coolify
```bash
# En el dashboard de Coolify
1. Ve a tu aplicación
2. Haz clic en "Environment Variables"
3. Verifica que VITE_BACKEND_URL esté configurada
```

### Verificar Logs
```bash
# En Coolify dashboard
1. Ve a tu aplicación
2. Haz clic en "Logs"
3. Busca errores de conexión
```

### Verificar en Navegador
```javascript
// En la consola del navegador
console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL);
```

## 📞 Soporte

Si el problema persiste:
1. Ejecuta `node check-config.js`
2. Revisa los logs en Coolify
3. Verifica la configuración de red
4. Contacta al equipo de desarrollo

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0.0 