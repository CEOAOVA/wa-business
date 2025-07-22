# 🚀 SPRINT 1 SEMANA - BACKLOG COMPLETO
## WhatsApp Business Platform - 3 Developers

**Fecha**: $(date '+%Y-%m-%d')  
**Duración**: 5 días laborales  
**Team**: 3 Developers  
**Objetivo**: Sistema WhatsApp funcional con número de prueba → Preparado para 40 números  

---

## 📊 **ESTADO ACTUAL DEL PROYECTO**

### ✅ **LO QUE YA TENEMOS (FUNCIONAL)**
- **🏗️ Arquitectura Base**: Backend Node.js/TypeScript + Frontend React/TypeScript
- **🤖 IA Avanzada**: OpenRouter + Gemini con 10+ funciones LLM especializadas
- **📱 WhatsApp Básico**: Integración API parcial (solo testing limitado)
- **💾 Catálogo Productos**: 10,388+ productos en JSON + URLs imágenes MercadoLibre
- **🔧 SOAP Integration**: Consultas inventario real funcionando
- **🎨 UI Básica**: Componentes React básicos implementados
- **🗄️ Base SQLite**: Funcional para desarrollo local

### ⚠️ **LO QUE ESTÁ LIMITADO/ROTO**
- **📊 Persistencia**: Solo en memoria (se pierde al reiniciar)
- **📱 WhatsApp**: Configuración parcial, no webhook real
- **🔄 Tiempo Real**: WebSockets básicos sin sincronización
- **🎛️ Takeover**: Sistema temporal, no persistente
- **🖼️ Imágenes**: JSON no cargado en base de datos
- **👥 Multi-agente**: No funciona para múltiples usuarios
- **🎨 Layout**: UI básica, no layout HitlChat requerido

### ❌ **LO QUE NO EXISTE**
- **🔍 OCR**: Sin procesamiento de imágenes
- **📊 Supabase**: Sin migración a base de datos real
- **💰 Sistema Ventas**: Sin flujo de cierre/facturación
- **📱 Multi-sucursal**: Sin gestión de 40 números
- **🚀 CI/CD**: Sin pipeline de deployment
- **📈 Monitoreo**: Sin observabilidad

---

## 🎯 **OBJETIVOS DE LA SEMANA**

### **🎯 OBJETIVO PRINCIPAL**
**Transformar el sistema de DEMO/DESARROLLO → PRODUCCIÓN FUNCIONAL**

### **📋 DELIVERABLES CRÍTICOS**
1. **📱 WhatsApp Real**: Sistema funcionando con número de prueba real
2. **💾 Persistencia Completa**: Todo en Supabase (mensajes, conversaciones, imágenes)
3. **🎨 Layout HitlChat**: Interfaz 3 columnas con resumen IA
4. **🔍 OCR Funcional**: Análisis de imágenes y detección VIN
5. **🎛️ Takeover Real**: Sistema de asignación agente/IA persistente
6. **🚀 CI/CD**: Pipeline completo para deployment
7. **📈 Preparación Scale**: Infraestructura lista para 40 números

### **🚫 OUT OF SCOPE (Para después)**
- Configuración de 40 números (solo preparar estructura)
- Sistema de facturación completo (solo cotizaciones básicas)
- Analytics avanzados (solo métricas básicas)
- Mobile app (solo web responsive)

---

## 📅 **PLAN DETALLADO POR DÍA**

## **DÍA 1 (LUNES) - INFRAESTRUCTURA CRÍTICA**
*"De demo local → Sistema real con base de datos"*

### **🧑‍💻 DEV 1: SUPABASE + MIGRACIÓN BD (8 horas)**
```bash
TASK: Migrar de SQLite → Supabase + Cargar catálogo

MORNING (09:00-13:00):
□ Setup Supabase proyecto producción
□ Crear schema completo (conversations, messages, agents, product_images)
□ Configurar RLS (Row Level Security) básico
□ Testing conexión desde backend local

AFTERNOON (14:00-18:00):
□ Migrar database.service.ts → supabase.service.ts
□ Cargar c_embler_ml.json en tabla product_images (32MB)
□ Migrar datos de desarrollo existentes
□ Testing CRUD completo + performance

DELIVERABLE: Base de datos real funcionando con catálogo cargado
```

