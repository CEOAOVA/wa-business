# Limpieza de Mensajes Duplicados

## Problema Identificado

Los mensajes del chatbot se estaban duplicando en la base de datos porque:

1. **Mensaje original**: `whatsapp_message_id` con valor real, `metadata` con `timestamp`
2. **Mensaje duplicado**: `whatsapp_message_id` es `NULL`, `metadata` empieza con `chatbotId`

## Solución Implementada

### 1. Modificaciones en el Código

- **`chatbot.service.ts`**: El chatbot ya NO guarda mensajes durante el procesamiento
- **`whatsapp.service.ts`**: Los mensajes del chatbot se guardan SOLO cuando se envían exitosamente
- **Nuevo método**: `saveChatbotMessageToDatabase()` que incluye el `whatsapp_message_id` real

### 2. Scripts de Limpieza

#### Opción A: Script Node.js (Recomendado)

```bash
# Desde el directorio backend
npm run cleanup:duplicates
```

#### Opción B: Script SQL Directo

1. Ir al panel de Supabase
2. Abrir el SQL Editor
3. Ejecutar el contenido de `cleanup-duplicate-messages.sql`

## Instrucciones de Limpieza

### Paso 1: Verificar Duplicados

```bash
cd backend
npm run cleanup:duplicates
```

El script mostrará:
- Cuántos mensajes duplicados encontró
- Ejemplos de los mensajes que se eliminarán
- Confirmación antes de eliminar

### Paso 2: Ejecutar Limpieza

El script eliminará automáticamente los mensajes que cumplan:
- `whatsapp_message_id` es `NULL`
- `metadata` contiene `chatbotId`

### Paso 3: Verificar Resultado

El script verificará que se eliminaron correctamente y mostrará cuántos quedan.

## Prevención Futura

Con los cambios implementados:

1. ✅ El chatbot procesa mensajes solo en memoria
2. ✅ Los mensajes se guardan SOLO cuando se envían por WhatsApp
3. ✅ Se incluye el `whatsapp_message_id` real en la base de datos
4. ✅ No más duplicados con `chatbotId` en metadata

## Archivos Modificados

- `src/services/chatbot.service.ts` - Procesamiento sin guardar en BD
- `src/services/whatsapp.service.ts` - Guardado solo al enviar
- `cleanup-duplicate-messages.js` - Script de limpieza
- `cleanup-duplicate-messages.sql` - Script SQL alternativo
- `package.json` - Nuevo script npm

## Notas Importantes

- ⚠️ **Hacer backup** antes de ejecutar la limpieza
- 🔄 **Reiniciar el servidor** después de aplicar los cambios
- 📊 **Verificar** que no hay duplicados después de la limpieza
- 🚀 **Probar** el envío de mensajes del chatbot

## Comandos Útiles

```bash
# Limpiar duplicados
npm run cleanup:duplicates

# Reiniciar servidor
npm run dev

# Verificar logs
tail -f logs/application.log
``` 