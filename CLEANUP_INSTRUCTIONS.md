# 🧹 Instrucciones para Eliminar Nombres Reales

## ✅ **Cambios Realizados:**

### 1. **Frontend:**
- ✅ Creado archivo `constants/messages.ts` con mensajes centralizados
- ✅ Removidos nombres "Juan" del prompt del chatbot
- ✅ Actualizados todos los componentes para usar constantes

### 2. **Backend:**
- ✅ Cambiado nombre por defecto en simulación: `"Cliente Prueba" → "Cliente Test"`
- ✅ Removido nombre del cliente en respuesta automática
- ✅ Agregada función para limpiar TODOS los mensajes en memoria

---

## 🔧 **Comandos para Limpiar Datos:**

### **Limpiar TODOS los mensajes del backend:**
```bash
# PowerShell (Windows)
Invoke-WebRequest -Uri "http://localhost:3001/api/chat/messages/clear-all" -Method DELETE

# Linux/Mac
curl -X DELETE http://localhost:3001/api/chat/messages/clear-all
```

### **Limpiar solo mensajes antiguos:**
```bash
# PowerShell (Windows) - mensajes de más de 1 hora
Invoke-WebRequest -Uri "http://localhost:3001/api/chat/messages/cleanup?hours=1" -Method DELETE

# Linux/Mac
curl -X DELETE "http://localhost:3001/api/chat/messages/cleanup?hours=1"
```

---

## 🔍 **Si Los Nombres Vuelven a Aparecer:**

1. **Verificar origen:**
   - ¿Vienen de mensajes reales de WhatsApp?
   - ¿Alguien está usando el endpoint de simulación?

2. **Ejecutar limpieza:**
   ```bash
   Invoke-WebRequest -Uri "http://localhost:3001/api/chat/messages/clear-all" -Method DELETE
   ```

3. **Revisar logs del backend:**
   - Buscar en consola líneas con "📩 Mensaje guardado"
   - Verificar de dónde vienen los datos

4. **Restart del backend:**
   ```bash
   cd backend
   npm run dev
   ```

---

## 🚫 **Prevención:**

- **No usar nombres reales** en testing
- **Usar nombres genéricos** como "Cliente Test", "Usuario Prueba"
- **Limpiar regularmente** los mensajes en memoria
- **Verificar** que no hay datos hardcodeados antes de deployar

---

## 📍 **Archivos Modificados:**

### Frontend:
- `frontend/test-tailwind/src/constants/messages.ts` (nuevo)
- `frontend/test-tailwind/src/components/ChatPanel.tsx`
- `frontend/test-tailwind/src/components/Sidebar.tsx`
- `frontend/test-tailwind/src/pages/ClientChat.tsx`
- `frontend/test-tailwind/src/hooks/useChat.ts`
- `frontend/test-tailwind/src/chatbot/services/openrouter-client.ts`

### Backend:
- `backend/src/services/whatsapp.service.ts`
- `backend/src/routes/chat.ts`

---

## ✅ **Estado Actual:**
- ❌ **Sin nombres reales** hardcodeados
- ✅ **Mensajes centralizados** en constantes
- ✅ **Funciones de limpieza** implementadas
- ✅ **Comandos disponibles** para mantenimiento 