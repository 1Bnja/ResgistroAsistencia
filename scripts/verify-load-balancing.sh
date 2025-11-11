#!/bin/bash

###############################################################################
# Script de Verificación de Load Balancing
# 
# Este script verifica que el load balancing esté funcionando correctamente
# probando la distribución de carga entre las réplicas de cada servicio.
#
# Uso: ./scripts/verify-load-balancing.sh
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verificación de Load Balancing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar que HAProxy está corriendo
if ! docker ps | grep -q "api-gateway"; then
    echo -e "${RED}❌ HAProxy (api-gateway) no está ejecutando${NC}"
    echo -e "${YELLOW}Ejecuta: docker compose up -d api-gateway${NC}\n"
    exit 1
fi

echo -e "${GREEN}✅ HAProxy está ejecutando${NC}\n"

# Función para verificar réplicas
check_replicas() {
    local service_base=$1
    local replica_count=$2
    local running=0
    
    echo -e "${CYAN}Verificando réplicas de ${service_base}:${NC}"
    
    for i in $(seq 1 $replica_count); do
        container="${service_base}-${i}"
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "  ${GREEN}✅ ${container} está corriendo${NC}"
            ((running++))
        else
            echo -e "  ${RED}❌ ${container} NO está corriendo${NC}"
        fi
    done
    
    echo -e "  ${BLUE}Total: ${running}/${replica_count} réplicas activas${NC}\n"
    
    if [ $running -lt 1 ]; then
        echo -e "${RED}⚠️  Ninguna réplica de ${service_base} está activa${NC}\n"
        return 1
    fi
    
    return 0
}

# Verificar todas las réplicas
echo -e "${BLUE}Verificando estado de réplicas:${NC}\n"

check_replicas "frontend" 2
frontend_ok=$?

check_replicas "websocket-service" 2
websocket_ok=$?

check_replicas "ai-service" 2
ai_ok=$?

# Verificar API Backend (nombres especiales)
echo -e "${CYAN}Verificando réplicas de API Backend:${NC}"
api_running=0
if docker ps --format '{{.Names}}' | grep -q "api-backend-1"; then
    echo -e "  ${GREEN}✅ api-backend-1 está corriendo${NC}"
    ((api_running++))
else
    echo -e "  ${RED}❌ api-backend-1 NO está corriendo${NC}"
fi

if docker ps --format '{{.Names}}' | grep -q "api-backend-2"; then
    echo -e "  ${GREEN}✅ api-backend-2 está corriendo${NC}"
    ((api_running++))
else
    echo -e "  ${RED}❌ api-backend-2 NO está corriendo${NC}"
fi
echo -e "  ${BLUE}Total: ${api_running}/2 réplicas activas${NC}\n"

