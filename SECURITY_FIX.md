# 🚨 ARREGLO URGENTE DE SEGURIDAD - Chatbot

## ⚠️ **PROBLEMA CRÍTICO DETECTADO**

La API key de OpenRouter está expuesta en el frontend, lo que permite que cualquier usuario:
- Vea tu API key inspeccionando el código del navegador
- Use tu API key para hacer peticiones ilimitadas
- Genere costos no autorizados en tu cuenta

## 🔧 **SOLUCIÓN INMEDIATA**

### 1. **Eliminar API Key del Frontend**

**Editar `frontend/env.example`:**
```bash
# ❌ ELIMINAR ESTA LÍNEA:
# VITE_OPENROUTER_API_KEY=tu_openrouter_api_key_aqui

# ✅ Solo mantener:
VITE_BACKEND_URL=http://localhost:3002
```

### 2. **Mover Chatbot al Backend**

El chatbot YA existe en el backend en `/api/chatbot`. Solo necesitas:

**Frontend - usar API interna:**
```javascript
// En lugar de llamar OpenRouter directamente
// Usar: /api/chatbot/send-message
const response = await fetch(`${BACKEND_URL}/api/chatbot/send-message`, {
  method: 'POST',
  body: JSON.stringify({ phoneNumber, message })
});
```

**Backend - configurar API key:**
```bash
# En backend/.env
OPEN_ROUTER_API_KEY=tu_api_key_aqui  # ✅ SEGURO - No se expone al frontend
```

### 3. **Verificar Archivos a Modificar**

```bash
# 1. Eliminar del frontend
rm frontend/.env.local  # Si existe
# Editar frontend/env.example (quitar VITE_OPENROUTER_API_KEY)

# 2. Configurar backend
cp backend/env.example backend/.env
# Editar backend/.env con tu API key real
```

## 🔍 **Verificación de Seguridad**

### Después del arreglo, verificar:

```bash
# 1. No debe haber API keys en el frontend
grep -r "sk-" frontend/src/  # No debe devolver nada
grep -r "VITE_OPENROUTER" frontend/  # Solo en archivos de ejemplo

# 2. El backend debe tener la API key
grep "OPEN_ROUTER_API_KEY" backend/.env  # Debe mostrar tu key

# 3. El frontend debe usar la API interna
grep "chatbot/send-message" frontend/src/  # Debe usar esta ruta
```

## 📋 **Configuración del Webhook (Según tu imagen)**

**Para Meta for Developers:**

1. **Callback URL:**
   ```
   https://tu-dominio.com/api/chat/webhook
   ```

2. **Verify token:**
   ```
   mi_webhook_token_secreto_2024
   ```

3. **En tu backend/.env:**
   ```bash
   WEBHOOK_VERIFY_TOKEN=mi_webhook_token_secreto_2024
   WEBHOOK_URL=https://tu-dominio.com/api/chat/webhook
   WHATSAPP_ACCESS_TOKEN=EAAG... # Tu token de Meta
   WHATSAPP_PHONE_NUMBER_ID=123... # Tu phone number ID
   ```

4. **NO marcar** "Attach a client certificate" por ahora

## ⚡ **Acción Inmediata Requerida**

1. **Detener cualquier instancia** que esté exponiendo la API key
2. **Rotar tu API key** en OpenRouter.ai por seguridad
3. **Implementar la solución** del backend
4. **Verificar** que el frontend no exponga credenciales

## 🎯 **Resultado Final**

✅ **Chatbot funcional** sin exponer credenciales  
✅ **API key segura** solo en el backend  
✅ **Webhook configurado** correctamente  
✅ **Sistema listo** para producción segura  

¿Necesitas ayuda implementando esta solución? 