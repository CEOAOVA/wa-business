# WhatsApp Business Platform

Una plataforma tipo "WhatsApp Web personalizada" para empresas, donde cada agente se conecta con su cuenta a un panel web y responde mensajes de clientes a través de su propio número de WhatsApp Business, usando exclusivamente la API oficial de WhatsApp Cloud (de Meta).

## 📋 Documento de Referencia

**IMPORTANTE**: Este proyecto debe seguir siempre las especificaciones detalladas en [`INITIAL.md`](./INITIAL.md). Este documento contiene los requerimientos fundamentales del sistema y debe ser consultado en cada fase del desarrollo.

## 🎯 Características Principales

### Sistema de Agentes
- Cada agente tiene un número empresarial de WhatsApp verificado
- Autenticación individual con credenciales únicas
- Panel web tipo WhatsApp Web para gestión de conversaciones
- Sistema de re-asignación automática por inactividad (10 minutos)

### Chatbot Inteligente ✅ IMPLEMENTADO
- ✅ Respuestas automáticas iniciales a clientes
- ✅ Recopilación de datos para cotizaciones
- ✅ Integración con OpenRouter API (modelo `google/gemini-2.5-flash-lite-preview-06-17`)
- ✅ Consciencia del estado de conversación y contexto
- ✅ Especialización en repuestos automotrices
- ✅ Generación de respuestas y envío por WhatsApp Business API
- ✅ Interfaz de pruebas en WhatsApp Test

### Integración Empresarial
- Conexión con Microsip ERP vía métodos SOAP
- Gestión de números de WhatsApp Business
- Sistema de permisos y roles por agente
- Cumplimiento con políticas de Meta

## 🤖 Chatbot con IA - Funcionalidad Implementada

### ✅ Características Implementadas

La integración del chatbot con IA está completamente funcional y disponible en **WhatsApp Test**:

#### Backend (Node.js + Express)
- **Servicio de Chatbot**: Procesamiento de mensajes con OpenRouter + Gemini
- **Endpoints API**: 5 endpoints para probar y usar el chatbot
- **Integración WhatsApp**: Envío automático de respuestas por WhatsApp Business API
- **Persistencia**: Conversaciones en memoria con limpieza automática (30 min)

#### Frontend (React)
- **Interfaz de Pruebas**: Panel completo integrado en WhatsApp Test
- **Estadísticas en Tiempo Real**: Monitoreo de conversaciones activas
- **3 Modos de Prueba**: Solo IA, IA + WhatsApp, y Webhook simulado
- **Visualización de Datos**: Información del cliente recopilada automáticamente

#### Funcionalidades del Chatbot
- **Especialización**: Repuestos automotrices (marca, modelo, año, motor)
- **Recopilación Inteligente**: Extrae múltiples datos de una sola respuesta
- **Contexto Persistente**: Recuerda información previa de la conversación
- **Respuestas Naturales**: Conversacional, no robótico

### 🚀 Cómo Probar el Chatbot

1. **Configurar OpenRouter**:
   ```bash
   # Agregar a backend/.env
   OPENROUTER_API_KEY=tu_api_key_aqui
   ```

2. **Iniciar servidores**:
   ```bash
   # Backend
   cd backend && npm run dev
   
   # Frontend
   cd frontend && npm run dev
   ```

3. **Probar en WhatsApp Test**:
   - Ve a `http://localhost:5173` → WhatsApp Test
   - Configura número: `5549679734`
   - Mensaje: `"Necesito pastillas de freno para mi Toyota Corolla 2018"`
   - Usa **🤖 Probar Respuesta de IA**

### 📊 Endpoints Disponibles

- `POST /api/chatbot/send-message` - Generar IA + enviar WhatsApp
- `POST /api/chatbot/test-ai` - Solo probar respuesta de IA
- `POST /api/chatbot/process-webhook` - Simular webhook automático
- `GET /api/chatbot/conversation/:phone` - Ver conversación
- `GET /api/chatbot/stats` - Estadísticas del chatbot

## 🏗️ Arquitectura del Sistema

