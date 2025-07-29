# Flujo de Conversación Natural - Embler Chatbot

## 🎯 Objetivo

Implementar un sistema de conversación natural que mantenga contexto, evite saludos repetitivos y use referencias apropiadas para crear una experiencia conversacional fluida y humana.

## 📋 Características Implementadas

### 1. **Continuidad Contextual**
- **Primera interacción del día**: Saludo apropiado según la hora
- **Conversación en curso**: Referencias a consultas anteriores
- **Usuario recurrente**: Personalización basada en historial

### 2. **Memoria Conversacional**
- **Productos mencionados**: Recuerda productos de conversaciones anteriores
- **Preferencias aprendidas**: Adapta respuestas según patrones del usuario
- **Información del vehículo**: Mantiene contexto del auto del cliente
- **Marcas preferidas**: Respeta preferencias de marca del usuario

### 3. **Transiciones Naturales**
- **Cambio de tema**: "Cambiando de tema..." o "Ahora, respecto a..."
- **Retorno a tema**: "Volviendo a lo anterior..." o "Retomando..."
- **Información adicional**: "Por cierto..." o "Mientras tanto..."

### 4. **Personalización Inteligente**
- **Tono adaptativo**: Formal, casual o técnico según el usuario
- **Horarios apropiados**: Saludos según momento del día
- **Cliente VIP**: Atención preferencial
- **Patrones de comportamiento**: Adaptación según necesidades detectadas

### 5. **Evitar Repeticiones**
- **NO saludos repetitivos**: Solo saluda en primera interacción
- **NO información duplicada**: Usa referencias en lugar de repetir
- **Contexto mantenido**: Conserva información entre mensajes

## 🔧 Implementación Técnica

### Estructura de Archivos Modificados

```
backend/src/services/conversation/
├── dynamic-prompt-generator.ts    # Generador de prompts mejorado
├── conversation-memory.ts         # Sistema de memoria conversacional
└── advanced-conversation-engine.ts # Motor de conversación principal
```

### Componentes Clave

#### 1. **DynamicPromptGenerator**
- **Prompt principal**: Reglas fundamentales de conversación natural
- **Prompt de continuidad**: Específico para conversaciones en curso
- **Modificadores contextuales**: Personalización según usuario y contexto
- **Transiciones**: Instrucciones para cambios de tema naturales

#### 2. **ConversationMemory**
- **Memoria a corto plazo**: Contexto de la conversación actual
- **Memoria a largo plazo**: Perfil del usuario y preferencias
- **Memoria de trabajo**: Información temporal necesaria
- **Análisis de patrones**: Detección de comportamientos del usuario

#### 3. **AdvancedConversationEngine**
- **Detección de continuidad**: Determina si usar prompt de continuidad
- **Gestión de contexto**: Mantiene información entre mensajes
- **Aprendizaje**: Mejora respuestas basado en interacciones

## 📊 Flujo de Funcionamiento

### 1. **Primera Interacción**
```
Usuario: "Hola, necesito balatas para mi Toyota Corolla 2018"
Chatbot: "¡Buenos días! Te ayudo a encontrar las balatas para tu Toyota Corolla 2018..."
```

### 2. **Continuación de Conversación**
```
Usuario: "¿Tienes en stock?"
Chatbot: "Continuemos con las balatas que buscabas. Déjame verificar el inventario..."
```

### 3. **Cambio de Tema**
```
Usuario: "¿Y para Honda Civic 2020?"
Chatbot: "Cambiando de tema, busquemos balatas para tu Honda Civic 2020..."
```

### 4. **Retorno a Tema Anterior**
```
Usuario: "Volvamos al Toyota"
Chatbot: "Retomando lo que buscabas para tu Toyota Corolla 2018..."
```

## 🧪 Pruebas Implementadas

### Script de Prueba: `test-natural-conversation-flow.ts`

Prueba los siguientes escenarios:
1. **Primera interacción**: Verifica saludo apropiado
2. **Continuación**: Verifica ausencia de saludos repetitivos
3. **Cambio de tema**: Verifica transiciones naturales
4. **Retorno**: Verifica referencias a temas anteriores
5. **Contexto**: Verifica mantenimiento de información

### Ejecutar Pruebas
```bash
cd backend
npm run test:natural-flow
```

## 🎨 Ejemplos de Uso

### Escenario 1: Cliente Nuevo
```
Usuario: "Hola, busco filtro de aceite"
Chatbot: "¡Buenas tardes! Te ayudo a encontrar el filtro de aceite. ¿Para qué marca y modelo de auto lo necesitas?"
```

### Escenario 2: Cliente Recurrente
```
Usuario: "Hola de nuevo"
Chatbot: "¡Hola de nuevo! ¿Qué necesitas hoy? ¿Continuamos con algo específico o tienes una nueva consulta?"
```

### Escenario 3: Continuación de Búsqueda
```
Usuario: "¿Tienes para Honda Civic 2020?"
Chatbot: "Perfecto, busquemos filtros de aceite para tu Honda Civic 2020. Déjame consultar el inventario..."
```

### Escenario 4: Cambio de Producto
```
Usuario: "¿Y balatas?"
Chatbot: "Cambiando de tema, busquemos balatas para tu Honda Civic 2020. ¿Qué tipo de balatas necesitas?"
```

## 🔄 Configuración

### Variables de Entorno
```env
# Habilitar prompts dinámicos
ENABLE_DYNAMIC_PROMPTS=true

# Configuración de memoria
CONVERSATION_MEMORY_TIMEOUT=30 # minutos
MAX_CONVERSATION_LENGTH=50 # mensajes
```

### Configuración del Motor
```typescript
const config = {
  enableDynamicPrompts: true,
  enableMemoryLearning: true,
  maxContextLength: 4000,
  maxFunctionCalls: 5
};
```

## 📈 Métricas de Éxito

### Indicadores de Conversación Natural
- **Tasa de saludos repetitivos**: < 5%
- **Uso de referencias contextuales**: > 80%
- **Transiciones naturales**: > 90%
- **Satisfacción del usuario**: > 4.5/5

### Monitoreo
- **Longitud de conversación**: Promedio de mensajes por sesión
- **Patrones de comportamiento**: Detección de preferencias
- **Tiempo de respuesta**: Eficiencia del sistema
- **Escalación a humano**: Tasa de transferencia

## 🚀 Próximas Mejoras

### Fase 2: Conversación Avanzada
- **Análisis de sentimiento**: Adaptar tono según estado emocional
- **Predicción de intenciones**: Anticipar necesidades del usuario
- **Aprendizaje continuo**: Mejora automática de respuestas
- **Integración multimodal**: Soporte para voz e imágenes

### Fase 3: Personalización Avanzada
- **Perfiles dinámicos**: Adaptación en tiempo real
- **Preferencias contextuales**: Ajuste según situación
- **Historial inteligente**: Análisis de patrones complejos
- **Recomendaciones proactivas**: Sugerencias anticipadas

## 📚 Referencias

- [OpenAI Conversation Design](https://platform.openai.com/docs/guides/conversation-design)
- [Microsoft Bot Framework Best Practices](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-design-patterns)
- [Google Dialogflow Context Management](https://cloud.google.com/dialogflow/docs/contexts-overview)

---

**Desarrollado por**: Equipo de IA - Embler/AOVA  
**Versión**: 1.0.0  
**Fecha**: Diciembre 2024