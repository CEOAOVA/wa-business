# Seguridad de Webhooks de WhatsApp

## Características de Seguridad Implementadas

### 🔒 1. Validación de Estructura de Payload
- **Verificación de formato JSON** válido
- **Validación de estructura** de webhook de WhatsApp
- **Rechazo automático** de payloads malformados

### 🛡️ 2. Rate Limiting
- **Límite por IP**: 100 requests por minuto (configurable)
- **Ventana deslizante**: Reseteo automático cada 60 segundos
- **Respuesta HTTP 429** para requests que excedan el límite

### 👤 3. Verificación de User-Agent
- **Lista blanca** de User-Agents válidos:
  - `facebookplatform` (oficial de Meta)
  - `WhatsApp` (oficial)
  - `curl`, `axios`, `PostmanRuntime` (para testing)
- **Activación en producción**: Solo se aplica cuando `NODE_ENV=production`

### 📊 4. Logging de Seguridad
- **Request IDs únicos** para seguimiento
- **Logs detallados** en desarrollo
- **Logs resumidos** en producción (sin datos sensibles)
- **Alertas de seguridad** para intentos de acceso maliciosos

### 🔐 5. Verificación HMAC (Opcional)
- **Firma criptográfica** usando App Secret de WhatsApp
- **Protección contra tampering** de payload
- **Comparación timing-safe** contra timing attacks
- **Solo en producción** o con flag específico

## Configuración

### Variables de Entorno Requeridas

```env
# Básicas (requeridas)
WHATSAPP_ACCESS_TOKEN=tu_access_token_aqui
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id_aqui
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_para_webhook_123

# Seguridad Avanzada (opcionales)
WHATSAPP_APP_SECRET=tu_app_secret_para_verificacion_hmac
ENABLE_WEBHOOK_SIGNATURE=false  # true para habilitar HMAC en desarrollo
ENABLE_DETAILED_LOGS=true       # false para logs resumidos

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000      # 1 minuto en ms
RATE_LIMIT_MAX_REQUESTS=100     # Max requests por ventana

# Servidor
NODE_ENV=development            # production para máxima seguridad
```

### Configuración por Ambiente

#### Desarrollo (`NODE_ENV=development`)
- ✅ Logs detallados habilitados
- ✅ User-Agents flexibles
- ❌ Verificación HMAC deshabilitada (a menos que se configure)
- ✅ Rate limiting activado

#### Producción (`NODE_ENV=production`)
- ❌ Logs resumidos por seguridad
- ✅ User-Agents estrictos
- ✅ Verificación HMAC habilitada (si hay App Secret)
- ✅ Rate limiting estricto

## Cómo Obtener el App Secret

1. **Ir a Meta for Developers** (https://developers.facebook.com/)
2. **Seleccionar tu aplicación** de WhatsApp Business
3. **Ir a Configuración básica** (Basic Settings)
4. **Copiar el "App Secret"** (no el Access Token)
5. **Agregarlo al .env**:
   ```env
   WHATSAPP_APP_SECRET=tu_app_secret_aqui
   ```

## Testing de Seguridad

### Ejecutar Pruebas Automáticas

```bash
# Ejecutar todas las pruebas de seguridad
npm run security:test

# Verificar configuración de webhook
npm run webhook:check
```

### Pruebas Manuales

#### 1. Verificar Rate Limiting
```bash
# Hacer múltiples peticiones rápidas
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/chat/webhook \
    -H "Content-Type: application/json" \
    -H "User-Agent: facebookplatform/1.0" \
    -d '{"object":"whatsapp_business_account","entry":[]}' &
done
```

#### 2. Probar Payload Inválido
```bash
curl -X POST http://localhost:3001/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"invalid":"structure"}'
```

#### 3. Verificar User-Agent (en producción)
```bash
curl -X POST http://localhost:3001/api/chat/webhook \
  -H "Content-Type: application/json" \
  -H "User-Agent: MaliciousBot/1.0" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

#### 4. Estado de Seguridad
```bash
curl http://localhost:3001/api/chat/status
```

## Logs de Seguridad

### Formatos de Log

#### Request Normal
```
🔒 [req_1234567890_abc123] Webhook recibido desde IP: 192.168.1.100
✅ [req_1234567890_abc123] Webhook procesado exitosamente: 1 mensajes
```

#### Rate Limiting
```
⚠️ [req_1234567890_abc123] Rate limit excedido para IP: 192.168.1.100
```

#### User-Agent Sospechoso
```
⚠️ [req_1234567890_abc123] User-Agent sospechoso: MaliciousBot/1.0
```

#### Firma HMAC Inválida
```
❌ [req_1234567890_abc123] Firma HMAC inválida para webhook
```

#### Alert de Seguridad
```
⚠️ [req_1234567890_abc123] Security alert - Error en webhook: {
  "ip": "192.168.1.100",
  "userAgent": "MaliciousBot/1.0",
  "error": "Invalid webhook signature",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Monitoreo en Producción

### Métricas Recomendadas
- **Rate limit hits**: Conteo de requests bloqueados por rate limiting
- **Invalid payloads**: Requests con estructura inválida
- **HMAC failures**: Fallos de verificación de firma
- **Suspicious User-Agents**: Intentos con UA no válidos

### Alertas Recomendadas
- ⚠️ **Más de 10 rate limits** en 5 minutos
- 🚨 **Más de 5 HMAC failures** en 1 minuto
- ⚠️ **User-Agents sospechosos** repetitivos desde misma IP

## Mejores Prácticas

### 🔐 Configuración Segura
1. **Siempre usar HTTPS** en producción (ngrok/SSL)
2. **Configurar App Secret** para verificación HMAC
3. **Rotación regular** de tokens y secrets
4. **Monitoreo activo** de logs de seguridad

### 🛡️ Hardening Adicional
1. **Firewall/WAF** delante del servidor
2. **Allowlist de IPs** de Meta/Facebook si es posible
3. **Reverse proxy** (nginx/cloudflare) para DDoS protection
4. **Rate limiting adicional** a nivel de infraestructura

### 📊 Monitoring
1. **Alertas automáticas** para fallos de seguridad
2. **Dashboard** con métricas de webhooks
3. **Logs centralizados** (ELK/Splunk)
4. **Health checks** regulares

## Troubleshooting

### Webhook Rechazado - 400 Bad Request
```json
{"error": "Bad Request", "message": "Invalid WhatsApp webhook structure"}
```
**Solución**: Verificar que el payload tenga estructura válida de WhatsApp (`object` y `entry[]`)

### Rate Limited - 429 Too Many Requests
```json
{"error": "Too Many Requests", "retryAfter": 60}
```
**Solución**: Espaciar requests o aumentar límites en configuración

### User-Agent Rechazado - 403 Forbidden
```json
{"error": "Forbidden", "message": "Invalid User-Agent"}
```
**Solución**: Usar User-Agent válido o deshabilitar verificación en desarrollo

### HMAC Inválido - 401 Unauthorized
```json
{"error": "Unauthorized", "message": "Invalid webhook signature"}
```
**Solución**: Verificar App Secret y cálculo de firma HMAC

## Scripts Útiles

### Generar Firma HMAC de Prueba
```javascript
const crypto = require('crypto');
const payload = '{"object":"whatsapp_business_account","entry":[]}';
const secret = 'tu_app_secret';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(`X-Hub-Signature-256: sha256=${signature}`);
```

### Verificar Configuración
```bash
# Estado del sistema
curl http://localhost:3001/api/chat/status | jq .security

# Health check
curl http://localhost:3001/health
``` 