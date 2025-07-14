# Usar Node.js 18 LTS como imagen base
FROM node:18-alpine AS base

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Etapa de desarrollo/construcción
FROM base AS development

# Instalar dependencias de desarrollo
RUN npm ci

# Copiar código fuente
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Etapa de producción
FROM base AS production

# Copiar código fuente
COPY . .

# Instalar dependencias de desarrollo para build
RUN npm ci

# Generar cliente de Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Limpiar dependencias de desarrollo
RUN npm ci --only=production && npm cache clean --force

# Crear directorio para uploads
RUN mkdir -p uploads/media uploads/temp

# Crear directorio para logs
RUN mkdir -p logs

# Configurar usuario no root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Cambiar permisos de archivos
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /app/uploads /app/logs

USER nextjs

# Exponer puerto
EXPOSE 3002

# Comando para ejecutar la aplicación
CMD ["npm", "run", "start"] 