### **🧑‍💻 DEV 2: WHATSAPP CLOUD API REAL (8 horas)**
```bash
TASK: De webhook simulado → WhatsApp Business API real

MORNING (09:00-13:00):
□ Configurar número de prueba WhatsApp Business
□ Setup webhook público (ngrok/cloudflare tunnel)
□ Implementar webhook verification de Meta
□ Testing envío/recepción mensajes básicos

AFTERNOON (14:00-18:00):
□ Integrar webhook con whatsapp.service.ts existente
□ Persistir TODOS los mensajes en Supabase
□ Testing flujo: Cliente → Webhook → BD → Frontend
□ Error handling y retry logic

DELIVERABLE: WhatsApp funcionando con mensajes reales persistidos
```

### **🧑‍💻 DEV 3: CI/CD + INFRAESTRUCTURA (8 horas)**
```bash
TASK: Setup deployment automático y environments

MORNING (09:00-13:00):
□ GitHub Actions workflow básico
□ Docker containers optimizados (frontend/backend)
□ Environment variables management
□ Setup staging environment

AFTERNOON (14:00-18:00):
□ Pipeline: git push → build → test → deploy
□ Health checks y monitoring básico
□ SSL certificates y dominio
□ Backup automático Supabase

DELIVERABLE: Sistema deployable con CI/CD funcional
```

**🎯 META DÍA 1**: Sistema base funcionando con WhatsApp real + Supabase + CI/CD

---

## **DÍA 2 (MARTES) - FUNCIONALIDADES CORE**
*"Funcionalidades principales funcionando"*

### **🧑‍💻 DEV 1: LAYOUT HITLCHAT (8 horas)**
```bash
TASK: Implementar interfaz 3 columnas requerida

MORNING (09:00-13:00):
□ Restructurar Chats.tsx con layout específico
□ Sidebar (300px): Search + Filters + Lista conversaciones
□ Chat Area (flex): Header + Messages + Quick Actions + Input
□ Responsive design básico

AFTERNOON (14:00-18:00):
□ ClientPanel (350px): Info cliente + Timer + Actions
□ Quick action buttons funcionales
□ Conversation expiry timer (5 minutos)
□ Estados visuales (AI Mode, Human Active, etc.)

DELIVERABLE: Layout HitlChat completo y funcional
```

### **🧑‍💻 DEV 2: OCR + ANÁLISIS IMÁGENES (8 horas)**
```bash
TASK: Sistema OCR para análisis de imágenes clientes

MORNING (09:00-13:00):
□ Integrar Tesseract.js en backend
□ Endpoint POST /api/ocr/analyze-image
□ Pipeline: WhatsApp imagen → Download → OCR → Análisis
□ Detección patrones VIN (17 caracteres alfanuméricos)

AFTERNOON (14:00-18:00):
□ Detección códigos de productos en imágenes
□ Integración con VIN decoder existente (API Ninjas)
□ Cache resultados OCR (evitar reprocesar)
□ Testing con imágenes reales de VINs

DELIVERABLE: OCR funcional con detección VIN y códigos
```

### **🧑‍💻 DEV 3: WEBSOCKETS + TIEMPO REAL (8 horas)**
```bash
TASK: Sincronización tiempo real entre agentes

MORNING (09:00-13:00):
□ Refactor completo WebSocket service
□ Eventos: new_message, conversation_updated, agent_typing
□ Heartbeat y reconnection automática
□ Testing múltiples conexiones simultáneas

AFTERNOON (14:00-18:00):
□ Typing indicators visuales entre agentes
□ Lock conversation cuando agente está escribiendo
□ Notificaciones push para mensajes nuevos
□ Sincronización estados AI/Human en tiempo real

DELIVERABLE: Sistema tiempo real completamente funcional
```

**🎯 META DÍA 2**: UI completa + OCR + Tiempo real funcionando

---

## **DÍA 3 (MIÉRCOLES) - SISTEMA DE GESTIÓN**
*"Takeover, ventas y resumen IA"*

### **🧑‍💻 DEV 1: COMPONENTE RESUMEN IA (8 horas)**
```bash
TASK: Panel derecho con resumen inteligente

MORNING (09:00-13:00):
□ AISummaryComponent.tsx completo
□ Integración con chatbot.service.ts existente
□ Display vehículo detectado (marca, modelo, año)
□ Lista productos consultados con precios

AFTERNOON (14:00-18:00):
□ Indicadores intención de compra (low/medium/high)
□ Estado conversación visual con progress bar
□ Auto-refresh cada 30 segundos
□ Confidence scoring visual (0-100%)

DELIVERABLE: Resumen IA funcionando en panel derecho
```

