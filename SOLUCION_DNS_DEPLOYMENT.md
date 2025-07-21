# 🌐 Guía de Configuración DNS y Deployment

## 📋 Información General
- **Dominio Principal**: aova.mx (GoDaddy)
- **Subdominio Objetivo**: dev-waprueba.aova.mx
- **Plataforma de Deployment**: Coolify
- **Servidor**: Hostinger

## 🔧 Configuración DNS en GoDaddy

### 1. Acceder al Panel de GoDaddy
1. Ir a GoDaddy.com
2. Iniciar sesión
3. Seleccionar el dominio `aova.mx`
4. Ir a "DNS Management" o "Administrar DNS"

### 2. Agregar Registro DNS
Agregar un nuevo registro tipo A o CNAME:

```
Tipo: A
Nombre: dev-waprueba
Valor: [IP_DEL_SERVIDOR_HOSTINGER]
TTL: 600 (10 minutos para pruebas)
```

O si prefieres CNAME:
```
Tipo: CNAME
Nombre: dev-waprueba
Valor: [DOMINIO_COOLIFY]
TTL: 600
```

## 🚀 Configuración en Coolify

### 1. Configuración del Proyecto
```yaml
# docker-compose.coolify.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - PORT=3000
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`dev-waprueba.aova.mx`) && PathPrefix(`/api`)"
      
  frontend:
    build: ./frontend
    environment:
      - REACT_APP_API_URL=https://dev-waprueba.aova.mx/api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`dev-waprueba.aova.mx`)"
```

### 2. Variables de Entorno
```env
# Backend
NODE_ENV=production
PORT=3000
OPENROUTER_API_KEY=[tu_api_key]
DATABASE_URL=[url_supabase]

# Frontend
REACT_APP_API_URL=https://dev-waprueba.aova.mx/api
```

## 🔍 Verificación DNS

### 1. Comprobar Propagación
```bash
nslookup dev-waprueba.aova.mx
dig dev-waprueba.aova.mx
```

### 2. Verificar SSL/TLS
- Asegurarse que Coolify genere certificados automáticamente
- Verificar redirección HTTPS

## ⚠️ Solución de Problemas Comunes

### 1. DNS no Propaga
- Esperar al menos 15-30 minutos por propagación
- Verificar que los registros DNS estén correctos
- Limpiar cache DNS local

### 2. SSL no Funciona
```bash
# Verificar certificado
curl -vI https://dev-waprueba.aova.mx
```

### 3. Aplicación no Responde
- Verificar logs de Coolify
- Comprobar puertos y configuración de Traefik
- Verificar firewall del servidor

## 📝 Pasos de Verificación Final

1. **DNS**:
   - [ ] Registro DNS creado en GoDaddy
   - [ ] Propagación DNS verificada
   - [ ] Subdominio resuelve a IP correcta

2. **Coolify**:
   - [ ] Proyecto configurado correctamente
   - [ ] Variables de entorno establecidas
   - [ ] Certificados SSL generados

3. **Aplicación**:
   - [ ] Backend responde en /api
   - [ ] Frontend carga correctamente
   - [ ] WebSocket funciona
   - [ ] HTTPS activo y válido

## 🔄 Mantenimiento

### Monitoreo
- Configurar alertas en Coolify
- Monitorear logs de aplicación
- Verificar certificados SSL mensualmente

### Backup
- Configurar respaldos de base de datos
- Documentar proceso de restauración
- Mantener copias de configuración

## 📞 Soporte

### GoDaddy
- Soporte: +52 55 4739 2934
- Panel: https://dcc.godaddy.com/manage/[DOMINIO]/dns

### Coolify
- Docs: https://coolify.io/docs
- GitHub: https://github.com/coollabsio/coolify

### Hostinger
- Panel: https://hpanel.hostinger.com
- Soporte: [AGREGAR_CONTACTO] 