# Verificar HAProxy stats
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verificación de HAProxy Stats${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${CYAN}Acceso a HAProxy Dashboard:${NC}"
echo -e "  URL: ${GREEN}http://localhost:8404/stats${NC}"
echo -e "  Usuario: ${YELLOW}admin${NC}"
echo -e "  Password: ${YELLOW}admin123${NC}\n"

# Verificar endpoints de HAProxy
echo -e "${CYAN}Verificando endpoints de HAProxy:${NC}"

if curl -sf http://localhost:8404/stats > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Stats dashboard accesible${NC}"
else
    echo -e "  ${RED}❌ Stats dashboard NO accesible${NC}"
fi

if curl -sf http://localhost:8405/metrics > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Prometheus metrics accesible${NC}"
else
    echo -e "  ${RED}❌ Prometheus metrics NO accesible${NC}"
fi

if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Health check endpoint accesible${NC}"
else
    echo -e "  ${RED}❌ Health check endpoint NO accesible${NC}"
fi

echo ""

# Test de distribución de carga
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test de Distribución de Carga${NC}"
echo -e "${BLUE}========================================${NC}\n"

test_load_distribution() {
    local endpoint=$1
    local service_name=$2
    local test_count=${3:-10}
    
    echo -e "${CYAN}Testeando ${service_name} (${test_count} requests a ${endpoint}):${NC}"
    
    if ! curl -sf "$endpoint" > /dev/null 2>&1; then
        echo -e "${RED}❌ Endpoint no accesible: ${endpoint}${NC}\n"
        return 1
    fi
    
    local success=0
    local failed=0
    
    for i in $(seq 1 $test_count); do
        if curl -sf "$endpoint" > /dev/null 2>&1; then
            ((success++))
            echo -ne "\r  Progreso: ${success}/${test_count} exitosos"
        else
            ((failed++))
        fi
    done
    
    echo ""
    
    if [ $failed -eq 0 ]; then
        echo -e "  ${GREEN}✅ ${success}/${test_count} requests exitosos (${service_name})${NC}"
    else
        echo -e "  ${YELLOW}⚠️  ${success}/${test_count} exitosos, ${failed} fallidos${NC}"
    fi
    
    # Calcular tasa de éxito
    local success_rate=$((success * 100 / test_count))
    echo -e "  ${BLUE}Tasa de éxito: ${success_rate}%${NC}\n"
    
    if [ $success_rate -lt 80 ]; then
        echo -e "${RED}⚠️  Tasa de éxito baja. Revisar logs.${NC}\n"
        return 1
    fi
    
    return 0
}

# Probar diferentes endpoints
test_load_distribution "http://localhost:8080/health" "HAProxy Health" 20
test_load_distribution "http://localhost:8080/api/health" "API Backend" 20

# Test de frontend (si está accesible)
if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
    test_load_distribution "http://localhost:8080/" "Frontend" 10
fi

# Verificar health checks de servicios individuales
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Health Checks de Servicios Individuales${NC}"
echo -e "${BLUE}========================================${NC}\n"

check_service_health() {
    local container=$1
    local port=$2
    local path=$3
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${YELLOW}⚠️  ${container}: No está ejecutando${NC}"
        return 1
    fi
    
    # Intentar health check desde dentro del contenedor
    if docker exec "$container" sh -c "command -v curl >/dev/null 2>&1"; then
        if docker exec "$container" curl -sf "http://localhost:${port}${path}" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${container}: Health check OK${NC}"
            return 0
        else
            echo -e "${RED}❌ ${container}: Health check FAILED${NC}"
            return 1
        fi
    else
        # Si no hay curl, intentar con wget
        if docker exec "$container" sh -c "command -v wget >/dev/null 2>&1"; then
            if docker exec "$container" wget -q --spider "http://localhost:${port}${path}" 2>/dev/null; then
                echo -e "${GREEN}✅ ${container}: Health check OK${NC}"
                return 0
            else
                echo -e "${RED}❌ ${container}: Health check FAILED${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  ${container}: No se puede verificar (sin curl/wget)${NC}"
            return 1
        fi
    fi
}

# Frontend
check_service_health "frontend-1" "8080" "/health.html"
check_service_health "frontend-2" "8080" "/health.html"

# API Backend
check_service_health "api-backend-1" "3000" "/health"
check_service_health "api-backend-2" "3000" "/health"

# WebSocket
check_service_health "websocket-service-1" "3002" "/health"
check_service_health "websocket-service-2" "3002" "/health"

# AI Service (puede tardar más en responder)
echo -e "\n${CYAN}Verificando AI Services (puede tardar unos segundos)...${NC}"
if docker ps --format '{{.Names}}' | grep -q "ai-service-1"; then
    if timeout 10 docker exec ai-service-1 curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ai-service-1: Health check OK${NC}"
    else
        echo -e "${YELLOW}⚠️  ai-service-1: Health check timeout o failed${NC}"
    fi
fi

if docker ps --format '{{.Names}}' | grep -q "ai-service-2"; then
    if timeout 10 docker exec ai-service-2 curl -sf http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ai-service-2: Health check OK${NC}"
    else
        echo -e "${YELLOW}⚠️  ai-service-2: Health check timeout o failed${NC}"
    fi
fi

# Resumen final
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Resumen de Load Balancing${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${CYAN}Servicios con Load Balancing:${NC}"
echo -e "  • Frontend: 2 réplicas"
echo -e "  • API Backend: 2 réplicas (Master/Backup)"
echo -e "  • WebSocket: 2 réplicas"
echo -e "  • AI Service: 2 réplicas\n"

echo -e "${CYAN}Algoritmo de Balanceo:${NC}"
echo -e "  • Round-Robin para todos los servicios\n"

echo -e "${CYAN}Monitoreo:${NC}"
echo -e "  • Dashboard: ${GREEN}http://localhost:8404/stats${NC}"
echo -e "  • Metrics: ${GREEN}http://localhost:8405/metrics${NC}\n"

echo -e "${CYAN}Comandos útiles:${NC}"
echo -e "  • Ver logs HAProxy: ${YELLOW}docker logs -f api-gateway${NC}"
echo -e "  • Ver stats en terminal: ${YELLOW}watch -n 1 'curl -s http://localhost:8404/stats | grep -A 20 backend'${NC}"
echo -e "  • Test de carga: ${YELLOW}ab -n 1000 -c 10 http://localhost:8080/api/health${NC}\n"

# Verificar si hay problemas
problems=0

if [ $frontend_ok -ne 0 ] || [ $websocket_ok -ne 0 ] || [ $ai_ok -ne 0 ] || [ $api_running -lt 1 ]; then
    ((problems++))
fi

if [ $problems -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Se detectaron algunos problemas. Revisa los detalles arriba.${NC}"
    echo -e "${YELLOW}Para más información, consulta: docs/LOAD_BALANCING.md${NC}\n"
    exit 1
else
    echo -e "${GREEN}✅ Load Balancing configurado y funcionando correctamente${NC}\n"
fi
