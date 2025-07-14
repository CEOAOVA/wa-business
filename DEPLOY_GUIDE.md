# Guía de Despliegue - WhatsApp Business Platform

## 🚀 Arquitectura de Despliegue

```
Frontend (React + Vite)     Backend (Node.js + Express)
┌─────────────────────────┐  ┌─────────────────────────┐
│ dev-waprueba.aova.mx    │  │ dev-apiwaprueba.aova.mx │
│ Puerto: 80/443 (HTTPS)  │  │ Puerto: 3002            │
│ Nginx + SSL             │  │ PM2 + Node.js           │
└─────────────────────────┘  └─────────────────────────┘
            │                            │
            └────────── API Calls ───────┘
```

## 📋 Preparación del VPS

### 1. Configurar Nginx para Frontend
```nginx
# /etc/nginx/sites-available/dev-waprueba.aova.mx
server {
    listen 80;
    server_name dev-waprueba.aova.mx;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dev-waprueba.aova.mx;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    root /var/www/wa-business-frontend;
    index index.html;
    
    # Configuración para React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Configuración de headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. Configurar Nginx para Backend
```nginx
# /etc/nginx/sites-available/dev-apiwaprueba.aova.mx
server {
    listen 80;
    server_name dev-apiwaprueba.aova.mx;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dev-apiwaprueba.aova.mx;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Pasos de Despliegue

### Backend (dev-apiwaprueba.aova.mx)

1. **Subir código al VPS:**
```bash
# En tu VPS
cd /var/www/
git clone [tu-repo] wa-business-backend
cd wa-business-backend/backend
```

2. **Instalar dependencias:**
```bash
npm install
npm run build  # Si tienes build script
```

3. **Configurar variables de entorno:**
```bash
# Crear archivo .env basado en BACKEND_PRODUCTION_ENV.md
cp BACKEND_PRODUCTION_ENV.md .env
nano .env  # Editar con valores reales
```

4. **Configurar PM2:**
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'wa-business-backend',
    script: 'dist/app.js',  // o src/app.ts si usas ts-node
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Frontend (dev-waprueba.aova.mx)

1. **Preparar build local:**
```bash
# En tu máquina local, directorio frontend/
# Crear .env basado en FRONTEND_PRODUCTION_ENV.md
cp FRONTEND_PRODUCTION_ENV.md .env
nano .env  # Editar con valores reales

# Hacer build
npm run build
```

2. **Subir al VPS:**
```bash
# Comprimir dist/
tar -czf frontend-build.tar.gz dist/

# Subir al VPS (usando scp o rsync)
scp frontend-build.tar.gz user@tu-vps:/var/www/

# En el VPS
cd /var/www/
tar -xzf frontend-build.tar.gz
mv dist wa-business-frontend
```

3. **Configurar permisos:**
```bash
chown -R www-data:www-data /var/www/wa-business-frontend
chmod -R 755 /var/www/wa-business-frontend
```

## 🔒 Configuración de Seguridad

### 1. Firewall
```bash
# Permitir solo puertos necesarios
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw enable
```

### 2. SSL/TLS
```bash
# Usar Let's Encrypt
certbot --nginx -d dev-waprueba.aova.mx
certbot --nginx -d dev-apiwaprueba.aova.mx
```

### 3. Logs de Seguridad
```bash
# Configurar logrotate para logs de la aplicación
cat > /etc/logrotate.d/wa-business << EOF
/var/www/wa-business-backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload wa-business-backend
    endscript
}
EOF
```

## 🧪 Verificación del Despliegue

### 1. Verificar Backend
```bash
# Verificar que el backend esté funcionando
curl https://dev-apiwaprueba.aova.mx/health

# Verificar autenticación
curl -X POST https://dev-apiwaprueba.aova.mx/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aova.mx", "password": "aova2024_secure"}'
```

### 2. Verificar Frontend
```bash
# Verificar que el frontend cargue
curl -I https://dev-waprueba.aova.mx
```

### 3. Verificar Conectividad
- Frontend debe poder hacer llamadas al backend
- CORS debe estar configurado correctamente
- WebSocket debe funcionar para tiempo real

## 🔄 Comandos de Mantenimiento

```bash
# Reiniciar backend
pm2 restart wa-business-backend

# Ver logs
pm2 logs wa-business-backend

# Actualizar código
cd /var/www/wa-business-backend
git pull origin main
npm install
pm2 restart wa-business-backend

# Verificar estado
pm2 status
```

## 📞 Configuración de Webhook Meta

Una vez desplegado, configura el webhook en Meta:
- **URL:** `https://dev-apiwaprueba.aova.mx/api/chat/webhook`
- **Verify Token:** El que configuraste en `WEBHOOK_VERIFY_TOKEN`

## ⚠️ Notas Importantes

1. **Cambia todas las credenciales de ejemplo**
2. **Configura SSL antes de ir a producción**
3. **Monitorea logs regularmente**
4. **Haz backups de la configuración**
5. **Prueba la conectividad entre frontend y backend** 