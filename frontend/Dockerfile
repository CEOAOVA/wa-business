# Etapa de construcción
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Etapa de producción - usar nginx para servir archivos estáticos
FROM nginx:alpine AS production

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos construidos desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear directorio para logs
RUN mkdir -p /var/log/nginx

# Configurar permisos
RUN chown -R nginx:nginx /usr/share/nginx/html /var/log/nginx

# Exponer puerto 80
EXPOSE 80

# Comando para ejecutar nginx
CMD ["nginx", "-g", "daemon off;"] 