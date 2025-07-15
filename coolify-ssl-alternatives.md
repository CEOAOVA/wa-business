# 🔧 Configuraciones Alternativas para SSL en Coolify

## ✅ **Cambios Realizados en docker-compose.coolify.yml**

### **Problemas Corregidos:**
1. **❌ certresolver**: `letsencrypt` → **✅ `myresolver`**
2. **❌ middlewares conflictivos** → **✅ middlewares únicos**
3. **❌ service no definido** → **✅ service explícito**
4. **❌ headers faltantes** → **✅ X-Hub-Signature-256 añadido**

### **Principales Cambios:**
- **Backend**: Router `wa-business-backend` con certresolver `myresolver`
- **Frontend**: Router `wa-business-frontend` con certresolver `myresolver`
- **Middlewares**: Únicos para cada servicio (`backend-*`, `frontend-*`)
- **Headers**: Agregado `X-Hub-Signature-256` para webhooks de WhatsApp

---

## 🔄 **Si `myresolver` No Funciona - Alternativas**

### **Opción 1: `letsencrypt` (Original)**
```yaml
- "traefik.http.routers.wa-business-backend.tls.certresolver=letsencrypt"
- "traefik.http.routers.wa-business-frontend.tls.certresolver=letsencrypt"
```

### **Opción 2: `le` (Let's Encrypt abreviado)**
```yaml
- "traefik.http.routers.wa-business-backend.tls.certresolver=le"
- "traefik.http.routers.wa-business-frontend.tls.certresolver=le"
```

### **Opción 3: `default` (Resolver por defecto)**
```yaml
- "traefik.http.routers.wa-business-backend.tls.certresolver=default"
- "traefik.http.routers.wa-business-frontend.tls.certresolver=default"
```

### **Opción 4: Sin certresolver (Automático)**
```yaml
# Remover líneas de certresolver y dejar solo:
- "traefik.http.routers.wa-business-backend.tls=true"
- "traefik.http.routers.wa-business-frontend.tls=true"
```

---

## 📋 **Pasos para Probar**

### **1. Desplegar Configuración Actual**
1. Hacer push del `docker-compose.coolify.yml` actualizado
2. En Coolify: **Redeploy** el proyecto
3. Esperar 2-3 minutos para que genere certificados
4. Probar: `https://dev-apiwaprueba.aova.mx/health`

### **2. Si Falla - Probar Alternativas**
Cambiar solo las líneas de `certresolver` en el orden:
1. `myresolver` (actual)
2. `letsencrypt` 
3. `le`
4. `default`
5. Sin certresolver

### **3. Verificar en Coolify Dashboard**
- **Ir a**: Proyecto → Backend Service → Domains
- **Verificar**: Estado del certificado SSL
- **Logs**: Revisar errores de Traefik

---

## 🎯 **Comandos de Verificación Rápida**

```bash
# 1. Verificar conectividad (desde tu máquina local)
Test-NetConnection dev-apiwaprueba.aova.mx -Port 443

# 2. Verificar certificado (PowerShell)
$request = [Net.HttpWebRequest]::Create("https://dev-apiwaprueba.aova.mx/health")
try { $request.GetResponse() } catch { $_.Exception.Message }

# 3. Verificar webhook de WhatsApp
# En tu navegador: https://dev-apiwaprueba.aova.mx/api/chat/webhook
```

---

## 🚨 **Posibles Errores y Soluciones**

### **Error: "cannot obtain ACME certificate"**
**Solución**: Cambiar a certresolver `letsencrypt`

### **Error: "no configuration has been found"**  
**Solución**: Verificar que el dominio DNS apunta a la IP correcta

### **Error: "too many requests"**
**Solución**: Esperar 1 hora (límite de Let's Encrypt)

### **Error: "invalid certificate authority"**
**Solución**: El certificado se generó, esperar propagación (5-10 min)

---

## ✅ **Webhook de WhatsApp - Configuración Final**

Una vez que SSL funcione:

1. **En Meta for Developers:**
   - **Callback URL**: `https://dev-apiwaprueba.aova.mx/api/chat/webhook`
   - **Verify Token**: Tu `WEBHOOK_VERIFY_TOKEN`

2. **Verificar que funciona:**
   ```bash
   # Debería devolver tu token de verificación
   https://dev-apiwaprueba.aova.mx/api/chat/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=TU_TOKEN
   ```

3. **Probar webhook:**
   - Envía mensaje a tu número de WhatsApp Business
   - Verifica que aparece en tu aplicación

---

## 🔄 **Próximos Pasos**

1. **✅ Deploy** la configuración actualizada
2. **⏱️ Esperar** 2-3 minutos para certificados
3. **🧪 Probar** SSL: `https://dev-apiwaprueba.aova.mx/health`
4. **📱 Configurar** webhook en WhatsApp
5. **🎉 Probar** envío/recepción de mensajes

**¿Funcionó la primera opción o necesitas probar alternativas?** 