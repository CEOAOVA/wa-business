# Template de Variables de Entorno - Backend Producción

Crea un archivo `.env` en `/backend/` con estas variables:

```env
# ========================================
# CONFIGURACIÓN DE PRODUCCIÓN - BACKEND
# WhatsApp Business Platform
# ========================================

# SERVIDOR
NODE_ENV=production
PORT=3002
BACKEND_URL=https://dev-apiwaprueba.aova.mx
PUBLIC_URL=https://dev-apiwaprueba.aova.mx
FRONTEND_URL=https://dev-waprueba.aova.mx

# CORS - Dominios permitidos (separados por comas)
CORS_ORIGINS=https://dev-waprueba.aova.mx

# SEGURIDAD - JWT
JWT_SECRET=0734dffd486441b8dbeccb586dfcce4cc749643b289357d736d13b2e7e8d2d0a
JWT_EXPIRES_IN=8h

# AUTENTICACIÓN RESTRINGIDA
AUTHORIZED_USERS=admin@aova.mx,agente1@aova.mx,agente2@aova.mx
TEMP_PASSWORD=aova2024_secure

# WHATSAPP BUSINESS API
WHATSAPP_ACCESS_TOKEN=tu_token_de_meta_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui
WEBHOOK_VERIFY_TOKEN=tu_webhook_verify_token_aqui
WEBHOOK_URL=https://dev-apiwaprueba.aova.mx/api/chat/webhook
WHATSAPP_APP_SECRET=tu_app_secret_para_hmac_aqui

# CONFIGURACIÓN DE WEBHOOK
WEBHOOK_PATH=/api/chat/webhook
ENABLE_WEBHOOK_SIGNATURE=true

# RATE LIMITING
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# LOGGING
ENABLE_DETAILED_LOGS=false

# BASE DE DATOS (Si usas Supabase)
USE_SUPABASE=true
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
```