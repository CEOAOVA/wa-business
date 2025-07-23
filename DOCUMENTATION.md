# 📚 Documentación Consolidada - WhatsApp Business Platform

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Autenticación](#autenticación)
3. [Variables de Entorno](#variables-de-entorno)
4. [Despliegue](#despliegue)
5. [Docker](#docker)
6. [Chatbot IA](#chatbot-ia)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Configuración Inicial

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Git

### Instalación Rápida

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd whtsppbsnss

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar variables de entorno
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# 4. Ejecutar en desarrollo
cd backend && npm run dev
cd ../frontend && npm run dev
```

### URLs de Desarrollo
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3002
- **API:** http://localhost:3002/api

---

## 🔐 Autenticación

### Credenciales de Acceso

| Usuario | Email | Contraseña | Rol | Vista Destino |
|---------|-------|------------|-----|---------------|
| **Admin** | `moises.s@aova.mx` | `Admin2024!` | Admin | `/admin/dashboard` |
| **Agente 1** | `k.alvarado@aova.mx` | `Agente2024!` | Agent | `/chats` |
| **Agente 2** | `elisa.n@synaracare.com` | `Agente2024!` | Agent | `/chats` |

### Características del Sistema
- ✅ **Login con email** (no username)
- ✅ **Redirección automática** según el rol del usuario
- ✅ **Panel de administración** para gestionar usuarios
- ✅ **Protección de rutas** basada en roles
- ✅ **Integración completa** con Supabase

### Configuración de Supabase
```bash
# Obtener Service Role Key
# 1. Ir a https://supabase.com/dashboard/project/[tu-proyecto]/settings/api
# 2. Crear nueva "Secret Key"
# 3. Agregar al archivo .env:
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tu_clave_aqui
```

---

## 🔑 Variables de Entorno

### Backend (.env)

```env
# ============================================
# CONFIGURACIÓN BÁSICA
# ============================================
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:5173

# ============================================
# SUPABASE (BASE DE DATOS)
# ============================================
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# ============================================
# JWT (AUTENTICACIÓN)
# ============================================
JWT_SECRET=tu_jwt_secret_super_seguro_256_bits
JWT_EXPIRES_IN=8h

# ============================================
# WHATSAPP BUSINESS API
# ============================================
WHATSAPP_ACCESS_TOKEN=tu_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WEBHOOK_VERIFY_TOKEN=tu_webhook_verify_token
WHATSAPP_API_VERSION=v22.0
WHATSAPP_BASE_URL=https://graph.facebook.com

# ============================================
# OPENROUTER AI (CHATBOT)
# ============================================
OPENROUTER_API_KEY=sk-or-v1-tu_openrouter_api_key
OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-06-17
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ============================================
# CORS Y SEGURIDAD
# ============================================
CORS_ORIGINS=http://localhost:5173
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
ENABLE_DETAILED_LOGS=false
```

### Frontend (.env.local)

```env
# ============================================
# CONFIGURACIÓN FRONTEND
# ============================================
VITE_BACKEND_URL=http://localhost:3002
VITE_APP_NAME=WhatsApp Business Platform
VITE_APP_VERSION=1.0.0

# ============================================
# WEBSOCKET (OPCIONAL)
# ============================================
VITE_WS_URL=ws://localhost:3002
```

### Variables Críticas para Producción

```env
# URLs de producción
FRONTEND_URL=https://dev-waprueba.aova.mx
CORS_ORIGINS=https://dev-waprueba.aova.mx

# Seguridad adicional
ENABLE_WEBHOOK_SIGNATURE=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Despliegue

### Opción 1: Docker (Recomendado)

```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Producción
docker-compose up --build -d
```

### Opción 2: Coolify (Cloud)

1. **Configurar proyecto en Coolify**
2. **Importar repositorio Git**
3. **Usar `docker-compose.coolify.yml`**
4. **Configurar variables de entorno**

### Opción 3: VPS Manual

```bash
# 1. Configurar Nginx
# 2. Configurar SSL con Let's Encrypt
# 3. Usar PM2 para el backend
# 4. Build del frontend con Nginx

# Ver DEPLOY_GUIDE.md para instrucciones detalladas
```

---

## 🐳 Docker

### Configuración Disponible

- **`docker-compose.yml`** - Producción completa
- **`docker-compose.dev.yml`** - Desarrollo con hot reload
- **`docker-compose.coolify.yml`** - Optimizado para Coolify

### Comandos Útiles

```bash
# Construir y ejecutar
docker-compose up --build

# Solo desarrollo
docker-compose -f docker-compose.dev.yml up

# Ver logs
docker-compose logs -f backend

# Parar servicios
docker-compose down

# Limpiar volúmenes
docker-compose down -v
```

### Variables de Entorno para Docker

```env
# En Coolify o docker-compose.override.yml
WHATSAPP_ACCESS_TOKEN=tu_token_real
WHATSAPP_PHONE_NUMBER_ID=tu_id_real
WEBHOOK_VERIFY_TOKEN=tu_token_real
OPENROUTER_API_KEY=tu_api_key_real
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_key_real
SUPABASE_SERVICE_ROLE_KEY=tu_key_real
JWT_SECRET=genera_256_bits_seguros
CORS_ORIGINS=https://dev-waprueba.aova.mx
```

---

## 🤖 Chatbot IA

### Configuración

1. **Obtener API Key de OpenRouter**
   - Ve a [OpenRouter.ai](https://openrouter.ai/keys)
   - Crea cuenta gratuita
   - Genera API key
   - Agrega a `backend/.env`

2. **Probar Chatbot**
   - Ve a `http://localhost:5173` → WhatsApp Test
   - Configura número: `5549679734`
   - Mensaje: `"Necesito pastillas de freno para mi Toyota Corolla 2018"`
   - Usa **🤖 Probar Respuesta de IA**

### Endpoints Disponibles

- `POST /api/chatbot/send-message` - Generar IA + enviar WhatsApp
- `POST /api/chatbot/test-ai` - Solo probar respuesta de IA
- `POST /api/chatbot/process-webhook` - Simular webhook automático
- `GET /api/chatbot/conversation/:phone` - Ver conversación
- `GET /api/chatbot/stats` - Estadísticas del chatbot

### Características del Chatbot

- ✅ **Especialización**: Repuestos automotrices
- ✅ **Recopilación Inteligente**: Extrae múltiples datos de una respuesta
- ✅ **Contexto Persistente**: Recuerda información previa
- ✅ **Respuestas Naturales**: Conversacional, no robótico
- ✅ **Integración WhatsApp**: Envío automático de respuestas

---

## 🔧 Troubleshooting

### Problemas Comunes

#### Error: "Cannot connect to backend"
```bash
# Verificar que el backend esté corriendo
docker-compose ps
docker-compose logs backend

# Verificar puerto
netstat -tulpn | grep :3002
```

#### Error: "OpenRouter API key not found"
```bash
# Verificar que la API key esté configurada EN EL BACKEND
grep OPENROUTER_API_KEY backend/.env

# ✅ CORRECTO: API key en backend/.env
# ❌ INCORRECTO: API key en frontend (riesgo de seguridad)
```

#### Error: "Database connection failed"
```bash
# Verificar Supabase
curl https://tu-proyecto.supabase.co/rest/v1/

# Verificar variables de entorno
grep SUPABASE backend/.env
```

#### Error: "JWT secret not configured"
```bash
# Generar JWT secret seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Agregar a backend/.env
JWT_SECRET=tu_jwt_secret_generado
```

### Logs y Debugging

```bash
# Ver logs del backend
cd backend
npm run dev

# Ver logs de Docker
docker-compose logs -f backend

# Ver logs de Nginx (producción)
sudo tail -f /var/log/nginx/error.log
```

### Verificación de Salud

```bash
# Backend health check
curl http://localhost:3002/health

# Frontend
curl http://localhost:5173

# API endpoints
curl http://localhost:3002/api/chatbot/stats
```

---

## 📚 Documentación Adicional

- [`INITIAL.md`](./INITIAL.md) - Especificaciones detalladas del proyecto
- [`DEPLOY_GUIDE.md`](./DEPLOY_GUIDE.md) - Guía de despliegue detallada
- [`DOCKER_COMPOSE_README.md`](./DOCKER_COMPOSE_README.md) - Docker con Coolify
- [`PRODUCTION_ENV_TEMPLATE.md`](./PRODUCTION_ENV_TEMPLATE.md) - Variables de producción
- [`AUTHENTICACION_EMAIL_COMPLETADA.md`](./AUTHENTICACION_EMAIL_COMPLETADA.md) - Autenticación
- [`LOGIN_MULTIPLE_CREDENTIALS_COMPLETADO.md`](./LOGIN_MULTIPLE_CREDENTIALS_COMPLETADO.md) - Credenciales múltiples

---

## ⚠️ Notas Importantes

- **Cumplimiento Meta**: Este sistema usa exclusivamente la API oficial de WhatsApp Cloud
- **No librerías no oficiales**: No se utilizan librerías como WhatsApp Web.js, Baileys o similares
- **Contexto de conversación**: El chatbot mantiene el contexto de cada conversación
- **Re-asignación automática**: Sistema de transferencia temporal por inactividad del agente
- **Integración ERP**: Conexión con Microsip vía métodos SOAP para datos empresariales 