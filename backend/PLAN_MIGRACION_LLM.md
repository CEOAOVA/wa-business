# 🚀 PLAN DE MIGRACIÓN LLM - Backend-Embler → WhatsApp Backend

## 🎯 **OBJETIVO PRINCIPAL**
Migrar completamente el sistema LLM avanzado del Backend-Embler al backend de WhatsApp Business, incluyendo:
- Sistema de conversación inteligente con Gemini (OpenRouter)
- Todas las funciones SOAP para inventario y transacciones
- Gestión avanzada de estados conversacionales
- Function calling completo para refacciones automotrices
- Mantenimiento de la integración WhatsApp existente

## 📋 **ALCANCE DEL PROYECTO**

### **✅ QUÉ SE MIGRARÁ**
- **LLM Service**: OpenRouter + Gemini Flash 1.5
- **SOAP Integration**: Consultas de inventario, transacciones, tickets
- **Function Calling**: 10+ funciones especializadas en refacciones
- **Conversation Management**: Estados avanzados, contexto, sesiones
- **Product Search**: Búsqueda inteligente por VIN, código, descripción
- **Transaction Flow**: Compra local, envíos, generación de tickets
- **Error Handling**: Fallbacks automáticos, reintentos, logging

### **🔄 QUÉ SE MANTIENE**
- WhatsApp Business API integration existente
- Database schema base (Prisma + SQLite)
- Estructura de rutas actual
- Sistema de autenticación
- Manejo de medios

### **📝 QUÉ SE MEJORA**
- Sistema de chatbot simple → Conversación inteligente contextual
- Función básica de recopilación → 10+ funciones especializadas  
- Respuestas estáticas → Respuestas dinámicas basadas en inventario real
- Sin persistencia avanzada → Estados conversacionales persistentes

### **⏰ IMPLEMENTACIÓN POSTERIOR**
- Integración con Supabase para metadatos de clientes
- Analytics avanzados de conversaciones
- Dashboard de métricas LLM

---

## 📁 **ESTRUCTURA DEL PROYECTO**

### **ANTES** (Estado Actual)
```
src/
├── config/whatsapp.ts
├── services/
│   ├── chatbot.service.ts    # Función simple de recopilación
│   ├── whatsapp.service.ts
│   ├── database.service.ts
│   └── media.service.ts
├── routes/
│   ├── chatbot.ts
│   ├── chat.ts
│   └── (otros)
└── middleware/
```

### **DESPUÉS** (Estado Objetivo)
```
src/
├── config/
│   ├── index.ts              # ✨ Config principal centralizada
│   └── whatsapp.ts           # Existente
├── services/
│   ├── llm/                  # ✨ Nuevo directorio completo
│   │   ├── openai-client.ts      # OpenRouter + Gemini
│   │   ├── conversation-service.ts  # Gestión avanzada
│   │   ├── function-service.ts     # 10+ funciones SOAP
│   │   └── function-handler.ts     # Function calling
│   ├── soap/                 # ✨ Nuevo directorio
│   │   └── soap-service.ts       # Integración SOAP completa
│   ├── utils/                # ✨ Utilidades especializadas
│   │   ├── text-processing.ts    # Procesamiento de texto
│   │   ├── sucursal-mapping.ts   # Mapeo de sucursales
│   │   └── vin-decoder.ts        # Validación VIN
│   ├── chatbot.service.ts    # 🔄 Mejorado con LLM avanzado
│   └── (servicios existentes)
├── models/                   # ✨ Nuevo directorio
│   ├── functions.ts              # Interfaces function calling
│   └── conversation.ts           # Modelos conversación
├── types/                    # ✨ Nuevo directorio
│   ├── llm.ts                    # Tipos LLM
│   └── soap.ts                   # Tipos SOAP
└── (estructura existente)
```

---

## 🔧 **VARIABLES DE ENTORNO NUEVAS**

