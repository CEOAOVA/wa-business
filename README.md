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
   cd frontend/test-tailwind && npm run dev
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

Ver documentación completa en [`CHATBOT_IA_SETUP.md`](./CHATBOT_IA_SETUP.md)

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
- **SQLite** (desarrollo) / **PostgreSQL** (producción)
- **Redis** para caching y sesiones

## 📁 Estructura del Proyecto

```
whtsppbsnss/
├── frontend/                 # Aplicación React
├── backend/                  # Servidor Node.js
├── shared/                   # Tipos y utilidades compartidas
├── docs/                     # Documentación
├── scripts/                  # Scripts de automatización
├── docker/                   # Configuración Docker
├── INITIAL.md               # ⚠️ DOCUMENTO DE REFERENCIA
└── README.md                # Este archivo
```

### Estructura Detallada

#### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/
│   │   ├── common/           # Componentes reutilizables
│   │   ├── layout/           # Componentes de layout
│   │   ├── auth/             # Componentes de autenticación
│   │   ├── chat/             # Componentes de chat
│   │   ├── dashboard/        # Componentes del dashboard
│   │   ├── user/             # Componentes de usuario
│   │   └── microsip/         # Componentes de integración ERP
│   ├── pages/                # Páginas de la aplicación
│   ├── hooks/                # Custom hooks
│   ├── services/             # Servicios de API
│   ├── stores/               # Estado global (Zustand)
│   ├── types/                # Tipos TypeScript
│   ├── utils/                # Utilidades
│   └── styles/               # Estilos CSS
├── .env                      # Variables de entorno
└── package.json
```

#### Backend (`/backend`)
```
backend/
├── src/
│   ├── routes/               # Rutas de la API
│   ├── controllers/          # Controladores
│   ├── services/             # Lógica de negocio
│   ├── models/               # Modelos de datos
│   ├── middleware/           # Middleware personalizado
│   ├── utils/                # Utilidades
│   ├── types/                # Tipos TypeScript
│   ├── config/               # Configuraciones
│   └── app.ts                # Aplicación principal
├── tests/                    # Tests unitarios e integración
├── database/                 # Migraciones y seeds
├── .env                      # Variables de entorno
└── package.json
```

## 🚀 Plan de Trabajo

### Fase 1: Configuración Inicial y Estructura Base
- [ ] Configurar proyecto React 18 + TypeScript + Vite
- [ ] Configurar proyecto Node.js + TypeScript
- [ ] Implementar sistema de autenticación simple
- [ ] Crear estructura de carpetas completa
- [ ] Configurar base de datos SQLite

### Fase 2: Sistema de Usuarios y Gestión
- [ ] CRUD completo de usuarios
- [ ] Perfiles de usuario básicos
- [ ] Sistema de roles (agente, admin)
- [ ] Panel de usuario

### Fase 3: Sistema de Chat Simulado
- [ ] Estructura de conversaciones
- [ ] Interfaz de chat tipo WhatsApp Web
- [ ] Lista de conversaciones
- [ ] Chat individual simulado

### Fase 4: Sistema de Notificaciones Básico
- [ ] Notificaciones de nuevas conversaciones
- [ ] Badges de notificaciones
- [ ] Centro de notificaciones

### Fase 5: Integración WhatsApp Cloud API
- [ ] Configuración de WhatsApp Business Cloud API
- [ ] Manejo de webhooks
- [ ] Enví de mensajes
- [ ] Recepción de mensajes

### Fase 6: Sistema de Chatbot
- [ ] Integración con OpenRouter API
- [ ] Lógica de chatbot inteligente
- [ ] Recopilación de datos de cotización
- [ ] Gestión de contexto de conversación

### Fase 7: Sistema de Re-asignación
- [ ] Monitoreo de actividad de agentes
- [ ] Lógica de re-asignación por inactividad
- [ ] Sistema de transferencias temporales
- [ ] Notificaciones de transferencia

### Fase 8: Integración Microsip ERP
- [ ] Configuración de métodos SOAP
- [ ] Servicios de integración ERP
- [ ] Sincronización de datos
- [ ] Componentes de integración

### Fase 9: Testing y Documentación
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Documentación completa

### Fase 10: Optimización y Seguridad
- [ ] Optimización de rendimiento
- [ ] Implementación de seguridad
- [ ] Configuración de producción
- [ ] Monitoreo y logs

## 🔧 Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **React Router v6** - Enrutamiento
- **Zustand** - Estado global
- **Axios** - Cliente HTTP
- **Socket.io-client** - WebSockets

### Backend
- **Node.js** - Runtime
- **TypeScript** - Tipado estático
- **Express.js** - Framework web
- **Socket.io** - WebSockets
- **Prisma** - ORM
- **bcrypt** - Encriptación
- **jsonwebtoken** - JWT
- **cors** - CORS
- **helmet** - Seguridad

### Base de Datos
- **SQLite** - Desarrollo
- **PostgreSQL** - Producción
- **Redis** - Caching

### DevOps
- **Docker** - Containerización
- **GitHub Actions** - CI/CD
- **PM2** - Gestión de procesos

## 🔑 Variables de Entorno

### Backend (.env)
```env
# Base de datos
DATABASE_URL="sqlite:./dev.db"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="24h"

# WhatsApp Cloud API
WHATSAPP_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_VERIFY_TOKEN="your-verify-token"

# OpenRouter API
OPENROUTER_API_KEY="your-openrouter-key"
OPENROUTER_MODEL="google/gemini-2.5-flash-lite-preview-06-17"

# Microsip ERP
MICROSIP_SOAP_URL="your-soap-url"
MICROSIP_USERNAME="your-username"
MICROSIP_PASSWORD="your-password"

# Servidor
PORT=3001
NODE_ENV="development"
```

### Frontend (.env)
```env
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="ws://localhost:3001"
VITE_APP_NAME="WhatsApp Business Platform"
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
cp .env.example .env
# Editar .env con tus credenciales

# Frontend
cd ../frontend
cp .env.example .env
# Editar .env con tus configuraciones
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

## 📚 Documentación Adicional

- [`INITIAL.md`](./INITIAL.md) - Especificaciones detalladas del proyecto
- [`docs/api.md`](./docs/api.md) - Documentación de la API
- [`docs/setup.md`](./docs/setup.md) - Guía de instalación detallada
- [`docs/architecture.md`](./docs/architecture.md) - Arquitectura técnica

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