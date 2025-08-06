version: '3.8'

services:
  # Backend - WhatsApp Business API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    ports:
      - "3002"
    environment:
      # App Configuration
      - NODE_ENV=production
      - PORT=3002
      - LOG_LEVEL=${LOG_LEVEL:-info}
      
      # WhatsApp Business API
      - WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN}
      - WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID}
      - WHATSAPP_API_VERSION=${WHATSAPP_API_VERSION:-v22.0}
      - WHATSAPP_BASE_URL=${WHATSAPP_BASE_URL:-https://graph.facebook.com}
      - WEBHOOK_VERIFY_TOKEN=${WEBHOOK_VERIFY_TOKEN}
      - WEBHOOK_PATH=${WEBHOOK_PATH:-/api/chat/webhook}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - WHATSAPP_APP_SECRET=${WHATSAPP_APP_SECRET}
      
      # OpenRouter AI Configuration
      - OPEN_ROUTER_API_KEY=${OPEN_ROUTER_API_KEY}
      - OPEN_ROUTER_BASE_URL=${OPEN_ROUTER_BASE_URL:-https://openrouter.ai/api/v1}
      - OPEN_ROUTER_DEFAULT_MODEL=${OPEN_ROUTER_DEFAULT_MODEL:-google/gemini-flash-1.5}
      - DEFAULT_TEMPERATURE=${DEFAULT_TEMPERATURE:-0.7}
      - DEFAULT_MAX_TOKENS=${DEFAULT_MAX_TOKENS:-1000}
      - LLM_TIMEOUT_MS=${LLM_TIMEOUT_MS:-60000}
      
      # SOAP Services (Embler Integration)
      - EMBLER_WSDL_URL=${EMBLER_WSDL_URL}
      - EMBLER_ENDPOINT_URL=${EMBLER_ENDPOINT_URL}
      - TOKEN_CACHE_DURATION=${TOKEN_CACHE_DURATION:-10}
      - INVENTORY_CACHE_TTL=${INVENTORY_CACHE_TTL:-300000}
      - SOAP_CONNECTION_RETRIES=${SOAP_CONNECTION_RETRIES:-3}
      
      # POS Configuration
      - DEFAULT_POS_ID=${DEFAULT_POS_ID:-SAT}
      - VALID_POS_IDS=${VALID_POS_IDS:-ME,CUA,ECA,IZT,LIND,PORT,QRO,SAT,TPN,VC}
      - POS_CREDENTIALS=${POS_CREDENTIALS}
      
      # Supabase Configuration (Base de datos)
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE=${SUPABASE_SERVICE_ROLE}
      
      # Authentication
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-8h}
      - AUTHORIZED_USERS=${AUTHORIZED_USERS}
      - TEMP_PASSWORD=${TEMP_PASSWORD}
      
      # External APIs
      - API_NINJAS_KEY=${API_NINJAS_KEY}
      
      # CORS Configuration
      - CORS_ORIGINS=${CORS_ORIGINS}
      
      # Frontend/Backend URLs (CRÍTICAS para CORS y WebSocket)
      - FRONTEND_URL=${FRONTEND_URL:-https://dev-waprueba.aova.mx}
      - BACKEND_URL=${BACKEND_URL:-https://dev-apiwaprueba.aova.mx}
      - PUBLIC_URL=${PUBLIC_URL:-https://dev-apiwaprueba.aova.mx}
      
      # Security Configuration
      - HOSTNAME=0.0.0.0
      - TRUST_PROXY=true
      - ENABLE_WEBHOOK_SIGNATURE=${ENABLE_WEBHOOK_SIGNATURE:-true}
      
      # Rate Limiting (Enhanced)
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-60000}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100}
      - RATE_LIMIT_AUTH_MAX=${RATE_LIMIT_AUTH_MAX:-20}
      - RATE_LIMIT_WEBHOOK_WINDOW=${RATE_LIMIT_WEBHOOK_WINDOW:-60000}
      - RATE_LIMIT_WEBHOOK_MAX=${RATE_LIMIT_WEBHOOK_MAX:-200}
      
      # Performance & Optimization (CRÍTICAS)
      - USE_DIRECT_SUPABASE=${USE_DIRECT_SUPABASE:-true}
      - USE_OPTIMIZED_QUERIES=${USE_OPTIMIZED_QUERIES:-true}
      - USE_BATCH_OPERATIONS=${USE_BATCH_OPERATIONS:-true}
      - USE_CIRCUIT_BREAKER=${USE_CIRCUIT_BREAKER:-true}
      - ENABLE_PERFORMANCE_METRICS=${ENABLE_PERFORMANCE_METRICS:-true}
      - ROLLBACK_THRESHOLD=${ROLLBACK_THRESHOLD:-10}
      - PERFORMANCE_MONITOR_INTERVAL=${PERFORMANCE_MONITOR_INTERVAL:-60000}
      
      # Memory Management (CRÍTICAS)
      - MAX_MEMORY_USAGE=${MAX_MEMORY_USAGE:-80}
      - CRITICAL_MEMORY_USAGE=${CRITICAL_MEMORY_USAGE:-95}
      - MEMORY_CHECK_INTERVAL=${MEMORY_CHECK_INTERVAL:-60000}
      - CACHE_MAX_SIZE=${CACHE_MAX_SIZE:-1000}
      
      # Database Configuration (Extended)
      - SUPABASE_POOLING=${SUPABASE_POOLING:-true}
      - SUPABASE_MAX_CONNECTIONS=${SUPABASE_MAX_CONNECTIONS:-10}
      
      # Authentication (Extended)
      - INITIAL_ADMIN_EMAIL=${INITIAL_ADMIN_EMAIL:-admin@aova.mx}
      - INITIAL_ADMIN_PASSWORD=${INITIAL_ADMIN_PASSWORD:-Agente2024!}
      
      # SOAP Configuration (Extended)
      - SOAP_CONNECTION_RETRIES=${SOAP_CONNECTION_RETRIES:-3}
      - LLM_TIMEOUT_MS=${LLM_TIMEOUT_MS:-60000}
      
      # System Configuration
      - ENABLE_DETAILED_LOGS=${ENABLE_DETAILED_LOGS:-false}
      
    restart: unless-stopped
    
    # Labels para SSL/HTTPS automático con Traefik
    labels:
      - "coolify.managed=true"
      - "coolify.version=4"
      - "coolify.service=wa-business-backend"
      - "traefik.enable=true"
      
      # Router HTTPS principal
      - "traefik.http.routers.wa-business-backend.rule=Host(`dev-apiwaprueba.aova.mx`)"
      - "traefik.http.routers.wa-business-backend.tls=true"
      - "traefik.http.routers.wa-business-backend.tls.certresolver=myresolver"
      - "traefik.http.routers.wa-business-backend.entrypoints=websecure"
      - "traefik.http.routers.wa-business-backend.service=wa-business-backend"
      
      # Router HTTP (redirect a HTTPS)
      - "traefik.http.routers.wa-business-backend-http.rule=Host(`dev-apiwaprueba.aova.mx`)"
      - "traefik.http.routers.wa-business-backend-http.entrypoints=web"
      - "traefik.http.routers.wa-business-backend-http.middlewares=backend-redirect-https"
      - "traefik.http.routers.wa-business-backend-http.service=wa-business-backend"
      
      # Middleware para redirect HTTPS del backend
      - "traefik.http.middlewares.backend-redirect-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.backend-redirect-https.redirectscheme.permanent=true"
      
      # Service configuration
      - "traefik.http.services.wa-business-backend.loadbalancer.server.port=3002"
      
      # Security headers middleware
      - "traefik.http.middlewares.backend-headers.headers.forcestsheader=true"
      - "traefik.http.middlewares.backend-headers.headers.stsincludesubdomains=true"
      - "traefik.http.middlewares.backend-headers.headers.stsseconds=31536000"
      - "traefik.http.middlewares.backend-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
      
      # CORS middleware
      - "traefik.http.middlewares.backend-cors.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
      - "traefik.http.middlewares.backend-cors.headers.accesscontrolallowheaders=Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-Token,X-Hub-Signature-256"
      - "traefik.http.middlewares.backend-cors.headers.accesscontrolalloworiginlistregex=^https://(.*\\.)?aova\\.mx$"
      - "traefik.http.middlewares.backend-cors.headers.accesscontrolallowcredentials=true"
      
      # Apply middlewares to HTTPS router
      - "traefik.http.routers.wa-business-backend.middlewares=backend-headers,backend-cors"
    
    # Configuración de recursos
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
      restart_policy:
        condition: on-failure
        max_attempts: 3
        delay: 30s
    
    # Configuración de red y seguridad
    networks:
      - coolify

  # Frontend - React WhatsApp Business Panel
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    ports:
      - "80"
    environment:
      # App Configuration
      - NODE_ENV=production
      - PORT=80
      
      # Backend API Connection
      - VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://dev-apiwaprueba.aova.mx}
      
      # Supabase Frontend Access (Para realtime)
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      
      # Alternative API URLs
      - VITE_API_URL=${VITE_API_URL:-${VITE_BACKEND_URL:-https://dev-apiwaprueba.aova.mx}}
      
      # Frontend Logging
      - VITE_LOG_LEVEL=${VITE_LOG_LEVEL:-warn}
      
      # SSL/Security Configuration
      - NGINX_HOST=0.0.0.0
      - NGINX_PORT=80
      - HOSTNAME=0.0.0.0
      - TRUST_PROXY=true
      
    restart: unless-stopped
    
    # Labels para SSL/HTTPS automático con Traefik
    labels:
      - "coolify.managed=true"
      - "coolify.version=4"
      - "coolify.service=wa-business-frontend"
      - "coolify.type=frontend"
      - "traefik.enable=true"
      
      # Router HTTPS principal
      - "traefik.http.routers.wa-business-frontend.rule=Host(`dev-waprueba.aova.mx`)"
      - "traefik.http.routers.wa-business-frontend.tls=true"
      - "traefik.http.routers.wa-business-frontend.tls.certresolver=myresolver"
      - "traefik.http.routers.wa-business-frontend.entrypoints=websecure"
      - "traefik.http.routers.wa-business-frontend.service=wa-business-frontend"
      
      # Router HTTP (redirect a HTTPS)
      - "traefik.http.routers.wa-business-frontend-http.rule=Host(`dev-waprueba.aova.mx`)"
      - "traefik.http.routers.wa-business-frontend-http.entrypoints=web"
      - "traefik.http.routers.wa-business-frontend-http.middlewares=frontend-redirect-https"
      - "traefik.http.routers.wa-business-frontend-http.service=wa-business-frontend"
      
      # Middleware para redirect HTTPS del frontend
      - "traefik.http.middlewares.frontend-redirect-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.frontend-redirect-https.redirectscheme.permanent=true"
      
      # Service configuration
      - "traefik.http.services.wa-business-frontend.loadbalancer.server.port=80"
      
      # Security headers middleware
      - "traefik.http.middlewares.frontend-headers.headers.forcestsheader=true"
      - "traefik.http.middlewares.frontend-headers.headers.stsincludesubdomains=true"
      - "traefik.http.middlewares.frontend-headers.headers.stsseconds=31536000"
      - "traefik.http.middlewares.frontend-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.middlewares.frontend-headers.headers.frameDeny=true"
      - "traefik.http.middlewares.frontend-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.frontend-headers.headers.referrerPolicy=strict-origin-when-cross-origin"
      
      # CSP middleware
      - "traefik.http.middlewares.frontend-csp.headers.contentSecurityPolicy=default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https: wss: https://dev-apiwaprueba.aova.mx; font-src 'self' https:; object-src 'none';"
      
      # Apply middlewares to HTTPS router
      - "traefik.http.routers.wa-business-frontend.middlewares=frontend-headers,frontend-csp"
    
    # Configuración de recursos
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    
    # Configuración de red y seguridad
    networks:
      - coolify

networks:
  coolify:
    external: true 


    -----------------------
    ngix

    events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Configuración de logs
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Configuración de rendimiento
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Configuración de compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/bmp
        image/svg+xml
        image/x-icon
        text/cache-manifest
        text/css
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy;

    # Upstream para el backend
    upstream backend {
        server backend:3002;
    }

    # Upstream para el frontend
    upstream frontend {
        server frontend:80;
    }

    # Servidor para frontend (dev-waprueba.aova.mx)
    server {
        listen 80;
        server_name dev-waprueba.aova.mx;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name dev-waprueba.aova.mx;
        
        # Configuración SSL
        ssl_certificate /etc/ssl/private/cert.pem;
        ssl_certificate_key /etc/ssl/private/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Headers de seguridad
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Proxy hacia el contenedor frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }

    # Servidor para backend (dev-apiwaprueba.aova.mx)
    server {
        listen 80;
        server_name dev-apiwaprueba.aova.mx;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name dev-apiwaprueba.aova.mx;
        
        # Configuración SSL
        ssl_certificate /etc/ssl/private/cert.pem;
        ssl_certificate_key /etc/ssl/private/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Headers de seguridad
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Proxy hacia el contenedor backend
        location / {
            proxy_pass http://backend;
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

        # WebSocket support para Socket.IO
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
} 