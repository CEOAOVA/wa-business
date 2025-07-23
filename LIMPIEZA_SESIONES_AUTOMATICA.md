# 🧹 Limpieza Automática de Sesiones

## 📋 Descripción

Se ha implementado un sistema de limpieza automática de sesiones que se ejecuta cada vez que se inicia el servidor. Esto asegura que el sistema comience con un estado limpio y evita problemas relacionados con sesiones obsoletas o datos de caché corruptos.

## 🚀 Funcionalidades Implementadas

### 1. Limpieza Automática al Inicio del Servidor

**Ubicación**: `backend/src/app.ts`

- ✅ **Rate Limiter**: Limpia todas las ventanas de rate limiting
- ✅ **Cache Service**: Limpia el caché en memoria
- ✅ **Chatbot Sessions**: Limpia sesiones de conversación del chatbot
- ✅ **Conversation Sessions**: Limpia sesiones de conversación generales
- ✅ **Inventory Cache**: Limpia el caché de inventario

### 2. API de Limpieza Manual (Solo Administradores)

**Endpoint**: `POST /api/auth/clear-sessions`

- 🔐 **Autenticación requerida**: Solo usuarios con rol `admin`
- 🧹 **Limpieza completa**: Todos los servicios mencionados arriba
- 📊 **Respuesta detallada**: Lista de servicios limpiados y timestamp

### 3. Interfaz de Usuario en Dashboard de Administrador

**Ubicación**: `frontend/src/pages/AdminDashboard.tsx`

- 🎯 **Botón dedicado**: En la sección "Navegación Rápida"
- ⚠️ **Confirmación**: Diálogo de confirmación antes de ejecutar
- 🔄 **Feedback visual**: Indicador de carga y mensajes de resultado
- 📈 **Actualización automática**: Recarga estadísticas después de limpiar

## 🔧 Cómo Funciona

### Al Iniciar el Servidor

```typescript
// Función que se ejecuta automáticamente al arranque
async function cleanupSessionsOnStartup() {
  // Limpia rate limiter, caché, sesiones de chatbot, etc.
  // No falla el arranque si hay errores de limpieza
}
```

### Limpieza Manual desde el Frontend

```typescript
// Función en el dashboard de administrador
const handleClearSessions = async () => {
  // Confirmación del usuario
  // Llamada a la API
  // Feedback visual
  // Recarga de estadísticas
}
```

## 📊 Servicios que se Limpian

| Servicio | Descripción | Frecuencia |
|----------|-------------|------------|
| **Rate Limiter** | Ventanas de rate limiting y circuit breakers | Al arranque + Manual |
| **Cache Service** | Caché en memoria del sistema | Al arranque + Manual |
| **Chatbot Sessions** | Sesiones de conversación del chatbot | Al arranque + Manual |
| **Conversation Sessions** | Sesiones de conversación generales | Al arranque + Manual |
| **Inventory Cache** | Caché de inventario de productos | Al arranque + Manual |

## 🛡️ Seguridad

- **Autenticación requerida**: Solo administradores pueden limpiar sesiones manualmente
- **Confirmación obligatoria**: Diálogo de confirmación en el frontend
- **Logging completo**: Todas las acciones se registran en los logs
- **Manejo de errores**: No falla el arranque por errores de limpieza

## 📝 Logs y Monitoreo

### Logs de Limpieza Automática
```
🧹 Iniciando limpieza de sesiones al arranque...
✅ Rate limiter limpiado
✅ Cache service limpiado
✅ Chatbot sessions limpiadas
✅ 5 conversaciones inactivas limpiadas
✅ Inventory cache limpiado
🎉 Limpieza de sesiones completada al arranque
```

### Logs de Limpieza Manual
```
🧹 Limpieza manual de sesiones iniciada por admin: admin@example.com
✅ Rate limiter limpiado
✅ Cache service limpiado
✅ Chatbot sessions limpiadas
✅ 3 conversaciones inactivas limpiadas
✅ Inventory cache limpiado
```

## 🎯 Beneficios

1. **Estado limpio**: El servidor siempre inicia con un estado limpio
2. **Prevención de errores**: Evita problemas por sesiones obsoletas
3. **Mejor rendimiento**: Elimina datos innecesarios en memoria
4. **Control administrativo**: Los administradores pueden limpiar manualmente cuando sea necesario
5. **Transparencia**: Logs detallados de todas las operaciones

## 🔄 Uso

### Automático
- Se ejecuta automáticamente cada vez que se inicia el servidor
- No requiere intervención del usuario

### Manual (Solo Administradores)
1. Acceder al Dashboard de Administrador
2. Ir a la sección "Navegación Rápida"
3. Hacer clic en "Limpiar Sesiones"
4. Confirmar la acción
5. Ver el resultado en el mensaje de confirmación

## 🚨 Consideraciones

- **Datos perdidos**: La limpieza elimina todas las sesiones activas
- **Usuarios afectados**: Los usuarios activos deberán volver a autenticarse
- **Conversaciones**: Las conversaciones en curso se perderán
- **Caché**: Todo el caché se vacía, lo que puede afectar temporalmente el rendimiento

## 🔧 Configuración

La limpieza automática está habilitada por defecto. Para deshabilitarla, comentar la línea en `app.ts`:

```typescript
// Comentar esta línea para deshabilitar la limpieza automática
// await cleanupSessionsOnStartup();
```

## 📞 Soporte

Si encuentras problemas con la limpieza de sesiones:

1. Revisar los logs del servidor
2. Verificar que el usuario tenga permisos de administrador
3. Comprobar la conectividad con el backend
4. Revisar la consola del navegador para errores del frontend 