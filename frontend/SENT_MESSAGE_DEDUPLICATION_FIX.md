# Corrección de Duplicación de Mensajes Enviados

## Problema Original
- Los mensajes **enviados desde el frontend** se duplicaban en la UI
- Los mensajes **recibidos** funcionaban correctamente
- El problema era **solo visual** (no afectaba la base de datos)

## Solución Implementada

### 1. Revertir al Sistema Original
- **Volvimos** a `AppContext` y `useApp` como proveedor principal
- **Mantuvimos** el comportamiento original para mensajes recibidos
- **Aplicamos** la lógica de deduplicación **solo para mensajes enviados**

### 2. Lógica de Deduplicación para Mensajes Enviados

#### A. Generación de `clientId` Único
```typescript
// En sendMessage()
const clientId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

#### B. Mensaje Optimista
```typescript
const optimisticMessage: Message = {
  id: `temp_${Date.now()}`,
  clientId: clientId, // Incluir clientId para deduplicación
  // ... otros campos
};
```

#### C. Actualización con Datos del Servidor
```typescript
// Enviar clientId al backend
const result = await whatsappApi.sendMessage({
  to: formattedPhone,
  message: content,
  clientId: clientId // NUEVO
});

// Actualizar mensaje optimista
dispatch({
  type: 'UPDATE_MESSAGE',
  payload: {
    clientId: clientId,
    updates: {
      id: result.data?.messageId,
      waMessageId: result.data?.waMessageId,
    }
  }
});
```

### 3. WebSocket Handler Mejorado

#### A. Detección de Mensajes Enviados
```typescript
// Verificar si es mensaje enviado por nosotros
if (data.message.from === 'us' && data.message.clientId) {
  // Buscar mensaje optimista existente
  const existingMessage = existingMessages.find(msg => 
    msg.clientId === data.message.clientId
  );
  
  if (existingMessage) {
    // Actualizar mensaje optimista en lugar de duplicar
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        clientId: data.message.clientId,
        updates: {
          id: data.message.id,
          waMessageId: data.message.waMessageId,
          // ... otros campos del servidor
        }
      }
    });
    return; // NO agregar nuevo mensaje
  }
}
```

#### B. Mensajes Recibidos (Sin Cambios)
```typescript
// Los mensajes recibidos NO tienen clientId
// Se procesan normalmente sin deduplicación
const newMessage: Message = {
  // ... campos normales
  clientId: data.message.clientId, // undefined para mensajes recibidos
};
```

### 4. Reducer Mejorado

#### A. Caso `UPDATE_MESSAGE`
```typescript
case 'UPDATE_MESSAGE':
  const { clientId, updates } = action.payload;
  const chatIdToUpdate = Object.keys(state.messages).find(chatId => 
    state.messages[chatId]?.some(msg => msg.clientId === clientId)
  );
  
  if (chatIdToUpdate) {
    const updatedMessages = state.messages[chatIdToUpdate].map(msg =>
      msg.clientId === clientId ? { ...msg, ...updates } : msg
    );
    
    return {
      ...state,
      messages: {
        ...state.messages,
        [chatIdToUpdate]: updatedMessages,
      }
    };
  }
  return state;
```

#### B. Verificación de Duplicados Mejorada
```typescript
// Verificar duplicados por múltiples criterios
const messageExists = existingMessages.some((existing: Message) => {
  // Por ID exacto
  if (existing.id === message.id && message.id) return true;
  
  // Por WhatsApp Message ID
  if (existing.waMessageId && existing.waMessageId === message.waMessageId) return true;
  
  // Por client_id (solo para mensajes enviados)
  if (existing.clientId && existing.clientId === message.clientId) return true;
  
  // Por contenido y timestamp (fallback)
  if (existing.content === message.content && 
      Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000) {
    return true;
  }
  
  return false;
});
```

### 5. Backend Actualizado

#### A. Interfaz `SendMessageRequest`
```typescript
export interface SendMessageRequest {
  to: string;
  message: string;
  clientId?: string; // NUEVO: Para deduplicación
}
```

#### B. WebSocket Event con `clientId`
```typescript
const sentMessage = {
  // ... otros campos
  clientId: data.clientId // Incluir en el evento
};

this.emitNewMessage(sentMessage, conversation);
```

## Resultado

### ✅ Mensajes Enviados
- **NO se duplican** en la UI
- Se muestran **inmediatamente** (optimistic UI)
- Se **actualizan** con datos del servidor
- Mantienen **funcionalidad completa**

### ✅ Mensajes Recibidos
- **Funcionan igual** que antes
- **NO se ven afectados** por la deduplicación
- Mantienen **tiempo real** correcto

### ✅ Compatibilidad
- **Sistema original** preservado
- **Funcionalidad existente** intacta
- **Solo mejora** para mensajes enviados

## Archivos Modificados

1. **`frontend/src/App.tsx`** - Revertir a `AppProvider`
2. **`frontend/src/context/AppContext.tsx`** - Lógica de deduplicación
3. **`frontend/src/types/index.ts`** - Tipo `UPDATE_MESSAGE`
4. **`frontend/src/services/whatsapp-api.ts`** - Interfaz con `clientId`
5. **`backend/src/services/whatsapp.service.ts`** - Envío de `clientId`

## Pruebas

Ejecutar en la consola del navegador:
```javascript
// Cargar script de prueba
import('./src/scripts/test-deduplication-fix.ts');

// Ejecutar pruebas
window.runDeduplicationTests();
```

## Conclusión

La corrección **mantiene el sistema original** y **aplica deduplicación únicamente** a los mensajes enviados desde el frontend, resolviendo el problema específico sin afectar la funcionalidad existente. 