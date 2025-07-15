#!/bin/bash
# Script para arreglar SSL manualmente en servidor Coolify
# Ejecutar en el servidor donde corre Coolify

echo "🔧 Arreglando SSL para dev-apiwaprueba.aova.mx"

# 1. Verificar que el dominio resuelve a este servidor
echo "1. Verificando DNS..."
nslookup dev-apiwaprueba.aova.mx

# 2. Verificar si Traefik está corriendo
echo "2. Verificando Traefik..."
docker ps | grep traefik

# 3. Revisar logs de Traefik para errores SSL
echo "3. Revisando logs de Traefik..."
docker logs $(docker ps -q --filter "name=traefik") | tail -50 | grep -i "dev-apiwaprueba.aova.mx\|ssl\|acme\|certificate"

# 4. Generar certificado manualmente si es necesario
echo "4. Generando certificado Let's Encrypt manualmente..."
certbot certonly --standalone --preferred-challenges http -d dev-apiwaprueba.aova.mx

# 5. Reiniciar Traefik para cargar nuevo certificado
echo "5. Reiniciando Traefik..."
docker restart $(docker ps -q --filter "name=traefik")

# 6. Verificar certificado
echo "6. Verificando certificado..."
sleep 10
echo | openssl s_client -connect dev-apiwaprueba.aova.mx:443 -servername dev-apiwaprueba.aova.mx 2>/dev/null | openssl x509 -noout -dates

echo "✅ Proceso completado. Verifica https://dev-apiwaprueba.aova.mx" 