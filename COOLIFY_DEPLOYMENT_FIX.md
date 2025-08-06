# Corrección de Despliegue en Coolify - WhatsApp Business

## Problema Identificado
El error "no available server" se debe a conflictos entre la configuración interna de Nginx del frontend y Traefik que maneja el enrutamiento en Coolify.

## Cambios Realizados

### 1. Actualización de nginx.conf del Frontend
Se simplificó el archivo `frontend/nginx.conf` para que solo sirva archivos estáticos sin intentar hacer proxy al backend. El proxy ahora es manejado completamente por Traefik.

**Cambios principales:**
- Eliminadas las secciones de proxy (`location /api/` y `location /socket.io/`)
- El frontend ahora sirve solo archivos estáticos
- Las llamadas al API se hacen directamente a `https://dev-apiwaprueba.aova.mx`

### 2. Actualización de docker-compose.coolify.yml
Se limpiaron las configuraciones obsoletas:
- Eliminado el archivo `nginx.conf1` no utilizado
- Removidas las secciones `ports`, `links` y `depends_on` innecesarias
- Removidas las variables de entorno específicas de Nginx (`NGINX_HOST`, `NGINX_PORT`)
- Agregados valores por defecto para las URLs del backend en el frontend

### 3. Variables de Entorno Importantes

#### Backend (puerto 3002):
```yaml
- PORT=3002
- FRONTEND_URL=${FRONTEND_URL:-https://dev-waprueba.aova.mx}
- BACKEND_URL=${BACKEND_URL:-https://dev-apiwaprueba.aova.mx}
```

#### Frontend (puerto 80):
```yaml
- PORT=80
- VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://dev-apiwaprueba.aova.mx}
- VITE_API_URL=${VITE_API_URL:-https://dev-apiwaprueba.aova.mx}
```

## Configuración en Coolify

### Variables de Entorno Requeridas
Asegúrate de configurar estas variables en Coolify:

1. **URLs del Sistema:**
   - `FRONTEND_URL=https://dev-waprueba.aova.mx`
   - `BACKEND_URL=https://dev-apiwaprueba.aova.mx`
   - `VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx`
   - `VITE_API_URL=https://dev-apiwaprueba.aova.mx`

2. **WhatsApp Business API:**
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WEBHOOK_VERIFY_TOKEN`
   - `WEBHOOK_URL=https://dev-apiwaprueba.aova.mx/api/chat/webhook`
   - `WHATSAPP_APP_SECRET`

3. **Base de Datos (Supabase):**
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE`
   - `VITE_SUPABASE_URL` (para el frontend)
   - `VITE_SUPABASE_ANON_KEY` (para el frontend)

4. **APIs Externas:**
   - `OPEN_ROUTER_API_KEY`
   - `API_NINJAS_KEY`
   - `EMBLER_WSDL_URL`
   - `EMBLER_ENDPOINT_URL`

5. **Autenticación:**
   - `JWT_SECRET`
   - `AUTHORIZED_USERS`

## Verificación del Despliegue

### 1. Después del despliegue, verifica:
- Frontend: https://dev-waprueba.aova.mx (debe mostrar la interfaz)
- Backend Health: https://dev-apiwaprueba.aova.mx/health
- Backend API: https://dev-apiwaprueba.aova.mx/api/status

### 2. En los logs de Coolify, busca:
- Backend: `🚀 Servidor ejecutándose en puerto 3002`
- Frontend: `nginx: ready to accept connections`

### 3. Si hay problemas, revisa:
- Que todas las variables de entorno estén configuradas
- Que los certificados SSL estén activos
- Que no haya conflictos de puertos

## Arquitectura de Red

```
Internet
    ↓
Traefik (Reverse Proxy de Coolify)
    ├── dev-waprueba.aova.mx → Frontend (Nginx:80)
    └── dev-apiwaprueba.aova.mx → Backend (Express:3002)
```

El frontend hace llamadas directas a `https://dev-apiwaprueba.aova.mx` para comunicarse con el backend.

## Notas Importantes

1. **NO uses proxy interno en Nginx** - Traefik maneja todo el enrutamiento
2. **Las URLs deben ser HTTPS** - Traefik proporciona los certificados SSL
3. **El backend debe escuchar en 0.0.0.0:3002** - Ya está configurado con `HOSTNAME=0.0.0.0`
4. **CORS está configurado** - El backend acepta peticiones desde el dominio del frontend

## Comandos Útiles

### Para verificar los contenedores:
```bash
docker ps
docker logs [container_id]
```

### Para verificar la conectividad:
```bash
curl https://dev-apiwaprueba.aova.mx/health
curl https://dev-waprueba.aova.mx/health
```
