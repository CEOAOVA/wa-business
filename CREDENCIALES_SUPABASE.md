# 🔐 CREDENCIALES REALES DE SUPABASE - CONFIGURACIÓN COMPLETA

## ✅ PROYECTO CONFIGURADO
- **Proyecto**: wa-business1-db
- **ID**: cjigdlbgxssydcvyjwpc  
- **Región**: us-west-1
- **Estado**: ACTIVE_HEALTHY

## 🔑 CREDENCIALES PARA BACKEND

```env
# Variables obligatorias para el backend
SUPABASE_URL=https://cjigdlbgxssydcvyjwpc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWdkbGJneHNzeWRjdnlqd3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgwNDksImV4cCI6MjA2ODE4NDA0OX0.rCgXUFlV9Y4SC9mZl6bPPO8Z6RK5UF1kYv40fcx-FyQ

# ⚠️ IMPORTANTE: Necesitas obtener la Service Role Key desde:
# https://supabase.com/dashboard/project/cjigdlbgxssydcvyjwpc/settings/api
SUPABASE_SERVICE_ROLE=TU_SERVICE_ROLE_KEY_AQUI
```

## 🎯 CREDENCIALES PARA FRONTEND

```env
# Variables para el frontend
VITE_SUPABASE_URL=https://cjigdlbgxssydcvyjwpc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWdkbGJneHNzeWRjdnlqd3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgwNDksImV4cCI6MjA2ODE4NDA0OX0.rCgXUFlV9Y4SC9mZl6bPPO8Z6RK5UF1kYv40fcx-FyQ
```

## 👤 USUARIOS CONFIGURADOS Y LISTOS

### **USUARIO ADMIN** (Para pruebas completas)
```
Email: admin@aova.mx
Password: aova2024
Role: admin
✅ CONFIGURADO Y VERIFICADO
```

### **USUARIO VENDEDOR** (Para perfil de agente)
```
Email: k.alvarado@aova.mx
Password: aova123
Role: agent
✅ CONFIGURADO Y VERIFICADO
```

### **USUARIO VENDEDOR ALTERNATIVO**
```
Email: vendedor@aova.mx
Password: vendedor2024
Role: agent
✅ CONFIGURADO Y VERIFICADO
```

## 🚨 PROBLEMA ACTUAL

El backend tiene configurado Supabase pero **falta la Service Role Key correcta**.

## 🔧 SOLUCIÓN INMEDIATA

1. **Ve a**: https://supabase.com/dashboard/project/cjigdlbgxssydcvyjwpc/settings/api
2. **Copia la "Service Role Key"** (la key secreta, no la anon)
3. **Actualiza tu deployment** con todas las variables de arriba
4. **Reinicia los contenedores**

## ✅ VERIFICACIÓN

Una vez actualizadas las variables:
- Accede a: https://dev-apiwaprueba.aova.mx/api/health
- Debería mostrar: `"supabase":{"status":"ok"}`
- Prueba login con cualquiera de las credenciales de arriba

---

**NOTA**: Los usuarios YA están configurados en Supabase con las contraseñas correctas. Solo falta actualizar las variables de entorno del deployment.
