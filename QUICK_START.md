# ⚡ Inicio Rápido - WhatsApp Business Platform

## 🎯 Para Pruebas Locales (Sin WhatsApp)

### 1. Configurar Variables de Entorno (2 minutos

```bash
# Copiar archivos de ejemplo
cp frontend/env.example frontend/.env.local
cp backend/env.example backend/.env

# Editar frontend/.env.local
nano frontend/.env.local
```

En `frontend/.env.local`:
```bash
VITE_BACKEND_URL=http://localhost:3002
# ✅ NO pongas API keys aquí - van en el backend
```

En `backend/.env`:
```bash
OPENROUTER_API_KEY=tu_openrouter_api_key_aqui
JWT_SECRET=mi_jwt_secret_super_seguro_2024
```

### 2. Obtener OpenRouter API Key (1 minuto)

1. Ve a [OpenRouter.ai](https://openrouter.ai/keys)
2. Crea cuenta gratuita
3. Genera API key
4. Copia la key que comienza con `sk-or-v1-`
5. **IMPORTANTE:** Solo la pongas en `backend/.env`, NUNCA en el frontend

### 3. Ejecutar con Docker (1 minuto)

```bash
# Desarrollo con hot reload
docker-compose -f docker-compose.dev.yml up --build

# Producción
docker-compose up --build -d
```

### 4. Probar la Aplicación

- **Frontend:** http://localhost:5173 (dev) o http://localhost:80 (prod)
- **Backend:** http://localhost:3002
- **Login:** `moises.s@aova.mx` / `Admin2024!`

## 🚨 Problemas Comunes

### Error: "Cannot connect to backend"
```bash
# Verificar que el backend esté corriendo
docker-compose ps
docker-compose logs backend
```

### Error: "OpenRouter API key not found"
```bash
# Verificar que la API key esté configurada EN EL BACKEND
grep OPENROUTER_API_KEY backend/.env

# ✅ CORRECTO: API key en backend/.env
# ❌ INCORRECTO: API key en frontend (riesgo de seguridad)
```

### Error: "Database connection failed"
```bash
# Recrear la base de datos
docker-compose down
docker-compose up --build
```

## 📋 Lo Que Funciona Sin WhatsApp

- ✅ **Chatbot con IA** (OpenRouter + Gemini)
- ✅ **Interfaz de chat** completa
- ✅ **Autenticación** básica
- ✅ **Simuladores** de mensajes
- ✅ **Carga de archivos** multimedia
- ✅ **WebSocket** para tiempo real

## 🔗 Próximos Pasos

1. **Configurar webhook de WhatsApp** para mensajes reales
2. **Configurar dominio y SSL** para producción
3. **Migrar a PostgreSQL** para producción
4. **Configurar servicios SOAP** para inventario

¿Todo funcionando? ¡Perfecto! 🎉 