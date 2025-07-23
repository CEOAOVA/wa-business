# 🔒 Template de Variables de Entorno - Producción

## Configuración de Seguridad para WhatsApp Business Platform

Este archivo contiene todas las variables de entorno necesarias para un despliegue seguro en producción.

```bash
# ============================================
# WHATSAPP BUSINESS PLATFORM - PRODUCCIÓN
# ============================================

# Información del entorno
NODE_ENV=production
PORT=3002
APP_VERSION=1.0.0
SERVER_NAME=whatsapp-business-prod

# ============================================
# WHATSAPP BUSINESS API (CRÍTICO)
# ============================================
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here
WHATSAPP_APP_SECRET=your_app_secret_here
WHATSAPP_API_VERSION=v22.0
WHATSAPP_BASE_URL=https://graph.facebook.com

# ============================================
# OPENROUTER AI (CRÍTICO)
# ============================================
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-06-17
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ============================================
# AUTENTICACIÓN RESTRINGIDA (CRÍTICO)
# ============================================
# Lista de emails autorizados separados por comas
AUTHORIZED_USERS=moises.s@aova.mx,k.alvarado@aova.mx,elisa.n@synaracare.com

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
JWT_EXPIRES_IN=8h

# Contraseña temporal para usuarios autorizados
TEMP_PASSWORD=aova2024_secure_password

# ============================================
# CORS RESTRICTIVO (CRÍTICO)
# ============================================
CORS_ORIGINS=https://dev-waprueba.aova.mx
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true

# ============================================
# WEBHOOK SECURITY
# ============================================
WEBHOOK_URL=https://dev-apiwaprueba.aova.mx/api/chat/webhook
WEBHOOK_PATH=/api/chat/webhook
ENABLE_WEBHOOK_SIGNATURE=true
ENABLE_DETAILED_LOGS=false

# ============================================
# RATE LIMITING
# ============================================
# Rate limiting general
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Rate limiting para autenticación (más restrictivo)
RATE_LIMIT_AUTH_WINDOW=300000
RATE_LIMIT_AUTH_MAX=5

# Rate limiting para webhooks (más permisivo)
RATE_LIMIT_WEBHOOK_WINDOW=60000
RATE_LIMIT_WEBHOOK_MAX=200

# ============================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================
# Headers de seguridad
SECURITY_CSP=true
SECURITY_HSTS=true
SECURITY_FRAMEGUARD=true
SECURITY_XSS=true
SECURITY_NO_SNIFF=true

# ============================================
# SERVIDOR Y FRONTEND
# ============================================
FRONTEND_URL=https://dev-waprueba.aova.mx
HOSTNAME=0.0.0.0

# ============================================
# LOGGING Y MONITOREO
# ============================================
LOG_LEVEL=info
ENABLE_DETAILED_LOGS=false
ENABLE_SECURITY_LOGGING=true

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_CHATBOT_ENABLED=true
FEATURE_AGENT_REASSIGNMENT=true
FEATURE_WEBHOOK_VALIDATION=true

# ============================================
# CONFIGURACIÓN AVANZADA
# ============================================
# Timeouts
REQUEST_TIMEOUT=30000
WEBHOOK_TIMEOUT=10000

# Límites de memoria y procesamiento
MAX_CONCURRENT_CONVERSATIONS=100
CONVERSATION_TIMEOUT=1800000
```

## 🔐 Variables Críticas

### **NUNCA deben estar hardcodeadas o expuestas:**

1. **`WHATSAPP_ACCESS_TOKEN`** - Token de acceso de WhatsApp Business API
2. **`WHATSAPP_APP_SECRET`** - Secreto de la aplicación para verificación HMAC
3. **`OPENROUTER_API_KEY`** - Clave de API de OpenRouter
4. **`JWT_SECRET`** - Secreto para firmar tokens JWT (mínimo 256 bits)
5. **`AUTHORIZED_USERS`** - Lista de usuarios que pueden acceder
6. **`TEMP_PASSWORD`** - Contraseña temporal para usuarios autorizados

## 🛡️ Configuración de Seguridad

### **Autenticación Restringida**

```bash
# Solo estos usuarios pueden acceder
AUTHORIZED_USERS=admin@aova.mx,agente1@aova.mx,agente2@aova.mx

# Contraseña temporal (cambiar regularmente)
TEMP_PASSWORD=aova2024_secure_password

# JWT con expiración corta
JWT_EXPIRES_IN=8h
```

### **CORS Super Restrictivo**

```bash
# Solo tu dominio puede hacer requests
CORS_ORIGINS=https://dev-waprueba.aova.mx
```

### **Rate Limiting Agresivo**

```bash
# Autenticación: 5 intentos por 5 minutos
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW=300000

# General: 100 requests por minuto
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚨 Checklist de Seguridad Pre-Despliegue

### **✅ Variables Obligatorias**
- [ ] `WHATSAPP_ACCESS_TOKEN` - Token de WhatsApp Business
- [ ] `WHATSAPP_PHONE_NUMBER_ID` - ID del número de teléfono
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Token de verificación del webhook
- [ ] `WHATSAPP_APP_SECRET` - Secreto de la aplicación
- [ ] `OPENROUTER_API_KEY` - Clave de OpenRouter
- [ ] `AUTHORIZED_USERS` - Lista de usuarios autorizados
- [ ] `JWT_SECRET` - Secreto JWT (256 bits mínimo)
- [ ] `CORS_ORIGINS` - Dominio autorizado
- [ ] `TEMP_PASSWORD` - Contraseña temporal

### **⚠️ Configuración de Seguridad**
- [ ] `NODE_ENV=production` - Ambiente de producción
- [ ] `ENABLE_WEBHOOK_SIGNATURE=true` - Verificación HMAC
- [ ] `ENABLE_DETAILED_LOGS=false` - Logs resumidos
- [ ] HTTPS configurado en el servidor
- [ ] Certificado SSL válido
- [ ] Firewall configurado

### **🔧 Configuración Opcional**
- [ ] Rate limiting personalizado
- [ ] Logging de seguridad
- [ ] Monitoreo de errores
- [ ] Backup de configuración

## 🔑 Generación de Secretos

```bash
# JWT Secret (256 bits)
openssl rand -base64 32

# Contraseña temporal
openssl rand -base64 16

# Webhook verify token
openssl rand -hex 32
```

## 🚀 Comandos de Despliegue

```bash
# 1. Copiar template
cp PRODUCTION_ENV_TEMPLATE.md backend/.env

# 2. Editar con valores reales
nano backend/.env

# 3. Validar configuración
npm run config:validate

# 4. Iniciar en producción
npm run start
```

## ⚠️ Notas Importantes

1. **NUNCA** commitees archivos `.env` con valores reales
2. **Rota secretos** cada 90 días
3. **Mantén actualizada** la lista de `AUTHORIZED_USERS`
4. **Usa HTTPS** siempre en producción
5. **Configura el webhook** de Meta con verificación HMAC
6. **Monitorea logs** de seguridad regularmente

## 🔒 Flujo de Autenticación

1. Usuario intenta acceder con email/password
2. Sistema verifica si el email está en `AUTHORIZED_USERS`
3. Si está autorizado, valida la contraseña temporal
4. Genera JWT token con expiración de 8 horas
5. Usuario puede acceder con el token
6. Token se renueva automáticamente si sigue activo

## 📞 Soporte

Para configurar estas variables en tu VPS o si necesitas ayuda con la seguridad, contacta al equipo de desarrollo. 