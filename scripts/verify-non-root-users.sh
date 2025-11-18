#!/bin/bash

###############################################################################
# Script de Verificación de Usuarios No Privilegiados en Contenedores
# 
# Este script verifica que los contenedores estén ejecutando con usuarios
# no privilegiados (non-root) según la implementación de seguridad.
#
# Uso: ./scripts/verify-non-root-users.sh
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verificación de Usuarios No Privilegiados${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Función para verificar usuario en contenedor
check_container_user() {
    local container_name=$1
    local expected_user=$2
    local should_be_root=$3
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${YELLOW}⚠️  ${container_name}: Contenedor no está ejecutando${NC}"
        return
    fi
    
    actual_user=$(docker exec "$container_name" whoami 2>/dev/null || echo "error")
    
    if [ "$actual_user" = "error" ]; then
        echo -e "${YELLOW}⚠️  ${container_name}: No se pudo determinar el usuario${NC}"
        return
    fi
    
    if [ "$should_be_root" = "yes" ]; then
        if [ "$actual_user" = "root" ]; then
            echo -e "${BLUE}ℹ️  ${container_name}: ${actual_user} (requiere privilegios - OK)${NC}"
        else
            echo -e "${YELLOW}⚠️  ${container_name}: ${actual_user} (esperaba root por requisitos)${NC}"
        fi
    else
        if [ "$actual_user" = "root" ]; then
            echo -e "${RED}❌ ${container_name}: ${actual_user} (DEBERÍA SER NO PRIVILEGIADO)${NC}"
        elif [ "$actual_user" = "$expected_user" ] || [ "$expected_user" = "any" ]; then
            echo -e "${GREEN}✅ ${container_name}: ${actual_user} (usuario no privilegiado)${NC}"
        else
            echo -e "${YELLOW}⚠️  ${container_name}: ${actual_user} (esperaba: ${expected_user})${NC}"
        fi
    fi
}

echo -e "${GREEN}Servicios con usuario no privilegiado:${NC}\n"

# Servicios que DEBEN tener usuario no privilegiado
check_container_user "api-backend-dev" "nodejs" "no"
check_container_user "api-backend-slave" "nodejs" "no"
check_container_user "asistencia-notification-service" "nodejs" "no"
check_container_user "websocket-service" "node" "no"
check_container_user "ai-service" "appuser" "no"
check_container_user "frontend-1" "nginx-user" "no"
check_container_user "frontend-2" "nginx-user" "no"
check_container_user "terminal-marcaje" "nginx-user" "no"
check_container_user "asistencia-export-service" "node" "no"

echo -e "\n${BLUE}Servicios con imágenes oficiales (ya usan usuario no privilegiado):${NC}\n"

# Servicios con imágenes oficiales que usan usuarios no privilegiados por defecto
if docker ps --format '{{.Names}}' | grep -q "prometheus"; then
    prom_user=$(docker exec $(docker ps -q -f name=prometheus) whoami 2>/dev/null || echo "error")
    if [ "$prom_user" != "error" ]; then
        echo -e "${GREEN}✅ prometheus: ${prom_user} (imagen oficial)${NC}"
    fi
fi

if docker ps --format '{{.Names}}' | grep -q "grafana"; then
    grafana_user=$(docker exec $(docker ps -q -f name=grafana) whoami 2>/dev/null || echo "error")
    if [ "$grafana_user" != "error" ]; then
        echo -e "${GREEN}✅ grafana: ${grafana_user} (imagen oficial)${NC}"
    fi
fi

echo -e "\n${YELLOW}Servicios que requieren privilegios (por diseño):${NC}\n"

# Servicios que REQUIEREN root por limitaciones técnicas
check_container_user "api-gateway" "root" "yes"
check_container_user "asistencia-backup-service" "root" "yes"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Verificación de Puertos${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar puertos internos de servicios que cambiaron
echo -e "Verificando puertos internos de servicios actualizados:\n"

check_port() {
    local container=$1
    local expected_port=$2
    local description=$3
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${YELLOW}⚠️  ${container}: Contenedor no está ejecutando${NC}"
        return
    fi
    
    if docker exec "$container" sh -c "command -v netstat >/dev/null 2>&1"; then
        listening=$(docker exec "$container" netstat -tlnp 2>/dev/null | grep ":${expected_port}" || echo "")
    elif docker exec "$container" sh -c "command -v ss >/dev/null 2>&1"; then
        listening=$(docker exec "$container" ss -tlnp 2>/dev/null | grep ":${expected_port}" || echo "")
    else
        listening=$(docker port "$container" 2>/dev/null | grep "${expected_port}" || echo "")
    fi
    
    if [ -n "$listening" ]; then
        echo -e "${GREEN}✅ ${container}: ${description} escuchando en puerto ${expected_port}${NC}"
    else
        echo -e "${RED}❌ ${container}: ${description} NO escucha en puerto ${expected_port}${NC}"
    fi
}

check_port "frontend-1" "8080" "Nginx"
check_port "frontend-2" "8080" "Nginx"
check_port "terminal-marcaje" "8080" "Nginx"
check_port "websocket-service" "3002" "WebSocket"
check_port "ai-service" "5000" "Flask (AI)"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Verificación de Salud de Servicios${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Health checks
echo -e "Verificando endpoints de salud:\n"

check_health() {
    local url=$1
    local service_name=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name}: Health check OK${NC}"
    else
        echo -e "${RED}❌ ${service_name}: Health check FAILED${NC}"
    fi
}

check_health "http://localhost:3000/health" "api-backend"
check_health "http://localhost:3001/health" "api-backend-slave"
check_health "http://localhost:3002/health" "websocket-service"
check_health "http://localhost:5050/health" "ai-service"
check_health "http://localhost:8080/health" "api-gateway"
check_health "http://localhost:8080/health.html" "frontend (via gateway)"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Resumen de Seguridad${NC}"
echo -e "${BLUE}========================================${NC}\n"

total_containers=$(docker ps --format '{{.Names}}' | wc -l | tr -d ' ')
non_root_count=0
root_required_count=0
root_unnecessary_count=0

# Contar contenedores no privilegiados
for container in api-backend-dev api-backend-slave asistencia-notification-service websocket-service ai-service frontend-1 frontend-2 terminal-marcaje asistencia-export-service; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        user=$(docker exec "$container" whoami 2>/dev/null || echo "root")
        if [ "$user" != "root" ]; then
            ((non_root_count++))
        else
            ((root_unnecessary_count++))
        fi
    fi
done

# Contar contenedores que requieren root
for container in api-gateway asistencia-backup-service; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        ((root_required_count++))
    fi
done

echo -e "Contenedores totales ejecutando: ${BLUE}${total_containers}${NC}"
echo -e "Contenedores con usuario no privilegiado: ${GREEN}${non_root_count}${NC}"
echo -e "Contenedores que requieren root (por diseño): ${YELLOW}${root_required_count}${NC}"
if [ $root_unnecessary_count -gt 0 ]; then
    echo -e "Contenedores ejecutando como root (necesitan corrección): ${RED}${root_unnecessary_count}${NC}"
fi

echo -e "\n${GREEN}Verificación completada.${NC}\n"

if [ $root_unnecessary_count -gt 0 ]; then
    echo -e "${RED}⚠️  ATENCIÓN: Algunos contenedores están ejecutando como root cuando no deberían.${NC}"
    echo -e "${YELLOW}Revisa la documentación en docs/USUARIOS_NO_PRIVILEGIADOS.md${NC}\n"
    exit 1
fi

echo -e "${GREEN}✅ Todos los contenedores están ejecutando con la configuración de seguridad apropiada.${NC}\n"
