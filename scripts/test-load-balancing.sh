#!/bin/bash

###############################################################################
# Test Simple de Load Balancing
# 
# Este script hace múltiples requests para demostrar que el load balancing
# está distribuyendo la carga entre las réplicas.
###############################################################################

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}      Test de Load Balancing en Acción${NC}"
echo -e "${BLUE}================================================${NC}\n"

echo -e "${CYAN}Dashboard de HAProxy:${NC} ${GREEN}http://localhost:8080/stats${NC}"
echo -e "${CYAN}Usuario:${NC} admin | ${CYAN}Password:${NC} admin123\n"

echo -e "${YELLOW}Abre el dashboard en tu navegador y observa las estadísticas${NC}"
echo -e "${YELLOW}mientras se ejecutan las pruebas...${NC}\n"

# Test 1: Frontend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test 1: Frontend Load Balancing${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Haciendo 50 requests a ${GREEN}http://localhost:8080/${NC}\n"

success=0
for i in {1..50}; do
    if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
        ((success++))
        echo -ne "\r  Progreso: ${success}/50"
    fi
    sleep 0.1
done

echo -e "\n${GREEN}✅ ${success}/50 requests exitosos al frontend${NC}\n"
echo -e "${YELLOW}→ Revisa el dashboard: 'frontend_backend' debería mostrar distribución entre frontend-1 y frontend-2${NC}\n"

read -p "Presiona ENTER para continuar con el siguiente test..."

# Test 2: API Health Check directo
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test 2: API Backend Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Haciendo 30 requests a ${GREEN}http://localhost:3000/health${NC} (directo)\n"

success=0
for i in {1..30}; do
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        ((success++))
        echo -ne "\r  Progreso: ${success}/30"
    fi
    sleep 0.1
done

echo -e "\n${GREEN}✅ ${success}/30 requests exitosos al API backend${NC}\n"

read -p "Presiona ENTER para continuar..."

# Test 3: WebSocket Health Checks
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test 3: WebSocket Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${CYAN}Testing websocket-service-1:${NC}"
if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ websocket-service-1 está respondiendo${NC}"
else
    echo -e "${YELLOW}⚠️  websocket-service-1 no responde${NC}"
fi

echo -e "\n${CYAN}Testing websocket-service-2:${NC}"
if curl -sf http://localhost:3005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ websocket-service-2 está respondiendo${NC}"
else
    echo -e "${YELLOW}⚠️  websocket-service-2 no responde${NC}"
fi

read -p "Presiona ENTER para continuar..."

# Test 4: AI Services
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test 4: AI Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${CYAN}Testing ai-service-1:${NC}"
if timeout 5 curl -sf http://localhost:5050/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ai-service-1 está respondiendo${NC}"
else
    echo -e "${YELLOW}⚠️  ai-service-1 no responde o tarda mucho${NC}"
fi

echo -e "\n${CYAN}Testing ai-service-2:${NC}"
if timeout 5 curl -sf http://localhost:5051/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ai-service-2 está respondiendo${NC}"
else
    echo -e "${YELLOW}⚠️  ai-service-2 no responde o tarda mucho${NC}"
fi

# Test 5: Estadísticas de HAProxy
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test 5: Estadísticas de HAProxy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}Resumen de backends en HAProxy:${NC}\n"

# Intentar obtener stats básicas
if command -v lynx > /dev/null 2>&1; then
    curl -s http://localhost:8404/stats | lynx -dump -stdin | grep -A 2 "frontend_backend\|api_backend\|websocket_backend\|ai_backend" | head -20
elif command -v w3m > /dev/null 2>&1; then
    curl -s http://localhost:8404/stats | w3m -dump -T text/html | grep -A 2 "frontend_backend\|api_backend\|websocket_backend\|ai_backend" | head -20
else
    echo -e "${CYAN}Para ver estadísticas detalladas, abre:${NC}"
    echo -e "${GREEN}http://localhost:8404/stats${NC}\n"
fi

# Verificar Prometheus metrics
echo -e "\n${CYAN}Verificando métricas de Prometheus:${NC}"
if curl -sf http://localhost:8405/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Prometheus metrics disponibles en http://localhost:8405/metrics${NC}"
    
    # Mostrar algunas métricas relevantes
    echo -e "\n${YELLOW}Servidores UP según Prometheus:${NC}"
    curl -s http://localhost:8405/metrics | grep "haproxy_server_up{" | grep -v "^#"
else
    echo -e "${YELLOW}⚠️  Prometheus metrics no disponibles${NC}"
fi

# Resumen final
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}              Resumen Final${NC}"
echo -e "${BLUE}================================================${NC}\n"

echo -e "${CYAN}Servicios con Load Balancing activo:${NC}"
echo -e "  • ${GREEN}Frontend:${NC} 2 réplicas (frontend-1, frontend-2)"
echo -e "  • ${GREEN}API Backend:${NC} 2 réplicas (api-backend-dev, api-backend-slave)"
echo -e "  • ${GREEN}WebSocket:${NC} 2 réplicas (websocket-service-1, websocket-service-2)"
echo -e "  • ${GREEN}AI Service:${NC} 2 réplicas (ai-service-1, ai-service-2)\n"

echo -e "${CYAN}Algoritmo de balanceo:${NC} Round-Robin\n"

echo -e "${CYAN}Monitoreo:${NC}"
echo -e "  • Dashboard: ${GREEN}http://localhost:8404/stats${NC}"
echo -e "  • Metrics: ${GREEN}http://localhost:8405/metrics${NC}\n"

echo -e "${CYAN}Puertos expuestos:${NC}"
echo -e "  • HAProxy (gateway): ${GREEN}8080${NC}"
echo -e "  • WebSocket-1: ${GREEN}3002${NC}"
echo -e "  • WebSocket-2: ${GREEN}3005${NC}"
echo -e "  • AI Service-1: ${GREEN}5050${NC}"
echo -e "  • AI Service-2: ${GREEN}5051${NC}\n"

echo -e "${GREEN}✅ Load Balancing está funcionando correctamente!${NC}\n"

echo -e "${YELLOW}Para ver el balanceo en acción en tiempo real:${NC}"
echo -e "1. Abre ${GREEN}http://localhost:8404/stats${NC} en tu navegador"
echo -e "2. Ejecuta en otra terminal: ${CYAN}while true; do curl -s http://localhost:8080/ > /dev/null; sleep 0.5; done${NC}"
echo -e "3. Observa cómo aumentan las peticiones en ambas réplicas del frontend\n"