```env
# ========================================
# LLM CONFIGURATION
# ========================================
OPEN_ROUTER_API_KEY=sk-xxx                    # API Key OpenRouter
OPEN_ROUTER_BASE_URL=https://openrouter.ai/api/v1
OPEN_ROUTER_DEFAULT_MODEL=google/gemini-flash-1.5
DEFAULT_TEMPERATURE=0.7                       # Creatividad del modelo
DEFAULT_MAX_TOKENS=1000                       # Límite de tokens

# ========================================
# SOAP SERVICES CONFIGURATION  
# ========================================
EMBLER_WSDL_URL=http://example.com/embler?wsdl     # URL del WSDL
EMBLER_ENDPOINT_URL=http://example.com/embler      # Endpoint SOAP
TOKEN_CACHE_DURATION=10                            # Duración cache token (min)
INVENTORY_CACHE_TTL=300000                         # TTL cache inventario (ms)

# ========================================
# PUNTOS DE VENTA CONFIGURATION
# ========================================
DEFAULT_POS_ID=SAT                                 # POS por defecto
VALID_POS_IDS=ME,CUA,ECA,IZT,LIND,PORT,QRO,SAT,TPN,VC
POS_CREDENTIALS={"ME":{"user":"test","pwd":"test"},"SAT":{"user":"test","pwd":"test"}}

# ========================================
# EXTERNAL APIS
# ========================================
API_NINJAS_KEY=xxx                                 # Para decodificación VIN

# ========================================
# SYSTEM CONFIGURATION
# ========================================
LOG_LEVEL=info                                     # Nivel de logging
ENABLE_DETAILED_LOGS=false                         # Logs detallados en prod
```

---

## ⚡ **CRONOGRAMA DE IMPLEMENTACIÓN**

### **🗓️ DÍA 1: FUNDACIÓN** ✅ COMPLETADO
- ✅ Crear estructura de directorios
- ✅ Migrar configuración centralizada (`src/config/index.ts`)
- ✅ Implementar OpenAI Client mejorado (`src/services/llm/openai-client.ts`)
- ✅ Setup básico de tipos y modelos (`src/types/llm.ts`, `src/types/soap.ts`, `src/models/functions.ts`)
- ✅ Actualizar dependencias en package.json
- ✅ Documentar variables de entorno (`ENV_VARIABLES.md`)

### **🗓️ DÍA 2: SERVICIOS CORE**
- ✅ Migrar SOAP Service completo
- ✅ Implementar models y types
- ✅ Configurar utilidades base

### **🗓️ DÍA 3: FUNCTION CALLING**
- ✅ Migrar Function Service (10+ funciones)
- ✅ Implementar Function Handler
- ✅ Integrar con SOAP services

### **🗓️ DÍA 4: CONVERSATION ENGINE**
- ✅ Migrar Conversation Service
- ✅ Estados conversacionales avanzados
- ✅ Detección inteligente de productos

### **🗓️ DÍA 5: INTEGRACIÓN WHATSAPP**
- ✅ Actualizar ChatBot Service existente
- ✅ Integrar nuevo sistema LLM
- ✅ Mantener compatibilidad WhatsApp

### **🗓️ DÍA 6: FINALIZACIÓN**
- ✅ Testing integral
- ✅ Documentación
- ✅ Optimizaciones

---

## 🎯 **FUNCIONES LLM A IMPLEMENTAR**

### **📦 FUNCIONES DE INVENTARIO**
1. **`consultarInventario`** - Consulta stock en punto específico
2. **`consultarInventarioGeneral`** - Stock en todas las sucursales  
3. **`buscarProductos`** - Búsqueda general de productos
4. **`buscarYConsultarInventario`** - Búsqueda + consulta integrada

### **💰 FUNCIONES DE TRANSACCIONES**
5. **`confirmarCompra`** - Proceso completo de compra
6. **`generarTicket`** - Generación de tickets PDF
7. **`manejarDecisionCompra`** - Gestión de decisiones usuario