### **🧑‍💻 DEV 2: SISTEMA TAKEOVER (8 horas)**
```bash
TASK: Asignación agente/IA persistente

MORNING (09:00-13:00):
□ Estados AI/Human persistentes en Supabase
□ Lógica asignación: unassigned → assigned → released
□ Timeout automático 5 minutos inactividad
□ Queue conversaciones no asignadas

AFTERNOON (14:00-18:00):
□ Sistema clientes fieles (lock por vendedor específico)
□ Notificaciones agentes cuando hay conversaciones disponibles
□ UI botones: "Tomar conversación", "Liberar", "Toggle AI"
□ Historial: quién ha atendido al cliente antes

DELIVERABLE: Takeover funcional con timeout y persistencia
```

### **🧑‍💻 DEV 3: SISTEMA VENTAS BÁSICO (8 horas)**
```bash
TASK: Flujo cotización y cierre básico

MORNING (09:00-13:00):
□ Generador cotizaciones automáticas
□ Integración con soapService.consultarInventario existente
□ Template cotización para WhatsApp
□ Cálculo precios + IVA + descuentos

AFTERNOON (14:00-18:00):
□ Flujo cierre venta: cotización → confirmación → ticket
□ Generación tickets básicos (PDF/texto)
□ Tracking comisiones por agente
□ Reportes ventas simples por día

DELIVERABLE: Sistema ventas básico funcional
```

**🎯 META DÍA 3**: Takeover + Ventas + Resumen IA completamente funcional

---

## **DÍA 4 (JUEVES) - TESTING E INTEGRACIÓN**
*"Todo funcionando perfecto"*

### **🧑‍💻 DEV 1: TESTING COMPLETO (8 horas)**
```bash
TASK: Validar todo el sistema end-to-end

MORNING (09:00-13:00):
□ Testing E2E con número WhatsApp real
□ Flujos completos: Cliente → IA → Agente → Cotización → Venta
□ Testing OCR con imágenes VIN reales
□ Testing múltiples agentes simultáneos

AFTERNOON (14:00-18:00):
□ Load testing básico (simular 10 conversaciones simultáneas)
□ Testing failover y recovery
□ Performance profiling y optimizations
□ Bug fixing crítico

DELIVERABLE: Sistema completamente testeado y optimizado
```

### **🧑‍💻 DEV 2: INTEGRACIÓN Y POLISH (8 horas)**
```bash
TASK: Pulir integración entre todos los componentes

MORNING (09:00-13:00):
□ Resolver conflicts entre features desarrollados en paralelo
□ UX improvements y polish visual
□ Error handling robusto en todos los flows
□ Validaciones de input y sanitización

AFTERNOON (14:00-18:00):
□ Logging estructurado y debugging tools
□ Fallback systems para APIs externas
□ Security hardening básico
□ Code review y refactoring

DELIVERABLE: Sistema pulido y robusto
```

### **🧑‍💻 DEV 3: CI/CD PRODUCCIÓN (8 horas)**
```bash
TASK: Pipeline producción y monitoring

MORNING (09:00-13:00):
□ Environment producción completo
□ SSL, dominio y configuración DNS
□ Database migrations automáticas
□ Secret management seguro

AFTERNOON (14:00-18:00):
□ Monitoring y alertas básicas (Uptime, errors)
□ Backup strategies y testing recovery
□ Rollback procedures automáticos
□ Health checks completos

DELIVERABLE: Sistema listo para producción con monitoring
```

**🎯 META DÍA 4**: Sistema 100% funcional y listo para producción

---

## **DÍA 5 (VIERNES) - PREPARACIÓN ESCALADO**
*"Preparar para 40 números"*

### **🧑‍💻 DEV 1: ESTRUCTURA MULTI-SUCURSAL (8 horas)**
```bash
TASK: Preparar infraestructura para 40 números

MORNING (09:00-13:00):
□ Diseño esquema BD para sucursales
□ Routing logic por sucursal (número → sucursal)
□ Configuración template para múltiples números
□ Testing con 2-3 números como POC

AFTERNOON (14:00-18:00):
□ Dashboard filtros por sucursal
□ Assignment rules específicos por sucursal
□ Documentation para configurar 40 números
□ Migration plan gradual por sucursal

DELIVERABLE: Infraestructura preparada para multi-sucursal
```

### **🧑‍💻 DEV 2: OPTIMIZACIONES FINALES (8 horas)**
```bash
TASK: Performance y deployment final

MORNING (09:00-13:00):
□ Database query optimization
□ Frontend bundle optimization y lazy loading
□ Caching strategies (Redis setup básico)
□ Memory leak detection y fixes

AFTERNOON (14:00-18:00):
□ Production deployment final
□ DNS configuration y SSL
□ Final testing en ambiente producción
□ Go-live checklist completo

DELIVERABLE: Sistema deployado y optimizado en producción
```

