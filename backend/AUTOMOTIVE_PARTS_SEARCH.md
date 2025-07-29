# Sistema de Búsqueda de Piezas Automotrices

## 🎯 Objetivo

Implementar un chatbot que busque piezas automotrices usando solo:
- **Marca del auto**
- **Modelo del auto** 
- **Nombre de la pieza**

Y devuelva únicamente:
- **Clave de la pieza**
- **Marca de la pieza**

## 🏗️ Arquitectura

### **Servicios Principales**

#### **1. AutomotivePartsSearchService**
- **Archivo:** `src/services/automotive-parts-search.service.ts`
- **Función:** Búsqueda especializada de piezas automotrices
- **Características:**
  - Normalización de términos usando `conceptos_json`
  - Búsqueda en `c_embler_json` con filtros específicos
  - Cálculo de confianza para coincidencias parciales
  - Verificación de compatibilidad con el auto
  - Formateo de respuestas solo con clave y marca

#### **2. AutomotivePartsConversationService**
- **Archivo:** `src/services/conversation/automotive-parts-conversation.service.ts`
- **Función:** Integración conversacional para búsqueda de piezas
- **Características:**
  - Extracción automática de información del mensaje
  - Validación de datos completos (marca, modelo, pieza)
  - Búsqueda automática cuando hay información completa
  - Conversación guiada para obtener información faltante
  - Generación de respuestas contextuales

#### **3. Función LLM buscarPiezaAutomotriz**
- **Archivo:** `src/services/llm/function-service.ts`
- **Función:** Búsqueda automática mediante LLM
- **Características:**
  - Integración con OpenRouter
  - Búsqueda específica por marca, modelo y pieza
  - Formateo de respuestas según requerimientos
  - Manejo de errores y casos sin resultados

## 📊 Flujo de Búsqueda

### **1. Recepción del Mensaje**
```
Usuario: "Necesito balatas para mi Toyota Corolla 2018"
```

### **2. Extracción de Información**
```typescript
{
  marca: 'toyota',
  modelo: 'corolla',
  año: 2018,
  pieza: 'balatas'
}
```

### **3. Normalización del Término**
- Usar `conceptos_json` para normalizar términos coloquiales
- Ejemplo: "balatas" → "pastillas de freno"

### **4. Búsqueda en Base de Datos**
- Buscar en `c_embler_json` usando el término normalizado
- Filtrar por compatibilidad con marca y modelo
- Calcular confianza de coincidencia

### **5. Formateo de Respuesta**
```
✅ Encontré esta pieza para tu Toyota Corolla:

🔑 Clave: ABC123
🏷️ Marca: BREMBO
📝 Descripción: PASTILLAS DE FRENO DELANTERAS TOYOTA COROLLA
```

## 🔧 Configuración

### **Base de Datos**

#### **Tabla conceptos_json**
```sql
CREATE TABLE conceptos_json (
  id SERIAL PRIMARY KEY,
  catalogo JSONB -- {pieza: "balatas", variantes: ["pastillas de freno"]}
);
```

#### **Tabla c_embler_json**
```sql
CREATE TABLE c_embler_json (
  id SERIAL PRIMARY KEY,
  catalogo JSONB -- {Clave: "ABC123", Nombre: "BALATA FRENO DELANTERO TOYOTA COROLLA"}
);
```

### **Índices Recomendados**
```sql
-- Índice para búsqueda en conceptos
CREATE INDEX idx_conceptos_json_catalogo 
ON conceptos_json USING GIN (catalogo);

-- Índice para búsqueda en c_embler_json
CREATE INDEX idx_c_embler_json_catalogo 
ON c_embler_json USING GIN (catalogo);

CREATE INDEX idx_c_embler_json_nombre 
ON c_embler_json USING GIN ((catalogo->>'Nombre'));
```

## 🧪 Pruebas

### **Ejecutar Pruebas**
```bash
npm run test:automotive-parts
```

### **Casos de Prueba Incluidos**
1. **Búsqueda directa** - Balatas Toyota Corolla
2. **Términos coloquiales** - Pastillas de freno Honda Civic
3. **Sin año específico** - Filtros Nissan Sentra
4. **Con año específico** - Batería Ford Focus 2020

