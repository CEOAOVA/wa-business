# Obtener Service Role Key de Supabase

Para obtener la `SUPABASE_SERVICE_ROLE_KEY`, sigue estos pasos:

## 1. Ir al Dashboard de Supabase
- Ve a: https://supabase.com/dashboard
- Selecciona tu proyecto: `wa-business1-db`

## 2. Ir a Configuración de API Keys
- En el menú lateral, ve a **Settings** → **API**
- O directamente: https://supabase.com/dashboard/project/cjigdlbgxssydcvyjwpc/settings/api

## 3. Crear una nueva Secret Key
- En la sección "API Keys", haz clic en **"New API Key"**
- Selecciona **"Secret Key"** (no "Publishable Key")
- Dale un nombre descriptivo como "Backend Service Key"
- Haz clic en **"Create"**

## 4. Copiar la Service Role Key
- Se generará una nueva clave que empieza con `sb_secret_`
- Copia esta clave completa

## 5. Agregar al archivo .env
Agrega esta línea a tu archivo `backend/.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tu_clave_aqui
```

## 6. Ejecutar el script de inicialización
Una vez que tengas la service role key configurada, ejecuta:

```bash
node src/scripts/init-users.js
```

## Nota de Seguridad
- **NUNCA** compartas la service role key
- **NUNCA** la incluyas en el código fuente
- Solo úsala en el backend del servidor
- Esta clave tiene acceso completo a la base de datos y puede bypassear RLS 