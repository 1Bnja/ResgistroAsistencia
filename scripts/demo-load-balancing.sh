#!/bin/bash

###############################################################################
# Demostración Visual de Load Balancing
# 
# Este script genera tráfico continuo mientras muestra estadísticas en
# tiempo real de cómo se distribuye la carga.
###############################################################################

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      DEMOSTRACIÓN DE LOAD BALANCING EN TIEMPO REAL        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Este script generará tráfico continuo y mostrará estadísticas${NC}"
echo -e "${CYAN}de distribución de carga entre las réplicas.${NC}\n"

echo -e "${YELLOW}Dashboard HAProxy:${NC} ${GREEN}http://localhost:8404/stats${NC}"
echo -e "${YELLOW}Credenciales:${NC} admin / admin123\n"

echo -e "${MAGENTA}Presiona Ctrl+C para detener${NC}\n"

sleep 2

# Función para obtener estadísticas de un backend
get_backend_stats() {
    local backend=$1
    curl -s "http://localhost:8405/metrics" 2>/dev/null | \
        grep "haproxy_server_current_sessions{backend=\"${backend}\"" | \
        awk -F'"' '{print $4 ":" $NF}' | \
        awk '{printf "%-20s %s\n", $1, $2}'
}

# Contador de requests
frontend_count=0
api_count=0
ws_count=0

# Trap para cleanup al salir
cleanup() {
    echo -e "\n\n${GREEN}Estadísticas finales:${NC}"
    echo -e "  Frontend requests: ${CYAN}${frontend_count}${NC}"
    echo -e "  API requests: ${CYAN}${api_count}${NC}"
    echo -e "  WebSocket checks: ${CYAN}${ws_count}${NC}"
    echo -e "\n${YELLOW}Demostración terminada.${NC}\n"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Loop principal
while true; do
    clear
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         LOAD BALANCING - ESTADÍSTICAS EN VIVO             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
    
    # Generar tráfico a frontend
    curl -s http://localhost:8080/ > /dev/null 2>&1 && ((frontend_count++))
    
    # Generar tráfico a API
    curl -s http://localhost:3000/health > /dev/null 2>&1 && ((api_count++))
    
    # Check WebSocket
    curl -s http://localhost:3002/health > /dev/null 2>&1 && ((ws_count++))
    
    # Mostrar contadores
    echo -e "${CYAN}Total de Requests Generados:${NC}"
    echo -e "  Frontend: ${GREEN}${frontend_count}${NC}"
    echo -e "  API Backend: ${GREEN}${api_count}${NC}"
    echo -e "  WebSocket: ${GREEN}${ws_count}${NC}\n"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}FRONTEND BACKEND${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Intentar obtener stats de HAProxy
    if command -v socat > /dev/null 2>&1; then
        echo "show stat" | socat stdio /var/run/haproxy.sock 2>/dev/null | \
            grep "frontend_backend" | \
            cut -d',' -f1,2,5,8,9,18,34 | \
            sed 's/,/ | /g' || echo -e "${YELLOW}  No se pueden obtener stats via socket${NC}"
    else
        # Verificar contenedores directamente
        for container in frontend-1 frontend-2; do
            if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
                health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
                case $health in
                    "healthy") status="${GREEN}●${NC} UP" ;;
                    "unhealthy") status="${RED}●${NC} DOWN" ;;
                    *) status="${YELLOW}●${NC} UNKNOWN" ;;
                esac
                echo -e "  ${status} ${container}"
            fi
        done
    fi
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}API BACKEND${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    for i in 1 2; do
        container="api-backend-$i"
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            case $health in
                "healthy") status="${GREEN}●${NC} UP" ;;
                "unhealthy") status="${RED}●${NC} DOWN" ;;
                *) status="${YELLOW}●${NC} UNKNOWN" ;;
            esac
            echo -e "  ${status} ${container}"
        fi
    done
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}WEBSOCKET BACKEND${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    for i in 1 2; do
        container="websocket-service-$i"
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            case $health in
                "healthy") status="${GREEN}●${NC} UP" ;;
                "unhealthy") status="${RED}●${NC} DOWN" ;;
                *) status="${YELLOW}●${NC} UNKNOWN" ;;
            esac
            port=$(docker port "$container" 2>/dev/null | grep 3002 | cut -d':' -f2 || echo "N/A")
            echo -e "  ${status} ${container} ${CYAN}(port: ${port})${NC}"
        fi
    done
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}AI SERVICE BACKEND${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    for i in 1 2; do
        container="ai-service-$i"
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            case $health in
                "healthy") status="${GREEN}●${NC} UP" ;;
                "unhealthy") status="${RED}●${NC} DOWN" ;;
                *) status="${YELLOW}●${NC} UNKNOWN" ;;
            esac
            port=$(docker port "$container" 2>/dev/null | grep 5000 | cut -d':' -f2 || echo "N/A")
            echo -e "  ${status} ${container} ${CYAN}(port: ${port})${NC}"
        fi
    done
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Dashboard:${NC} ${GREEN}http://localhost:8404/stats${NC}"
    echo -e "${YELLOW}Algoritmo:${NC} ${CYAN}Round-Robin${NC}"
    echo -e "${MAGENTA}Presiona Ctrl+C para detener${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    sleep 1
done
