# 🤖 Chatbot de Repuestos Automotrices - Embler

## 📋 Estado Actual
- ✅ **Implementado en:** Simulación frontend (ClientChat.tsx)
- ✅ **Tecnología:** OpenRouter + Gemini 2.5 Flash Lite Preview
- ✅ **Funcionalidad:** Recopilación de datos de vehículos para cotización
- ❌ **Pendiente:** Migración a backend + WhatsApp Business API

## 🎯 Objetivo del Chatbot

Recopilar información específica del cliente y su vehículo para generar cotizaciones de repuestos automotrices:

### Datos que recopila:
1. **Información personal:** Nombre del cliente
2. **Necesidad:** Qué pieza/repuesto necesita
3. **Información del vehículo:**
   - Marca (Toyota, Honda, Ford, etc.)
   - Modelo (Corolla, Civic, Focus, etc.)
   - Año (2018, 2020, etc.)
   - Litraje del motor (1.6L, 2.0L, etc.)
   - Número de serie del motor
   - Si es modelo especial (Sport, Turbo, etc.)

### Intención principal:
- **Cotización de repuestos** basada en la información recopilada

## 🏗️ Arquitectura

```
frontend/test-tailwind/src/chatbot/
├── services/
│   ├── openrouter-client.ts      # Cliente OpenRouter + Gemini
│   ├── autoparts-functions.ts    # Functions para datos automotrices
│   ├── conversation-service.ts   # Lógica conversacional
│   └── function-handler.ts       # Manejo de tool_calls
├── hooks/
│   └── useChatbot.ts            # Hook principal para UI
├── types/
│   └── chatbot.ts               # Tipos específicos
└── README.md                    # Esta documentación
```

## 🔄 Guía de Migración al Backend

### Paso 1: Mover estructura al backend
```bash
# Copiar carpeta completa
cp -r frontend/test-tailwind/src/chatbot/ backend/src/services/chatbot/
```

### Paso 2: Adaptar para WhatsApp Business
- [ ] Integrar webhooks de WhatsApp Cloud API
- [ ] Modificar ConversationService para manejar webhooks
- [ ] Agregar persistencia de conversaciones en base de datos
- [ ] Configurar variables de entorno para WhatsApp

### Paso 3: Variables de entorno necesarias

#### Frontend (actual):
```env
# Archivo: frontend/test-tailwind/.env.local
VITE_OPENROUTER_API_KEY=your_openrouter_key_here
```

#### Backend (futuro):
```env
# OpenRouter
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash-lite-preview-06-17

# WhatsApp Business (para migración)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

#### Configuración actual:
1. Crear archivo `.env.local` en `frontend/test-tailwind/`
2. Agregar: `VITE_OPENROUTER_API_KEY=tu_key_aqui`
3. Obtener key gratuita en: https://openrouter.ai/keys
4. Reiniciar servidor de desarrollo

### Paso 4: Endpoints a implementar
```typescript
POST /api/webhook/whatsapp     # Recibir mensajes
GET  /api/webhook/whatsapp     # Verificación de webhook
POST /api/chat/message         # API alternativa (desarrollo)
```

## 🚀 Uso Actual (Implementado)

### Integración completa en ClientChat.tsx:

```typescript
import { useChatbot } from "../chatbot/hooks/useChatbot";

const {
  sendMessage,
  getConversationHistory,
  isThinking,
  error,
  clientInfo,
  collectionProgress,
  resetConversation
} = useChatbot('client-simulator');

// Enviar mensaje del usuario
await sendMessage("Necesito un filtro de aceite");

// Obtener historial de conversación
const messages = getConversationHistory();

// Ver progreso de recopilación
console.log(collectionProgress.progressPercentage); // 0-100%
console.log(clientInfo); // Datos recopilados del cliente
```

### Funcionalidades disponibles:
- ✅ **Chat en tiempo real** con OpenRouter + Gemini
- ✅ **Recopilación inteligente** de datos del vehículo
- ✅ **Validación automática** de información
- ✅ **Generación de cotizaciones** simuladas
- ✅ **Interfaz de debug** en desarrollo
- ✅ **Manejo de errores** robusto
- ✅ **Persistencia** durante la sesión

### Para probar:
1. Ir a `/client-chat` en la aplicación
2. Escribir: "Necesito un filtro de aceite"
3. Seguir las preguntas del bot sobre el vehículo
4. Ver el panel de debug (solo en desarrollo)

## 📝 Notas de Implementación

- **Modelo:** `google/gemini-2.5-flash-lite-preview-06-17`
- **Persistencia:** Solo en memoria durante la conversación
- **Functions:** Optimizadas para recopilación de datos vehiculares
- **UI:** Integrada sin cambios en la interfaz existente de ClientChat
- **Escalación:** No implementada (versión futura)

## 🔧 Dependencias

```json
{
  "axios": "^1.6.0",
  "react": "^19.1.0",
  "typescript": "~5.8.3"
}
```

---

**Fecha de implementación:** ${new Date().toLocaleDateString()}  
**Versión:** 1.0.0 - Simulación Frontend  
**Siguiente fase:** Migración a backend + WhatsApp Business API 