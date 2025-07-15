# 📋 Limitaciones Actuales y Migración a Supabase

## 🚨 Limitaciones Actuales del Sistema

### 1. **Datos Simulados**
- ❌ **Takeover Manual**: Los modos AI (activo/inactivo) se almacenan solo en memoria
- ❌ **Resúmenes de Conversación**: Se generan con datos de ejemplo, no conversaciones reales
- ❌ **Historial de Conversaciones**: No se persisten en base de datos real

### 2. **Persistencia Limitada**
- ❌ **Reinicio del Servidor**: Se pierden todos los estados de AI Mode y cache de resúmenes
- ❌ **Sin Base de Datos**: Prisma+SQLite solo maneja contactos básicos
- ❌ **Cache Temporal**: Los resúmenes solo viven en memoria (24h TTL teórico)

### 3. **Funcionalidad Restringida**
- ❌ **WebSockets Simulados**: Las notificaciones en tiempo real no persisten
- ❌ **Asignación de Agentes**: No hay tabla real de agentes en BD
- ❌ **Historial de Cambios**: No se registran cambios de modo AI
- ❌ **Métricas**: No se pueden generar reportes de uso

### 4. **Escalabilidad**
- ❌ **Un Solo Servidor**: No funciona en múltiples instancias
- ❌ **Sin Clustering**: El estado se pierde entre deployments
- ❌ **Cache Distribuido**: Cada instancia tendría su propio cache

---

## 🎯 Migración Requerida a Supabase

### **Estado Actual del Proyecto**
```
┌─ Prisma + SQLite ─────────────────┐
│ ✅ Contactos                      │
│ ✅ Mensajes básicos               │
│ ❌ Conversaciones                 │
│ ❌ Estados AI                     │
│ ❌ Resúmenes                      │
└───────────────────────────────────┘

┌─ Supabase (Configurado) ──────────┐
│ ✅ Configuración lista            │
│ ✅ Cliente configurado            │
│ ❌ Tablas no creadas              │
│ ❌ Funciones no activadas         │
└───────────────────────────────────┘
```

### **1. Tablas Necesarias en Supabase**

#### `conversations`
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_conversation_id VARCHAR(255) UNIQUE NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    ai_mode conversation_ai_mode DEFAULT 'active',
    assigned_agent_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TYPE conversation_ai_mode AS ENUM ('active', 'inactive');
```

#### `conversation_summaries`
```sql
CREATE TABLE conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    summary_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by VARCHAR(50) DEFAULT 'gemini-pro',
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id)
);
```

#### `conversation_mode_history`
```sql
CREATE TABLE conversation_mode_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    previous_mode conversation_ai_mode,
    new_mode conversation_ai_mode NOT NULL,
    changed_by_agent_id UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);
```

### **2. Funciones RLS (Row Level Security)**

```sql
-- Política para conversations
CREATE POLICY "Users can view all conversations" ON conversations
    FOR SELECT USING (true);

CREATE POLICY "Users can update conversations" ON conversations
    FOR UPDATE USING (true);

-- Política para conversation_summaries
CREATE POLICY "Users can view all summaries" ON conversation_summaries
    FOR SELECT USING (true);

CREATE POLICY "Users can insert summaries" ON conversation_summaries
    FOR INSERT WITH CHECK (true);
```

### **3. Índices para Performance**

```sql
-- Índices principales
CREATE INDEX idx_conversations_whatsapp_id ON conversations(whatsapp_conversation_id);
CREATE INDEX idx_conversations_phone ON conversations(contact_phone);
CREATE INDEX idx_conversations_ai_mode ON conversations(ai_mode);
CREATE INDEX idx_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX idx_summaries_expires_at ON conversation_summaries(expires_at);
```

---

## 🔧 Cambios de Código Necesarios

### **1. Activar Funciones de Database Service**

**Archivo**: `src/services/database.service.ts`

```typescript
// CAMBIAR DE:
// return { success: true }; // SIMULADO

// A:
const { error } = await this.supabase
  .from('conversations')
  .upsert({
    whatsapp_conversation_id: conversationId,
    ai_mode: mode,
    assigned_agent_id: agentId,
    updated_at: new Date().toISOString()
  });

return { success: !error, error: error?.message };
```

### **2. Activar Resúmenes Reales**

**Archivo**: `src/services/database.service.ts`

```typescript
// Reemplazar datos simulados por consulta real:
const { data: messages } = await this.supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

### **3. Configurar Tiempo Real**

```typescript
// Suscribirse a cambios en Supabase
this.supabase
  .channel('conversation_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'conversations' },
    (payload) => {
      this.io?.emit('conversation_ai_mode_changed', payload);
    }
  )
  .subscribe();
```

---

## ⚡ Plan de Migración (Paso a Paso)

### **Fase 1: Preparación (1-2 horas)**
1. ✅ **Crear tablas en Supabase** (SQL scripts listos)
2. ✅ **Configurar RLS policies**
3. ✅ **Crear índices de performance**
4. ✅ **Verificar conexión Supabase**

### **Fase 2: Migración Gradual (2-3 horas)**
1. 🔄 **Activar `setConversationAIMode()`**
2. 🔄 **Activar `getConversationAIMode()`**
3. 🔄 **Migrar datos de conversaciones existentes**
4. 🔄 **Activar resúmenes con datos reales**

### **Fase 3: Testing (1 hora)**
1. 🧪 **Probar takeover manual**
2. 🧪 **Verificar resúmenes reales**
3. 🧪 **Confirmar persistencia**
4. 🧪 **Testing de WebSockets**

### **Fase 4: Cleanup (30 min)**
1. 🧹 **Remover código simulado**
2. 🧹 **Limpiar TODOs en código**
3. 📝 **Actualizar documentación**

---

## 🚀 Beneficios Post-Migración

### **Funcionalidad Completa**
- ✅ **Persistencia Real**: Estados y resúmenes sobreviven reinicios
- ✅ **Escalabilidad**: Funciona con múltiples instancias
- ✅ **Tiempo Real**: WebSockets nativos de Supabase
- ✅ **Métricas**: Reportes y analytics completos

### **Operacional**
- ✅ **Backup Automático**: Supabase maneja respaldos
- ✅ **Alta Disponibilidad**: Infraestructura robusta
- ✅ **Monitoreo**: Dashboard y logs integrados
- ✅ **API REST**: Endpoints automáticos generados

### **Desarrollo**
- ✅ **Desarrollo Local**: Supabase CLI para testing
- ✅ **Migraciones**: Control de versiones de BD
- ✅ **TypeScript**: Tipos automáticos generados

---

## 💰 Consideraciones de Costos

### **Supabase Pricing (Actualizado 2024)**
- **Tier Gratuito**: 50,000 requests/mes, 500MB storage
- **Pro ($25/mes)**: 5M requests/mes, 8GB storage
- **OpenRouter**: $0.0015 por 1K tokens (resúmenes ~500 tokens)

### **Optimizaciones Implementadas**
- ✅ **Cache de 24h**: Reduce llamadas a LLM
- ✅ **Memoria + BD**: Híbrido para performance
- ✅ **Temperature 0.3**: Respuestas más consistentes
- ✅ **Expiración automática**: Limpia datos antiguos

---

## 📞 Próximos Pasos

1. **Inmediato**: Probar funcionalidad actual con datos simulados
2. **Esta Semana**: Ejecutar migración a Supabase (4-6 horas)
3. **Validación**: Testing completo con datos reales
4. **Deploy**: Activar en producción

> ⚠️ **Importante**: El sistema actual es completamente funcional para testing, pero requiere migración a Supabase para uso en producción. 