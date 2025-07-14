# Template de Variables de Entorno - Frontend Producción

Crea un archivo `.env` en `/frontend/` con estas variables:

```env
# ========================================
# CONFIGURACIÓN DE PRODUCCIÓN - FRONTEND
# WhatsApp Business Platform
# ========================================

# URL del Backend API
VITE_BACKEND_URL=https://dev-apiwaprueba.aova.mx

# Configuración de la aplicación
VITE_APP_NAME=WhatsApp Business Panel
VITE_APP_VERSION=1.0.0

# Configuración de WebSocket (si se usa)
VITE_WS_URL=wss://dev-apiwaprueba.aova.mx

# Configuración de ambiente
VITE_NODE_ENV=production

# URLs de recursos (si es necesario)
VITE_PUBLIC_URL=https://dev-waprueba.aova.mx

# Configuración de logging (opcional)
VITE_ENABLE_CONSOLE_LOGS=false
```

## Notas Importantes:

1. **VITE_BACKEND_URL** debe apuntar al dominio del backend
2. **Todas las variables deben empezar con `VITE_`** para ser accesibles en el navegador
3. **NO incluyas secretos** en el frontend (son visibles públicamente)
4. **VITE_WS_URL** para WebSocket debe usar `wss://` en producción

## URLs de Despliegue:
- **Frontend:** https://dev-waprueba.aova.mx
- **Backend API:** https://dev-apiwaprueba.aova.mx
- **WebSocket:** wss://dev-apiwaprueba.aova.mx

## Comandos para Build:
```bash
# En el directorio frontend/
npm run build

# Los archivos compilados estarán en frontend/dist/
``` 