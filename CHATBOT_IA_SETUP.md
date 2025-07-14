# 🤖 Configuración del Chatbot con IA para WhatsApp

## 📋 Resumen de la Implementación

Se ha agregado exitosamente la infraestructura para que el chatbot pueda generar mensajes con IA (OpenRouter + Gemini) y enviarlos por WhatsApp Business API. Esta funcionalidad está disponible **solo en WhatsApp Test** según los requerimientos.

## 🏗️ Arquitectura Implementada

### Backend (Node.js + Express)
- **Servicio de Chatbot**: `backend/src/services/chatbot.service.ts`
- **Rutas API**: `backend/src/routes/chatbot.ts`
- **Integración con WhatsApp**: Conecta directamente con `whatsapp.service.ts`

### Frontend (React)
- **Servicio API**: `frontend/test-tailwind/src/services/chatbot-api.ts`
- **Interfaz UI**: Integrada en `frontend/test-tailwind/src/pages/WhatsAppTest.tsx`

## 🔧 Configuración Necesaria

### 1. Variables de Entorno del Backend

Crear o actualizar el archivo `backend/.env` con:

```env
# WhatsApp Business API (configuración existente)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=your_verify_token_here

# OpenRouter AI (NUEVA CONFIGURACIÓN)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 2. Obtener API Key de OpenRouter

1. Ve a [OpenRouter.ai](https://openrouter.ai/)
2. Crea una cuenta gratuita
3. Ve a [API Keys](https://openrouter.ai/keys)
4. Crea una nueva API key
5. Copia la key y agrégala a tu archivo `.env`

### 3. Configuración del Frontend

El frontend usa la misma URL del backend (`http://localhost:3002`), no requiere configuración adicional.

## 🚀 Cómo Usar el Chatbot

### 1. Iniciar los Servidores

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend/test-tailwind
npm run dev
```

### 2. Ir a WhatsApp Test

1. Abre el navegador en `http://localhost:5173`
2. Ve a la página "WhatsApp Test"
3. Verás las nuevas secciones del chatbot:
   - 🤖 **Chatbot con IA**: Estado y estadísticas
   - 🧠 **Acciones del Chatbot**: Botones para probar
   - 💬 **Conversación Actual**: Información del cliente

### 3. Probar el Chatbot

#### Opción 1: Solo Probar IA (Sin enviar WhatsApp)
1. Ingresa un número de teléfono: `5549679734`
2. Escribe un mensaje: `"Necesito un filtro de aceite para mi Toyota Corolla 2018"`
3. Haz clic en **🤖 Probar Respuesta de IA (Solo Test)**
4. Verás la respuesta generada por IA en los resultados

#### Opción 2: Generar IA + Enviar WhatsApp
1. Configura el número y mensaje
2. Haz clic en **💬 Generar IA + Enviar WhatsApp**
3. El sistema generará una respuesta con IA y la enviará por WhatsApp real

#### Opción 3: Simular Webhook Automático
1. Configura el número y mensaje
2. Haz clic en **🔄 Simular Webhook + Respuesta IA**
3. Simula un mensaje entrante que activará respuesta automática

## 📊 Endpoints del Chatbot

### Nuevos Endpoints Disponibles

```
POST /api/chatbot/send-message
- Genera respuesta con IA y la envía por WhatsApp

POST /api/chatbot/test-ai
- Prueba la respuesta de IA sin enviar por WhatsApp

POST /api/chatbot/process-webhook
- Procesa mensaje entrante y genera respuesta automática

GET /api/chatbot/conversation/:phoneNumber
- Obtiene información de la conversación activa

GET /api/chatbot/stats
- Estadísticas del chatbot (conversaciones, mensajes, etc.)
```

## 🧠 Funcionalidades del Chatbot

### Especialización en Repuestos Automotrices
- Recopila información del cliente: nombre, necesidad
- Datos del vehículo: marca, modelo, año, motor
- Genera cotizaciones inteligentes
- Mantiene contexto de la conversación

### Características Técnicas
- **Modelo IA**: Gemini 2.5 Flash Lite Preview (OpenRouter)
- **Persistencia**: Conversaciones en memoria durante 30 minutos
- **Funciones**: Recopilación automática de datos estructurados
- **Respuestas**: Naturales y contextuales

## 🔍 Verificación de la Integración

### 1. Verificar Backend
```bash
curl http://localhost:3002/api/chatbot/stats
```

### 2. Verificar Frontend
- Ve a WhatsApp Test
- Verifica que aparezcan las nuevas secciones del chatbot
- El estado debe mostrar "Conectado" en verde

### 3. Prueba Completa
1. Configura número: `5549679734`
2. Mensaje: `"Hola, necesito pastillas de freno"`
3. Usa **🤖 Probar Respuesta de IA**
4. Deberías ver una respuesta natural del chatbot

## 🎯 Casos de Uso de Ejemplo

### Ejemplo 1: Consulta Simple
```
Usuario: "Necesito un filtro de aceite"
Chatbot: "¡Hola! Con gusto te ayudo a encontrar el filtro de aceite perfecto. ¿Para qué vehículo es?"
```

### Ejemplo 2: Información Completa
```
Usuario: "Necesito pastillas de freno para mi Toyota Corolla 2018"
Chatbot: "Perfecto, pastillas de freno para tu Corolla 2018. ¿Cuál es tu nombre para generar la cotización?"
```

### Ejemplo 3: Recopilación Inteligente
```
Usuario: "Soy Juan y necesito un filtro de aire"
Chatbot: "Hola Juan, ¿para qué marca y modelo de vehículo necesitas el filtro de aire?"
```

## 📈 Monitoreo

### Estadísticas Disponibles
- **Conversaciones Activas**: Cuántas conversaciones están en progreso
- **Total Mensajes**: Mensajes procesados por el chatbot
- **Promedio por Conversación**: Eficiencia del chatbot
- **Uptime**: Tiempo de funcionamiento del servidor

### Información por Conversación
- **Estado**: Fase de recopilación de datos
- **Información del Cliente**: Datos recopilados automáticamente
- **Historial**: Número de mensajes intercambiados

## 🚨 Solución de Problemas

### Error: "OpenRouter API key no configurada"
- Verifica que `OPENROUTER_API_KEY` esté en el archivo `.env`
- Reinicia el servidor backend

### Error: "No se puede conectar al servidor"
- Asegúrate de que el backend esté corriendo en puerto 3002
- Verifica que no haya conflictos de puertos

### El chatbot no responde
- Verifica la configuración de OpenRouter
- Revisa los logs del backend para errores
- Asegúrate de que la API key sea válida

## 🎉 ¡Implementación Completa!

La integración del chatbot con IA y WhatsApp está completamente funcional. Puedes:

1. ✅ Generar respuestas inteligentes con IA
2. ✅ Enviar mensajes por WhatsApp Business API
3. ✅ Recopilar información de clientes automáticamente
4. ✅ Mantener conversaciones contextuales
5. ✅ Monitorear estadísticas y conversaciones

**Próximos pasos**: Configura tu API key de OpenRouter y comienza a probar el chatbot en WhatsApp Test. 