### **🧑‍💻 DEV 3: DOCUMENTACIÓN (8 horas)**
```bash
TASK: Documentación completa para handover

MORNING (09:00-13:00):
□ User manual para agentes (cómo usar el sistema)
□ Admin documentation (configuración, maintenance)
□ API documentation completa
□ Troubleshooting guide

AFTERNOON (14:00-18:00):
□ Training materials para nuevos agentes
□ Video tutorial básico de uso
□ Deployment runbooks para DevOps
□ Roadmap siguiente fase (40 números)

DELIVERABLE: Documentación completa y training materials
```

**🎯 META DÍA 5**: Sistema en producción + Documentado + Preparado para scale

---

## ⚙️ **CONFIGURACIÓN TÉCNICA NECESARIA**

### **🔧 Variables de Entorno Críticas**
```bash
# Supabase (DEV 1 - Día 1)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# WhatsApp Business API (DEV 2 - Día 1)
WHATSAPP_ACCESS_TOKEN=EAAF... (Meta Business token)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WEBHOOK_VERIFY_TOKEN=mi_token_secreto_webhook_2024
WHATSAPP_WEBHOOK_URL=https://tu-dominio.com/api/chat/webhook

# APIs Externas (Ya configuradas)
OPENROUTER_API_KEY=sk-or-v1-xxx (Ya tenemos)
NINJA_API_VIN_KEY=tu-ninja-api-key

# Aplicación
NODE_ENV=production
PORT=3002
JWT_SECRET=ultra_secure_jwt_secret_256_bits
FRONTEND_URL=https://tu-dominio.com
```

### **🗄️ Schema Supabase Crítico**
```sql
-- Tabla principal de mensajes (TODO el historial)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  whatsapp_message_id VARCHAR(255) UNIQUE,
  sender_type VARCHAR(20) NOT NULL, -- 'client', 'agent', 'ai'
  sender_id VARCHAR(255),
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  media_url VARCHAR(1000),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_delivered BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversaciones
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  client_name VARCHAR(255),
  ai_mode VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
  assigned_agent_id UUID,
  locked_until TIMESTAMP WITH TIME ZONE,
  is_faithful_client BOOLEAN DEFAULT FALSE,
  faithful_client_agent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catálogo productos con imágenes (32MB JSON)
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(500),
  categoria VARCHAR(500),
  imagen_1 VARCHAR(1000), -- URL MercadoLibre
  imagen_2 VARCHAR(1000),
  imagen_3 VARCHAR(1000),
  imagen_4 VARCHAR(1000),
  imagen_5 VARCHAR(1000),
  imagen_6 VARCHAR(1000),
  imagen_7 VARCHAR(1000),
  imagen_8 VARCHAR(1000),
  imagen_9 VARCHAR(1000),
  imagen_10 VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices críticos para performance
CREATE INDEX idx_messages_conversation_timestamp ON messages(conversation_id, timestamp DESC);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_conversations_phone ON conversations(phone_number);
CREATE INDEX idx_conversations_agent ON conversations(assigned_agent_id);
```

### **🐳 Stack Tecnológico Final**
```bash
Frontend: React 18 + TypeScript + Tailwind + Vite
Backend: Node.js + Express + TypeScript
Database: Supabase (PostgreSQL)
Real-time: Socket.IO + Supabase Realtime
Cache: Redis básico (opcional)
OCR: Tesseract.js (local, sin Google Vision)
APIs: OpenRouter + API Ninjas + WhatsApp Cloud
CI/CD: GitHub Actions
Hosting: Railway/Vercel/DigitalOcean
Monitoring: Supabase Dashboard + custom health checks
```

---

## 📊 **MÉTRICAS DE ÉXITO (Viernes 18:00)**

### **✅ FUNCIONALES - DEBE FUNCIONAR**
- [ ] **WhatsApp Real**: Enviar/recibir mensajes con número de prueba
- [ ] **Persistencia**: 100% mensajes guardados en Supabase
- [ ] **Layout HitlChat**: 3 columnas implementadas exactamente como requerido
- [ ] **OCR**: Analizar imagen → detectar VIN → responder automáticamente
- [ ] **Takeover**: Agente puede tomar/liberar conversación con timeout 5min
- [ ] **Resumen IA**: Panel derecho mostrando datos inteligentes
- [ ] **Cotizaciones**: Generar cotización automática y enviar por WhatsApp
- [ ] **Tiempo Real**: Mensajes aparecen instantáneamente en todos los agentes

