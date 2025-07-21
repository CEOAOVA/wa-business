# Sistema de Autenticación - Configuración Completa

## 🎯 Resumen

Se ha implementado un sistema completo de autenticación con roles que permite:

- **Login con username** (no email)
- **Redirección automática** según el rol del usuario
- **Panel de administración** para gestionar usuarios
- **Protección de rutas** basada en roles
- **Integración completa** con Supabase

## 👥 Usuarios Iniciales

### Credenciales de Acceso

| Usuario | Contraseña | Rol | WhatsApp ID | Vista Destino |
|---------|------------|-----|-------------|---------------|
| `admin` | `Admin2024!` | Admin | ✅ Asignado | `/admin/dashboard` |
| `agente1` | `Agente2024!` | Agente | ❌ No asignado | `/chats` |
| `agente2` | `Agente2024!` | Agente | ❌ No asignado | `/chats` |

## 🚀 Configuración Inicial

### 1. Inicializar Usuarios en Supabase

```bash
cd backend
node src/scripts/init-users.js
```

### 2. Configurar Variables de Entorno

#### Backend (.env)
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

#### Frontend (env.example → .env.local)
```env
VITE_API_URL=http://localhost:3002
```

### 3. Probar el Sistema

```bash
cd backend
node test-auth.js
```

## 🔐 Flujo de Autenticación

### Login
1. Usuario ingresa **username** y **password**
2. Backend valida credenciales con Supabase
3. Se genera token de sesión
4. Frontend redirige automáticamente según rol

### Redirecciones por Rol
- **Admin** → `/admin/dashboard` (Panel de administración)
- **Agente** → `/chats` (Interfaz de chat)

### Protección de Rutas
- `/admin/*` → Solo usuarios con rol `admin`
- `/chats` → Solo usuarios con rol `agent`
- `/` → Redirección automática según rol

## 🏗️ Estructura del Sistema

### Backend
```
src/
├── services/
│   └── auth.service.ts          # Servicio de autenticación
├── routes/
│   └── auth.ts                  # Rutas de autenticación
├── middleware/
│   ├── auth.ts                  # Middleware de autenticación
│   └── security.ts              # Middleware de permisos
└── scripts/
    └── init-users.js            # Script de inicialización
```

### Frontend
```
src/
├── services/
│   └── auth-api.ts              # Cliente de API de autenticación
├── context/
│   └── AuthContext.tsx          # Contexto de autenticación
├── components/
│   ├── ProtectedRoute.tsx       # Protección de rutas
│   └── RoleRedirect.tsx         # Redirección por roles
└── pages/
    ├── Login.tsx                # Página de login
    └── AdminDashboard.tsx       # Panel de administración
```

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login con username/password
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario
- `GET /api/auth/users` - Listar usuarios (solo admin)
- `POST /api/auth/register` - Crear usuario (solo admin)

### Parámetros de Login
```json
{
  "username": "admin",
  "password": "Admin2024!"
}
```

### Respuesta de Login
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "full_name": "Administrador del Sistema",
      "email": "admin@admin.local",
      "role": "admin",
      "whatsapp_id": "WHATSAPP_ADMIN_ID",
      "is_active": true
    },
    "session": {
      "access_token": "jwt_token"
    }
  }
}
```

## 🛡️ Seguridad

### Middleware de Autenticación
- Verifica token JWT en cada request
- Extrae información del usuario
- Valida que el usuario esté activo

### Middleware de Permisos
- Verifica roles para rutas protegidas
- Bloquea acceso no autorizado
- Retorna errores apropiados

### RLS (Row Level Security)
- Políticas en Supabase para proteger datos
- Usuarios solo ven sus propios datos
- Admins pueden ver todos los datos

## 🎨 Interfaz de Usuario

### Login
- Formulario con username (no email)
- Credenciales demo pre-cargadas
- Validación en tiempo real
- Manejo de errores

### Panel de Administración
- Dashboard con estadísticas
- Tabla de gestión de usuarios
- Acciones de activar/desactivar
- Información detallada de usuarios

### Redirección Automática
- Loading mientras se redirige
- Rutas protegidas por rol
- Navegación intuitiva

## 🧪 Pruebas

### Script de Pruebas
```bash
node test-auth.js
```

### Casos de Prueba
1. ✅ Login con admin
2. ✅ Obtener perfil
3. ✅ Listar usuarios (admin)
4. ✅ Logout
5. ✅ Login con agente
6. ✅ Bloqueo de acceso a lista de usuarios (agente)

## 🔄 Flujo Completo

1. **Usuario accede** a la aplicación
2. **Sistema verifica** si está autenticado
3. **Si no está autenticado** → redirige a `/login`
4. **Usuario ingresa** username y password
5. **Backend valida** con Supabase
6. **Si es válido** → genera token y redirige a `/`
7. **RoleRedirect** detecta el rol y redirige:
   - Admin → `/admin/dashboard`
   - Agente → `/chats`
8. **Usuario accede** a su interfaz correspondiente

## 🚨 Notas Importantes

- **Cambiar contraseñas** después del primer login
- **Configurar WhatsApp ID** para el admin
- **Revisar políticas RLS** en Supabase
- **Configurar variables de entorno** correctamente
- **El backend debe estar corriendo** en puerto 3002

## 🆘 Solución de Problemas

### Error de Conexión
- Verificar que el backend esté corriendo
- Revisar `VITE_API_URL` en frontend
- Verificar variables de entorno

### Error de Autenticación
- Verificar credenciales de Supabase
- Revisar que los usuarios existan
- Verificar políticas RLS

### Error de Permisos
- Verificar rol del usuario
- Revisar middleware de permisos
- Verificar políticas de Supabase 