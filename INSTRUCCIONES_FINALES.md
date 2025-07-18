# 🚀 Instrucciones Finales - Sistema de Autenticación

## ✅ Estado Actual
El sistema de autenticación está **completamente implementado** y listo para usar. Solo faltan 2 pasos para activarlo.

## 🔧 Pasos para Completar

### 1. **Obtener Service Role Key** (OBLIGATORIO)

**¿Por qué necesitas esto?**
- Para crear usuarios iniciales en Supabase
- Para bypassear las políticas de seguridad durante la inicialización

**Cómo obtenerla:**
1. Ve a: https://supabase.com/dashboard/project/cjigdlbgxssydcvyjwpc/settings/api
2. Haz clic en **"New API Key"**
3. Selecciona **"Secret Key"** (no "Publishable Key")
4. Dale un nombre como "Backend Service Key"
5. Haz clic en **"Create"**
6. Copia la clave que empieza con `sb_secret_`

**Agregar al archivo `.env`:**
```env
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tu_clave_aqui
```

### 2. **Crear Usuarios Iniciales**

Una vez que tengas la service role key:

```bash
cd backend
node src/scripts/init-users.js
```

**Resultado esperado:**
```
🎉 Sistema inicializado correctamente!

📋 Credenciales de acceso:
   (Para login usar USERNAME, no email)
   ADMIN: admin / Admin2024!
      Email: admin@example.com (solo para registro)
   AGENT: agente1 / Agente2024!
      Email: agente1@example.com (solo para registro)
   AGENT: agente2 / Agente2024!
      Email: agente2@example.com (solo para registro)
```

## 🎯 Cómo Usar el Sistema

### **Login**
- **Username**: `admin`, `agente1`, o `agente2`
- **Password**: `Admin2024!` o `Agente2024!`
- **NO usar email** para login

### **Redirección Automática**
- **Admin** → Panel de administración (`/admin/dashboard`)
- **Agente** → Interfaz de chat (`/chats`)

### **Iniciar Servicios**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🔒 Seguridad

### **Lo que está protegido:**
- ✅ Login solo con username (no email)
- ✅ Redirección automática por roles
- ✅ Rutas protegidas según permisos
- ✅ Tokens JWT para autenticación
- ✅ Row Level Security en base de datos

### **Credenciales temporales:**
- Los emails `@example.com` son solo para registro interno
- Los usuarios pueden cambiar sus contraseñas después del primer login
- Se recomienda cambiar las contraseñas por defecto

## 🐛 Si algo no funciona

### **Error: "Service role key not found"**
- Verifica que agregaste `SUPABASE_SERVICE_ROLE_KEY` al archivo `.env`
- Asegúrate de que la clave empiece con `sb_secret_`

### **Error: "Invalid email domain"**
- ✅ **RESUELTO**: Ya usamos `@example.com` (dominio válido)

### **Error: "RLS policy violation"**
- ✅ **RESUELTO**: El script usa service role key para bypassear RLS

### **Error: "ApiResponse not found"**
- ✅ **RESUELTO**: Definiciones duplicadas eliminadas

## 🎉 ¡Listo!

Una vez que completes estos 2 pasos, tendrás:
- ✅ Sistema de login con username
- ✅ Redirección automática por roles
- ✅ Panel de administración funcional
- ✅ Protección de rutas configurada
- ✅ Usuarios iniciales creados

**¡El sistema estará completamente operativo!** 