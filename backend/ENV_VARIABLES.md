# 🔧 Variables de Entorno - WhatsApp Backend LLM

Este documento describe todas las variables de entorno necesarias para el sistema LLM integrado.

## 📋 **CONFIGURACIÓN REQUERIDA**

### **🌍 SERVER CONFIGURATION**
```env
PORT=3002                    # Puerto del servidor
NODE_ENV=development         # Entorno (development/production)
```

### **📱 WHATSAPP BUSINESS API (EXISTENTES)**
```env
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v22.0
WHATSAPP_BASE_URL=https://graph.facebook.com
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WEBHOOK_PATH=/api/chat/webhook
WEBHOOK_URL=https://your-domain.com/api/chat/webhook
```

### **🤖 LLM CONFIGURATION (NUEVAS)**
```env
OPEN_ROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPEN_ROUTER_BASE_URL=https://openrouter.ai/api/v1
OPEN_ROUTER_DEFAULT_MODEL=google/gemini-flash-1.5
DEFAULT_TEMPERATURE=0.7      # Creatividad del modelo (0.0 - 2.0)
DEFAULT_MAX_TOKENS=1000      # Límite de tokens por respuesta
LLM_TIMEOUT_MS=60000         # Timeout en milisegundos
```

### **🔧 SOAP SERVICES CONFIGURATION (NUEVAS)**
```env
EMBLER_WSDL_URL=http://example.com/embler?wsdl
EMBLER_ENDPOINT_URL=http://example.com/embler
TOKEN_CACHE_DURATION=10      # Duración del cache de token (minutos)
INVENTORY_CACHE_TTL=300000   # TTL del cache de inventario (ms)
SOAP_CONNECTION_RETRIES=3    # Número de reintentos
```

### **🏪 PUNTOS DE VENTA CONFIGURATION (NUEVAS)**
```env
DEFAULT_POS_ID=SAT
VALID_POS_IDS=ME,CUA,ECA,IZT,LIND,PORT,QRO,SAT,TPN,VC
POS_CREDENTIALS={"ME":{"user":"test","pwd":"test"},"SAT":{"user":"test","pwd":"test"}}
```

### **🌐 EXTERNAL APIS (NUEVAS)**
```env
API_NINJAS_KEY=your_api_ninjas_key_for_vin_decoding
```

### **🗄️ DATABASE (EXISTENTE)**
```env
DATABASE_URL="file:./dev.db"
```

### **⚙️ SYSTEM CONFIGURATION (NUEVAS)**
```env
LOG_LEVEL=info               # Nivel de logging (debug/info/warn/error)
ENABLE_DETAILED_LOGS=false   # Logs detallados (true/false)
```

---

## 🔑 **OBTENER API KEYS**

### **OpenRouter API Key**
1. Visita [OpenRouter.ai](https://openrouter.ai)
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" en tu dashboard
4. Genera una nueva API key
5. Copia la key que comienza con `sk-or-v1-`

### **API Ninjas Key (para VIN Decoder)**
1. Visita [API Ninjas](https://api.api-ninjas.com)
2. Regístrate gratis
3. Ve a tu dashboard
4. Copia tu API key

---

## 🏭 **CONFIGURACIÓN DE PUNTOS DE VENTA**

### **Formato de POS_CREDENTIALS**
```json
{
  "ME": {"user": "usuario_mexico", "pwd": "password123"},
  "SAT": {"user": "usuario_satelite", "pwd": "password456"},
  "CUA": {"user": "usuario_cuautitlan", "pwd": "password789"}
}
```

### **IDs de Puntos de Venta Válidos**
- `ME` - México
- `CUA` - Cuautitlán
- `ECA` - Ecatepec
- `IZT` - Iztapalapa
- `LIND` - Lindavista
- `PORT` - Portales
- `QRO` - Querétaro
- `SAT` - Satélite
- `TPN` - Tlalpan
- `VC` - Valle de Chalco

---

## 🚨 **VARIABLES CRÍTICAS**

### **En Producción, estas variables son OBLIGATORIAS:**
- `OPEN_ROUTER_API_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WEBHOOK_VERIFY_TOKEN`
- `EMBLER_WSDL_URL`
- `EMBLER_ENDPOINT_URL`
- `POS_CREDENTIALS`

### **En Desarrollo, estas variables pueden usar valores por defecto:**
- `OPEN_ROUTER_DEFAULT_MODEL` → `google/gemini-flash-1.5`
- `DEFAULT_TEMPERATURE` → `0.7`
- `DEFAULT_MAX_TOKENS` → `1000`
- `DEFAULT_POS_ID` → `SAT`

---

## 📝 **CÓMO CONFIGURAR**

1. **Crea archivo .env** en la raíz del proyecto backend
2. **Copia las variables** de este documento
3. **Reemplaza los valores** con tus credenciales reales
4. **Verifica que .env** esté en `.gitignore`
5. **Reinicia el servidor** para cargar las nuevas variables

---

## ✅ **VALIDACIÓN DE CONFIGURACIÓN**

El sistema validará automáticamente las variables críticas al iniciar:

```bash
npm run dev
```

Verás logs como:
```
✅ Configuración validada correctamente
📋 Resumen de Configuración:
   🌍 Entorno: development
   🚀 Puerto: 3002
   🤖 Modelo LLM: google/gemini-flash-1.5
   📱 WhatsApp Phone ID: 1234567890
   🏪 POS por defecto: SAT
   🔑 API Keys configuradas:
      - OpenRouter: ✅
      - WhatsApp: ✅
      - API Ninjas: ✅
```

---

## 🔧 **TROUBLESHOOTING**

### **Error: OPEN_ROUTER_API_KEY no está configurada**
- Verifica que la variable esté en `.env`
- Asegúrate de que comience con `sk-or-v1-`
- Reinicia el servidor

### **Error: POS_CREDENTIALS inválidas**
- Verifica que sea JSON válido
- Usa comillas dobles para propiedades
- Escapa caracteres especiales si es necesario

### **Error: SOAP connection failed**
- Verifica que `EMBLER_WSDL_URL` sea accesible
- Confirma que las credenciales POS sean correctas
- Revisa la conectividad de red 