### Frontend
- **React 18** + **TypeScript** + **Vite**
- Interfaz tipo WhatsApp Web para agentes
- Chat en tiempo real con WebSockets
- Panel derecho con contexto y datos del cliente
- Autenticación y gestión de sesiones

### Backend
- **Node.js** + **TypeScript**
- Módulo de autenticación
- Conexión con WhatsApp Business Cloud API
- Procesamiento de webhooks
- Sistema de ruteo de mensajes
- Integración con OpenRouter para chatbot
- Lógica de re-asignación automática

### Base de Datos
- **Supabase** (PostgreSQL en la nube)
- **Redis** para caching y sesiones

## 🔐 Sistema de Autenticación

### Credenciales de Acceso

| Usuario | Email | Contraseña | Rol | Vista Destino |
|---------|-------|------------|-----|---------------|
| **Admin** | `moises.s@aova.mx` | `Admin2024!` | Admin | `/admin/dashboard` |
| **Agente 1** | `k.alvarado@aova.mx` | `Agente2024!` | Agent | `/chats` |
| **Agente 2** | `elisa.n@synaracare.com` | `Agente2024!` | Agent | `/chats` |

### Características
- ✅ **Login con email** (no username)
- ✅ **Redirección automática** según el rol del usuario
- ✅ **Panel de administración** para gestionar usuarios
- ✅ **Protección de rutas** basada en roles
- ✅ **Integración completa** con Supabase

## 🔑 Variables de Entorno

### Backend (.env)
```env
# Base de datos Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=8h

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=tu_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WEBHOOK_VERIFY_TOKEN=tu_verify_token

# OpenRouter API
OPENROUTER_API_KEY=tu_openrouter_key
OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-06-17

# Servidor
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_BACKEND_URL=http://localhost:3002
VITE_APP_NAME=WhatsApp Business Platform
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Git

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd whtsppbsnss
```

2. **Instalar dependencias**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configurar variables de entorno**
```bash
# Backend
cd backend
cp env.example .env
# Editar .env con tus credenciales

# Frontend
cd ../frontend
cp env.example .env.local
# Editar .env.local con tus configuraciones
```

4. **Ejecutar en desarrollo**
```bash
# Backend
cd backend
npm run dev

# Frontend (nueva terminal)
cd frontend
npm run dev
```

## 🐳 Docker (Opcional)

### Desarrollo
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Producción
```bash
docker-compose up --build -d
```

## 📚 Documentación Adicional

- [`DOCUMENTATION.md`](./DOCUMENTATION.md) - **📚 Documentación consolidada completa**
- [`INITIAL.md`](./INITIAL.md) - Especificaciones detalladas del proyecto
- [`QUICK_START.md`](./QUICK_START.md) - Guía de inicio rápido
- [`DEPLOY_GUIDE.md`](./DEPLOY_GUIDE.md) - Guía de despliegue
- [`DOCKER_COMPOSE_README.md`](./DOCKER_COMPOSE_README.md) - Docker con Coolify
- [`PRODUCTION_ENV_TEMPLATE.md`](./PRODUCTION_ENV_TEMPLATE.md) - Variables de producción
- [`AUTHENTICACION_EMAIL_COMPLETADA.md`](./AUTHENTICACION_EMAIL_COMPLETADA.md) - Autenticación
- [`LOGIN_MULTIPLE_CREDENTIALS_COMPLETADO.md`](./LOGIN_MULTIPLE_CREDENTIALS_COMPLETADO.md) - Credenciales múltiples

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## ⚠️ Notas Importantes

- **Cumplimiento Meta**: Este sistema usa exclusivamente la API oficial de WhatsApp Cloud y cumple con todas las políticas de Meta.
- **No librerías no oficiales**: No se utilizan librerías como WhatsApp Web.js, Baileys o similares.
- **Contexto de conversación**: El chatbot mantiene el contexto de cada conversación para continuidad.
- **Re-asignación automática**: Sistema de transferencia temporal por inactividad del agente.
- **Integración ERP**: Conexión con Microsip vía métodos SOAP para datos empresariales.

---

**Desarrollado para optimizar la gestión de WhatsApp Business en entornos empresariales.** 