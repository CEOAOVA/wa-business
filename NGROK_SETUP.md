# Configuración de Ngrok para Webhooks de WhatsApp

## Prerrequisitos

1. **Instalar ngrok**: 
   - Descargar desde https://ngrok.com/download
   - O instalar con: `npm install -g ngrok` (si tienes Node.js)
   - O instalar con Chocolatey: `choco install ngrok` (Windows)

2. **Crear cuenta en ngrok** (opcional para testing básico):
   - Ir a https://ngrok.com/signup
   - Obtener authtoken

## Configuración

### 1. Configurar ngrok (opcional, para funciones avanzadas)
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### 2. Exponer el servidor backend
Con el backend ejecutándose en puerto 3001:
```bash
ngrok http 3001
```

Esto generará algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3001
```

### 3. Configurar WhatsApp Business API

1. **Ir a Meta for Developers** (https://developers.facebook.com/)
2. **Seleccionar tu app de WhatsApp Business**
3. **Navegar a WhatsApp > Configuración**
4. **Configurar Webhook URL**:
   - URL: `https://abc123.ngrok.io/api/chat/webhook`
   - Token de verificación: Usar el valor de `WEBHOOK_VERIFY_TOKEN` del .env

### 4. Variables de entorno necesarias

Agregar al archivo `.env` del backend:

```env
# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_para_webhook_123
WEBHOOK_URL=https://abc123.ngrok.io/api/chat/webhook

# WhatsApp API (Meta)
WHATSAPP_ACCESS_TOKEN=tu_access_token_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui
WHATSAPP_API_VERSION=v21.0

# Servidor
PORT=3001
NODE_ENV=development
```

## Proceso de testing

### 1. Iniciar servicios
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Ngrok
ngrok http 3001

# Terminal 3: Frontend  
cd frontend/test-tailwind
npm run dev
```

### 2. Configurar webhook en WhatsApp
- Copiar la URL de ngrok (https://abc123.ngrok.io)
- Configurar en Meta Developers: `https://abc123.ngrok.io/api/chat/webhook`
- Usar el token del .env para verificación

### 3. Probar mensajes
- Enviar mensaje al número de WhatsApp Business desde otro teléfono
- Verificar que aparece en tiempo real en la interfaz web
- Responder desde la interfaz web
- Verificar que llega al teléfono

## Verificación de webhooks

El backend incluye endpoint para verificar webhooks:
```
GET /api/chat/webhook?hub.mode=subscribe&hub.challenge=CHALLENGE&hub.verify_token=TOKEN
```

### Logs a verificar:
- `✅ WebSocket conectado`
- `📨 Procesando webhook de WhatsApp`
- `🌐 Evento Socket.IO emitido para nuevo mensaje`
- `✅ WhatsApp Service inicializado con base de datos`

## Troubleshooting

### 1. Webhook no recibe mensajes
- Verificar que ngrok está ejecutándose
- Verificar URL en Meta Developers
- Verificar token de verificación

### 2. WebSocket no conecta
- Verificar que backend está ejecutándose en puerto 3001
- Verificar CORS configurado correctamente
- Revisar consola del navegador para errores

### 3. Mensajes no aparecen en tiempo real
- Verificar conexión WebSocket en la interfaz
- Revisar logs del backend
- Verificar que el evento `new_message` se emite

## Seguridad

⚠️ **Importante**: 
- Ngrok expone tu aplicación local a internet
- Solo usar para desarrollo/testing
- No incluir tokens reales en el código
- Usar siempre variables de entorno

## Scripts útiles

### Verificar webhook manualmente:
```bash
curl -X POST https://abc123.ngrok.io/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "test",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {"phone_number_id": "test"},
          "messages": [{
            "from": "1234567890",
            "id": "test_msg_123",
            "timestamp": "1234567890",
            "text": {"body": "Mensaje de prueba"},
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

### Verificar estado de servicios:
```bash
# Backend health check
curl http://localhost:3001/health

# WhatsApp API status
curl http://localhost:3001/api/chat/status
``` 