### **🚚 FUNCIONES DE ENVÍO**
8. **`consultarEnvio`** - Información de envíos
9. **`solicitarDireccion`** - Recopilación de direcciones
10. **`confirmarDireccion`** - Validación de direcciones

### **👨‍💼 FUNCIONES DE ASESORÍA**
11. **`solicitarAsesor`** - Escalación a humano

### **🔍 FUNCIONES ESPECIALES**
12. **`buscarPorVin`** - Búsqueda por VIN de vehículo
13. **`seleccionarProducto`** - Selección interactiva
14. **`validarVin`** - Validación de VIN

---

## 📊 **FLUJOS DE CONVERSACIÓN**

### **🔄 FLUJO PRINCIPAL: CONSULTA DE PRODUCTO**
```
Usuario: "¿Tienes filtro de aceite para Toyota Corolla 2020?"
    ↓
LLM detecta: Producto + Marca + Modelo + Año
    ↓  
Function Call: buscarYConsultarInventario
    ↓
SOAP Query: Buscar productos + Consultar stock local
    ↓
Si HAY stock local:
    → "Tenemos X unidades por $XXX ¿Deseas comprarlo?"
    → Usuario: "Sí" → confirmarCompra → Ticket PDF
    
Si NO HAY stock local:
    → Consultar inventario general
    → "Tenemos en sucursal X ¿Te lo enviamos?"
    → Usuario: "Sí" → solicitarDireccion → confirmarCompra
    
Si NO HAY stock:
    → "No tenemos disponible. Te conecto con un asesor"
    → solicitarAsesor
```

### **🔄 FLUJO ESPECIAL: BÚSQUEDA POR VIN**
```
Usuario: "VIN: WDD1760431J653292, necesito pastillas"
    ↓
Function Call: buscarPorVin
    ↓
API Ninjas: Decodificar VIN → Marca/Modelo/Año
    ↓
Búsqueda específica: "pastillas Mercedes C-Class 2018"
    ↓
(Continúa flujo principal)
```

---

## 🛡️ **MANEJO DE ERRORES**

### **SOAP Service Errors**
- Reintentos automáticos (3 intentos)
- Fallback a asesor humano
- Logging detallado de errores

### **LLM Errors**
- Timeout de 60 segundos
- Fallback a respuestas predefinidas
- Continuar conversación en caso de error

### **Function Call Errors**
- Validación de argumentos
- Manejo de funciones no implementadas
- Respuestas de error amigables

---

## 📈 **MÉTRICAS Y LOGGING**

### **Métricas LLM**
- Tokens utilizados (prompt + completion)
- Tiempo de respuesta
- Tasa de éxito de function calls
- Errores por función

### **Métricas de Conversación**  
- Conversaciones activas por POS
- Promedio de mensajes por conversación
- Tasa de conversión (consulta → compra)
- Escalaciones a asesor

### **Métricas SOAP**
- Tiempo de respuesta SOAP
- Errores de autenticación  
- Cache hit ratio
- Disponibilidad de servicios

---

## 🎉 **RESULTADO FINAL ESPERADO**

### **Para el Usuario WhatsApp**
- Conversaciones naturales e inteligentes
- Respuestas inmediatas con datos reales
- Proceso de compra fluido end-to-end
- Escalación automática cuando sea necesario

### **Para el Negocio**
- Automatización completa de consultas de inventario
- Generación automática de tickets de venta
- Reducción de carga de trabajo para asesores
- Métricas detalladas de interacciones

### **Para el Sistema**
- Integración robusta WhatsApp + LLM + SOAP
- Manejo inteligente de errores y fallbacks
- Escalabilidad para múltiples POS concurrentes
- Logging completo para debugging y métricas

---

**🏁 Status**: Listo para comenzar implementación
**👨‍💻 Desarrollador**: Claude Sonnet 4  
**📅 Fecha Inicio**: {{ Fecha actual }}
**⏱️ Duración Estimada**: 6 días de desarrollo 