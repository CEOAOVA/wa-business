#!/bin/bash

# Script para reiniciar servicios con los nuevos cambios
# Uso: ./restart-services.sh

echo "🚀 Reiniciando servicios con cambios de WebSocket..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend
echo -e "${YELLOW}📦 Compilando Backend...${NC}"
cd backend
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend compilado exitosamente${NC}"
else
    echo -e "${RED}❌ Error compilando backend${NC}"
    exit 1
fi

# Detener proceso anterior si existe
echo -e "${YELLOW}🛑 Deteniendo procesos anteriores...${NC}"
pkill -f "node dist/server.js" 2>/dev/null || true
sleep 2

# Iniciar backend en background
echo -e "${YELLOW}🚀 Iniciando Backend...${NC}"
npm run start &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend iniciado con PID: $BACKEND_PID${NC}"

# Frontend
cd ../frontend
echo -e "${YELLOW}🎨 Iniciando Frontend...${NC}"

# Detener proceso anterior si existe
pkill -f "vite" 2>/dev/null || true
sleep 2

# Iniciar frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend iniciado con PID: $FRONTEND_PID${NC}"

# Esperar un momento para que los servicios se estabilicen
sleep 5

# Verificar que los servicios estén corriendo
echo -e "${YELLOW}🔍 Verificando servicios...${NC}"

# Verificar backend
curl -s http://localhost:3001/health > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend respondiendo en http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend no responde${NC}"
fi

# Verificar frontend
curl -s http://localhost:5173 > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend respondiendo en http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend no responde${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SERVICIOS REINICIADOS EXITOSAMENTE${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 Logs del Backend: tail -f backend/logs/app.log"
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend: http://localhost:3001"
echo ""
echo "Para detener los servicios:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${YELLOW}🧪 Ahora puedes probar la conexión WebSocket${NC}"
echo "1. Abre http://localhost:5173 en el navegador"
echo "2. Abre la consola (F12)"
echo "3. Ejecuta: testWebSocket()"
echo ""

# Mantener el script corriendo
echo "Presiona Ctrl+C para detener todos los servicios"
wait