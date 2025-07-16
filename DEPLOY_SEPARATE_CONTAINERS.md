# Deployment Separado - Backend y Frontend

Esta configuración permite deployar el backend y frontend en **contenedores independientes** en Coolify para mejor mantenimiento y debugging.

## 📁 Estructura de archivos

```
wa-business1/
├── backend/
│   ├── docker-compose.yml    # ✅ Contenedor independiente del backend
│   ├── Dockerfile
│   └── src/...
├── frontend/
│   ├── docker-compose.yml    # ✅ Contenedor independiente del frontend
│   ├── Dockerfile
│   └── src/...
└── docker-compose.coolify.yml # ❌ Ya no usar (archivo antiguo)
```

## 🚀 Pasos para deployar

### 1. **Backend (API de WhatsApp)**

1. En **Coolify**, crea un **nuevo proyecto/aplicación**:
   - **Name**: `wa-business-backend`
   - **Git Repository**: Mismo repo
   - **Root Directory**: `/backend` ⚠️ **IMPORTANTE**
   - **Build Pack**: Docker Compose

2. **Variables de entorno** requeridas:
   ```
   WHATSAPP_ACCESS_TOKEN=tu_token_aqui
   WHATSAPP_PHONE_NUMBER_ID=tu_phone_id
   WEBHOOK_VERIFY_TOKEN=tu_token_secreto
   DATABASE_URL=file:./prisma/whatsapp.db
   OPEN_ROUTER_API_KEY=tu_openrouter_key
   JWT_SECRET=tu_jwt_secret_aqui
   ```

3. **Dominio**: `dev-apiwaprueba.aova.mx`

### 2. **Frontend (Panel de React)**

1. En **Coolify**, crea otro **nuevo proyecto/aplicación**:
   - **Name**: `wa-business-frontend`
   - **Git Repository**: Mismo repo
   - **Root Directory**: `/frontend` ⚠️ **IMPORTANTE**
   - **Build Pack**: Docker Compose

2. **Variables de entorno**:
   ```
   VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx
   ```

3. **Dominio**: `dev-waprueba.aova.mx`

## ✅ Ventajas de esta arquitectura

- **🔍 Debugging más fácil**: Los logs están separados por servicio
- **🔄 Deployments independientes**: Puedes actualizar solo backend o frontend
- **📊 Monitoreo granular**: Cada servicio tiene sus propias métricas
- **🛠️ Configuración específica**: Cada servicio tiene sus propias variables de entorno
- **🚨 Troubleshooting simplificado**: Problemas aislados por servicio

## 🧪 Testing

### Backend:
```bash
curl https://dev-apiwaprueba.aova.mx/api/chat/webhook/debug
```

### Frontend:
```bash
curl https://dev-waprueba.aova.mx
```

## 📝 Notas importantes

1. **Root Directory**: Asegúrate de configurar el directorio raíz correcto en Coolify:
   - Backend: `/backend`
   - Frontend: `/frontend`

2. **Variables de entorno**: Cada servicio tiene sus propias variables. NO copies todas las variables a ambos servicios.

3. **Dominios SSL**: Ambos servicios usan el mismo cert resolver (`myresolver`) configurado en Traefik.

4. **Health Checks**: Ambos contenedores incluyen health checks para monitoreo automático.

## 🔧 Troubleshooting

Si un servicio no funciona:

1. **Verifica logs específicos** del servicio en Coolify
2. **Confirma variables de entorno** requeridas
3. **Revisa el dominio DNS** apunta a la IP correcta
4. **Redeploy con force rebuild** si es necesario

## 🔄 Para volver al deployment combinado

Si quieres regresar al archivo `docker-compose.coolify.yml` unificado:

1. Elimina los proyectos separados en Coolify
2. Crea un nuevo proyecto apuntando al root del repositorio
3. Usa el archivo `docker-compose.coolify.yml` 