### **⚡ TÉCNICOS - DEBE SER ROBUSTO**
- [ ] **Uptime**: > 99% durante 48h testing continuo
- [ ] **Performance**: Respuesta < 500ms para operaciones comunes
- [ ] **Concurrencia**: 5+ agentes simultáneos sin problemas
- [ ] **Recovery**: Sistema se recupera automáticamente de fallos
- [ ] **CI/CD**: Deploy automático con git push funcional
- [ ] **Monitoring**: Alertas básicas funcionando
- [ ] **Security**: Headers, validación input, sanitización

### **🚀 PREPARACIÓN ESCALADO - DEBE ESTAR LISTO**
- [ ] **Documentación**: Completa para operación y training
- [ ] **Multi-sucursal**: Estructura preparada para 40 números
- [ ] **Configuración**: Template para agregar números fácilmente
- [ ] **Performance**: Benchmarks para escalar con confianza
- [ ] **Monitoring**: Métricas para detectar problemas temprano
- [ ] **Backup**: Procedimientos de backup/recovery documentados

---

## 🚨 **RIESGOS Y CONTINGENCIAS**

### **🔴 RIESGOS ALTOS**
1. **WhatsApp API Approval**: Si Meta rechaza el número de prueba
   - **Contingencia**: Usar simulador mientras se resuelve
2. **Supabase Performance**: Si la migración es lenta con 32MB JSON
   - **Contingencia**: Cargar en batches, usar worker background
3. **Team Sync**: 3 devs trabajando en paralelo pueden generar conflicts
   - **Contingencia**: Daily sync a las 10:00 y 16:00

### **🟡 RIESGOS MEDIOS**
1. **OCR Accuracy**: Tesseract.js puede tener baja precisión
   - **Contingencia**: Ajustar preprocessing, considerar Google Vision
2. **WebSocket Stability**: Muchas conexiones pueden ser inestables
   - **Contingencia**: Fallback a polling, optimizar heartbeat
3. **CI/CD Complexity**: Pipeline puede ser complejo para 3 repos
   - **Contingencia**: Manual deployment como backup

### **🟢 RIESGOS BAJOS**
1. **UI Polish**: Puede no quedar perfecto visualmente
   - **Contingencia**: Funcionalidad over estética
2. **Documentation**: Puede quedar incompleta
   - **Contingencia**: Mínimo viable, completar post-sprint

---

## 📞 **COMUNICACIÓN Y SYNC**

### **📅 Daily Standups**
- **Horario**: 09:00 AM (15 minutos máximo)
- **Formato**: Qué hice ayer / Qué haré hoy / Blockers
- **Focus**: Identificar dependencies entre devs

### **🔄 Integration Points**
- **Día 1 EOD**: Supabase + WhatsApp + CI/CD funcionando
- **Día 2 EOD**: UI + OCR + WebSockets integrados
- **Día 3 EOD**: Takeover + Ventas + Resumen funcionando juntos
- **Día 4 EOD**: Sistema completo testing
- **Día 5 EOD**: Deployment y documentación

### **🆘 Escalation Protocol**
- **Blockers < 2 horas**: Sync inmediato entre devs afectados
- **Blockers > 2 horas**: Escalate a lead/PM
- **Riesgo timeline**: Re-priorizar features, focus en core

---

## 🎯 **DEFINITION OF DONE**

### **Para cada Feature:**
- [ ] **Código**: Desarrollado y code review
- [ ] **Testing**: Unit tests + manual testing
- [ ] **Integration**: Funciona con otros componentes
- [ ] **Documentation**: Básica en código y README
- [ ] **Deployed**: En staging environment

### **Para el Sprint:**
- [ ] **WhatsApp**: Mensajes reales funcionando end-to-end
- [ ] **Database**: Migración completa a Supabase
- [ ] **UI**: Layout HitlChat implementado
- [ ] **Features**: OCR + Takeover + Ventas funcionando
- [ ] **Infrastructure**: CI/CD + Monitoring básico
- [ ] **Docs**: User guide + technical docs
- [ ] **Handover**: Team puede operar el sistema

---

**🚀 ¿LISTOS PARA EL SPRINT?**

**Start Date**: $(date '+%Y-%m-%d')  
**End Date**: $(date -d '+5 days' '+%Y-%m-%d')  
**Success Criteria**: Sistema WhatsApp Business funcional listo para escalar a 40 números  

💪 **LET'S BUILD THIS!** 