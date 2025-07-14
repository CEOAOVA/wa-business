# 🐳 Docker Coolify - WhatsApp Business Platform

## 📋 Resumen

He creado un sistema Docker optimizado para Coolify deployment:

- ✅ **Configuración para Coolify** (`docker-compose.coolify.yml`)
- ✅ **Integración con Supabase** (sin bases de datos locales)
- ✅ **SSL automático** con Traefik
- ✅ **Variables de entorno** para producción

## 🚀 Deployment con Coolify

### Configuración en Coolify Dashboard

1. **Crear nuevo proyecto** en Coolify
2. **Importar repositorio** Git
3. **Configurar variables de entorno** usando `coolify.env.example`
4. **Deploy automático** con SSL

### URLs de Deployment

- **Frontend:** https://dev-waprueba.aova.mx
- **Backend:** https://dev-apiwaprueba.aova.mx
- **Webhook:** https://dev-apiwaprueba.aova.mx/api/chat/webhook

## 📁 Estructura de Archivos

```
wa-business/
├── docker-compose.coolify.yml  # Configuración Coolify ✨
├── coolify.env.example         # Variables para Coolify ✨
├── backend/
│   ├── Dockerfile
│   └── src/...
└── frontend/
    ├── Dockerfile
    └── src/...
```

## ⚙️ Configuración para Coolify

### 1. Variables de Entorno Críticas

**En Coolify Dashboard, configurar:**
```bash
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=tu_token_real
WHATSAPP_PHONE_NUMBER_ID=tu_id_real
WEBHOOK_VERIFY_TOKEN=tu_token_real

# OpenRouter AI
OPEN_ROUTER_API_KEY=tu_api_key_real

# Supabase (Base de datos)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_key_real

# Seguridad
JWT_SECRET=genera_256_bits_seguros
CORS_ORIGINS=https://dev-waprueba.aova.mx
```

### 2. ¿Por qué NO hay bases de datos locales?

**Porque usas SUPABASE:**
- ✅ Base de datos en la nube
- ✅ Escalable automáticamente  
- ✅ Backup automático
- ✅ No necesitas PostgreSQL/SQLite local

**En `frontend/.env.local`:**
```bash
VITE_BACKEND_URL=http://localhost:3002
```

## 📊 Servicios Incluidos

### Modo Desarrollo (`docker-compose.dev.yml`)
| Servicio | Puerto | Descripción | Hot Reload |
|----------|--------|-------------|------------|
| backend | 3002 | Node.js + Express | ✅ |
| frontend | 5173 | Vite dev server | ✅ |

### Modo Producción (`docker-compose.yml`)
| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| backend | 3002 | Node.js + Express |
| frontend | 80 | Nginx + React build |
## 🚀 Pasos para Deployment en Coolify

### 1. Configurar Proyecto en Coolify
```bash
1. Crear nuevo proyecto en Coolify dashboard
2. Conectar repositorio Git
3. Seleccionar docker-compose.coolify.yml
4. Configurar variables de entorno (ver coolify.env.example)
```

### 2. Variables Críticas a Configurar
```bash
# En Coolify dashboard > Environment Variables:
WHATSAPP_ACCESS_TOKEN=tu_token_de_meta
WHATSAPP_PHONE_NUMBER_ID=tu_id_de_whatsapp  
WEBHOOK_VERIFY_TOKEN=tu_token_de_verificacion
OPEN_ROUTER_API_KEY=tu_key_de_openrouter
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_key_de_supabase
JWT_SECRET=tu_secreto_jwt_256_bits
CORS_ORIGINS=https://dev-waprueba.aova.mx
```

### 3. Deploy Automático
- Coolify detecta cambios en Git
- Build automático con Docker
- SSL automático con Let's Encrypt  
- Monitoring incluido

## 🔧 Configuración de WhatsApp

### Webhook Configuration
```bash
# En Meta for Developers console:
Callback URL: https://dev-apiwaprueba.aova.mx/api/chat/webhook
Verify Token: [usar mismo valor de WEBHOOK_VERIFY_TOKEN]
```

## 🌐 URLs Finales

- **Frontend:** https://dev-waprueba.aova.mx
- **Backend API:** https://dev-apiwaprueba.aova.mx  
- **Webhook:** https://dev-apiwaprueba.aova.mx/api/chat/webhook
- **Health Check:** https://dev-apiwaprueba.aova.mx/health

## ✅ Beneficios de esta Configuración

- 🚀 **Deployment automático** con Coolify
- 🔒 **SSL automático** con Traefik 
- 📊 **Monitoring incluido** 
- 🗄️ **Supabase** como base de datos (sin mantenimiento)
- ⚡ **Escalable** automáticamente
- 🔧 **Sin configuración de servidor** manual

## 🔍 Diferencias Clave vs Configuración Anterior

### ❌ Lo que YA NO tienes:
- PostgreSQL local (innecesario)
- SQLite local (innecesario)  
- Scripts start.sh/stop.sh (innecesarios)
- Variables de base de datos local

### ✅ Lo que SÍ tienes ahora:
- Supabase como base de datos
- Coolify para deployment
- SSL automático
- Dominios configurados (dev-waprueba.aova.mx / dev-apiwaprueba.aova.mx)
- Variables de entorno específicas del negocio

## 🎯 Próximos Pasos

1. **Configurar variables** en Coolify dashboard
2. **Obtener credenciales** de WhatsApp Business API
3. **Deploy** desde Coolify
4. **Configurar webhook** en Meta for Developers
5. **Probar** la integración completa
# Arreglar permisos de uploads
sudo chown -R $USER:$USER backend/uploads
chmod -R 755 backend/uploads
```

## 📍 URLs de Acceso

### Desarrollo
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3002
- **Health Check:** http://localhost:3002/health

### Producción
- **Frontend:** http://localhost:80
- **Backend:** http://localhost:3002
- **Base de Datos:** localhost:5432

## 🔐 Credenciales por Defecto

- **Login:** admin@embler.com / admin123
- **DB User:** wa_admin
- **DB Password:** secure_password_2024

## 🎯 Próximos Pasos

1. **Configurar variables** de entorno
2. **Probar en desarrollo** con hot reload
3. **Configurar webhook** de WhatsApp
4. **Desplegar en VPS** con modo producción

¿Listo para empezar? 

**Linux/Mac:** `./start.sh dev`  
**Windows:** `start.bat dev`  

🚀 