### **Ejemplo de Salida**
```
🧪 Iniciando pruebas de búsqueda de piezas automotrices...

🔍 Probando: Búsqueda directa - Balatas Toyota Corolla
Mensaje: "Necesito balatas para mi Toyota Corolla 2018"
✅ Extracción exitosa:
   Marca: toyota
   Modelo: corolla
   Año: 2018
   Pieza: balatas
✅ Búsqueda exitosa: 2 resultados
   1. Clave: ABC123 | Marca: BREMBO | Compatible: true
   2. Clave: DEF456 | Marca: AKEBONO | Compatible: true
```

## 📋 Uso del Sistema

### **1. Búsqueda Directa**
```typescript
import { AutomotivePartsSearchService } from './services/automotive-parts-search.service';

const service = new AutomotivePartsSearchService();
const result = await service.searchAutomotiveParts(
  'balatas',
  { marca: 'toyota', modelo: 'corolla', año: 2018 }
);
```

### **2. Conversación Integrada**
```typescript
import { AutomotivePartsConversationService } from './services/conversation/automotive-parts-conversation.service';

const service = new AutomotivePartsConversationService();
const response = await service.processAutomotivePartsConversation({
  conversationId: 'conv-123',
  userId: 'user-456',
  phoneNumber: '5512345678',
  message: 'Necesito balatas para mi Toyota Corolla 2018',
  pointOfSaleId: 'pos-001'
});
```

### **3. Función LLM**
```typescript
// La función se ejecuta automáticamente cuando el LLM detecta
// una búsqueda de piezas automotrices
{
  "name": "buscarPiezaAutomotriz",
  "parameters": {
    "nombrePieza": "balatas",
    "marcaAuto": "toyota",
    "modeloAuto": "corolla",
    "añoAuto": 2018
  }
}
```

## 🎯 Características Implementadas

### ✅ **Funcionalidades Completadas**
- [x] Normalización de términos usando `conceptos_json`
- [x] Búsqueda en `c_embler_json` con filtros específicos
- [x] Cálculo de confianza para coincidencias parciales
- [x] Verificación de compatibilidad con marca y modelo
- [x] Formateo de respuestas solo con clave y marca
- [x] Extracción automática de información del mensaje
- [x] Validación de datos completos
- [x] Búsqueda automática cuando hay información completa
- [x] Conversación guiada para información faltante
- [x] Función LLM para búsqueda automática
- [x] Scripts de prueba y validación
- [x] Documentación completa

### 🔄 **Flujo de Trabajo**
1. **Recepción del mensaje** del usuario
2. **Extracción automática** de marca, modelo y pieza
3. **Normalización** del término usando conceptos
4. **Búsqueda** en la base de datos
5. **Verificación** de compatibilidad
6. **Formateo** de respuesta con clave y marca
7. **Entrega** de resultado al usuario

## 🚀 Métricas de Éxito

### **Funcionales**
- ✅ Extracción correcta de marca, modelo y pieza
- ✅ Búsqueda exitosa en `c_embler_json`
- ✅ Normalización de términos coloquiales
- ✅ Respuestas solo con clave y marca
- ✅ Verificación de compatibilidad

### **Técnicas**
- ⚡ Tiempo de respuesta < 2 segundos
- 🎯 Precisión de búsqueda > 85%
- 🔍 Cobertura de términos coloquiales > 90%
- 💾 Uso eficiente de memoria
- 🛡️ Manejo robusto de errores

## 🔧 Troubleshooting

### **Problemas Comunes**

#### **1. Sin resultados de búsqueda**
- Verificar que el término esté en `conceptos_json`
- Comprobar que existan registros en `c_embler_json`
- Validar que la marca y modelo estén escritos correctamente

#### **2. Extracción incorrecta de información**
- Revisar los patrones regex en `extractCarAndPartInfo`
- Verificar que el mensaje contenga marca, modelo y pieza
- Comprobar la normalización de términos

#### **3. Errores de conexión a base de datos**
- Verificar configuración de Supabase
- Comprobar índices en las tablas
- Validar permisos de acceso

### **Logs de Debug**
```bash
# Ver logs detallados
npm run dev

# Ejecutar pruebas específicas
npm run test:automotive-parts
```

## 📚 Referencias

- [Conceptos JSON](../public/embler/inventario/conceptos.json)
- [Configuración de Supabase](../src/config/supabase.ts)
- [Motor de Conversación](../src/services/conversation/advanced-conversation-engine.ts)
- [Servicio de Funciones LLM](../src/services/llm/function-service.ts)