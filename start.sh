#!/bin/bash

echo "🚀 Iniciando Sistema de Control de Asistencia"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker no está corriendo. Por favor inicia Docker Desktop.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Construyendo servicios...${NC}"
docker-compose build

echo ""
echo -e "${BLUE}🔄 Levantando servicios...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Servicios iniciados!${NC}"
echo ""
echo "📍 URLs de acceso:"
echo "================================"
echo -e "🖥️  Terminal de Marcaje:  ${BLUE}http://localhost:5174${NC}"
echo -e "📊 Dashboard Admin:       ${BLUE}http://localhost:8080${NC}"
echo -e "🔌 API Backend:           ${BLUE}http://localhost:3000${NC}"
echo -e "🌐 WebSocket Service:     ${BLUE}http://localhost:3002${NC}"
echo ""
echo "📋 Comandos útiles:"
echo "================================"
echo "Ver logs:           docker-compose logs -f"
echo "Ver estado:         docker-compose ps"
echo "Detener servicios:  docker-compose down"
echo "Reiniciar:          docker-compose restart"
echo ""
echo -e "${GREEN}🎉 Sistema listo para usar!${NC}"
echo ""
echo "Para detener el sistema, presiona Ctrl+C y ejecuta:"
echo "  docker-compose down"
echo ""
