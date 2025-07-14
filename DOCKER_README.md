# 🐳 Docker - WhatsApp Business Platform

## 📋 Resumen

He creado un sistema Docker completo para tu proyecto WhatsApp Business. Incluye:

- ✅ **Dockerfile para Backend** (Node.js + TypeScript + Prisma)
- ✅ **Dockerfile para Frontend** (React + Vite + Nginx)
- ✅ **docker-compose.yml** para producción
- ✅ **docker-compose.dev.yml** para desarrollo
- ✅ **Configuración de Nginx** con SSL y proxy reverso
- ✅ **Variables de entorno** configuradas
- ✅ **Archivos .dockerignore** optimizados

## 🚀 Comandos Rápidos

### Desarrollo Local
```bash
# Construir y ejecutar en modo desarrollo
docker-compose -f docker-compose.dev.yml up --build

# Frontend: http://localhost:5173
# Backend: http://localhost:3002
```

### Producción
```bash
# Construir y ejecutar en modo producción
docker-compose up --build -d

# Frontend: http://localhost:80
# Backend: http://localhost:3002
```

### Con SSL y Proxy (Producción Completa)
```bash
# Incluir nginx proxy con SSL
docker-compose --profile production up --build -d
```

## 📋 Configuración Necesaria

### 1. Variables de Entorno

#### Frontend (`frontend/env.example` → `.env.local`)
```bash
# Copiar y editar
cp frontend/env.example frontend/.env.local

# Configurar:
VITE_BACKEND_URL=http://localhost:3002
# ✅ NO hay API keys en el frontend por seguridad
```

#### Backend (`backend/env.example` → `.env`)
```bash
# Copiar y editar
cp backend/env.example backend/.env

# Configurar mínimo para pruebas:
OPEN_ROUTER_API_KEY=tu_openrouter_api_key_aqui
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
```

### 2. Base de Datos

El sistema usa **SQLite** por defecto para desarrollo. Para producción, puedes cambiar a PostgreSQL:

```bash
# Desarrollo (SQLite - incluido)
DATABASE_URL="file:./prisma/whatsapp.db"

# Producción (PostgreSQL)
DATABASE_URL="postgresql://user:password@database:5432/wa_business"
```

### 3. SSL (Para Producción)

Para usar el proxy con SSL, necesitas certificados en `nginx/ssl/`:

```bash
# Crear directorio SSL
mkdir -p nginx/ssl

# Copiar tus certificados
cp tu_cert.pem nginx/ssl/cert.pem
cp tu_key.pem nginx/ssl/key.pem
```

## 🔧 Configuración para VPS

### 1. Preparar el VPS

```bash
# Instalar Docker y Docker Compose
sudo apt update
sudo apt install docker.io docker-compose

# Clonar el proyecto
git clone tu_repo
cd wa-business
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivos de ejemplo
cp frontend/env.example frontend/.env.local
cp backend/env.example backend/.env
cp docker.env.example .env

# Editar con valores reales
nano frontend/.env.local
nano backend/.env
nano .env
```

### 3. Desplegar

```bash
# Construir y ejecutar
docker-compose up --build -d

# Ver logs
docker-compose logs -f

# Verificar estado
docker-compose ps
```

## 🛠️ Comandos Útiles

### Gestión de Contenedores

```bash
# Detener todo
docker-compose down

# Rebuild completo
docker-compose down
docker-compose up --build --force-recreate

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Ejecutar comandos dentro del contenedor
docker-compose exec backend npm run dev
docker-compose exec backend npx prisma migrate dev
```

### Limpieza

```bash
# Limpiar imágenes no utilizadas
docker system prune

# Limpiar todo (cuidado!)
docker system prune -a --volumes
```

## 🔍 Verificación del Despliegue

### 1. Verificar Servicios

```bash
# Todos los servicios deben estar "Up"
docker-compose ps

# Verificar logs sin errores
docker-compose logs
```

### 2. Probar Conexiones

```bash
# Frontend
curl http://localhost:80/health

# Backend
curl http://localhost:3002/health

# Base de datos
docker-compose exec database pg_isready
```

### 3. Verificar Funcionalidad

1. **Frontend:** Ve a `http://localhost:80`
2. **Backend API:** Ve a `http://localhost:3002`
3. **Logs:** `docker-compose logs -f`

## 📊 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `frontend` | 80 | React + Nginx |
| `backend` | 3002 | Node.js + Express |
| `database` | 5432 | PostgreSQL |
| `nginx-proxy` | 443 | SSL + Proxy Reverso |
| `redis` | 6379 | Cache (opcional) |

## 🚨 Consideraciones Importantes

### Para Pruebas (Sin WhatsApp)
- ✅ Puedes usar todo el sistema excepto el webhook real
- ✅ Tiene simuladores para desarrollo
- ✅ Solo necesitas `OPEN_ROUTER_API_KEY` y `JWT_SECRET`

### Para Producción (Con WhatsApp)
- ❌ Necesitas configurar webhook de WhatsApp Business
- ❌ Necesitas `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`
- ❌ Necesitas dominio y SSL

### Base de Datos
- ✅ SQLite incluido para desarrollo
- ⚠️ Para producción, usa PostgreSQL

## 🔐 Seguridad

- ✅ Contenedores ejecutan con usuario no-root
- ✅ Variables de entorno no se incluyen en imágenes
- ✅ Nginx con headers de seguridad
- ✅ SSL/TLS configurado para producción

## 📝 Archivos Creados

```
wa-business/
├── docker-compose.yml              # Producción
├── docker-compose.dev.yml          # Desarrollo
├── docker.env.example              # Variables Docker
├── backend/
│   ├── Dockerfile                  # Backend Docker
│   ├── .dockerignore               # Optimización
│   └── env.example                 # Variables backend
├── frontend/
│   ├── Dockerfile                  # Frontend Docker
│   ├── nginx.conf                  # Configuración Nginx
│   ├── .dockerignore               # Optimización
│   └── env.example                 # Variables frontend
└── nginx/
    └── nginx.conf                  # Proxy reverso SSL
```

## 🎯 Próximos Pasos

1. **Configurar variables de entorno** según tus necesidades
2. **Probar en desarrollo** con `docker-compose.dev.yml`
3. **Configurar webhook de WhatsApp** cuando esté listo
4. **Desplegar en VPS** con `docker-compose.yml`
5. **Configurar SSL** para producción

¿Tienes alguna pregunta específica sobre la configuración? 