#!/bin/bash
# Script para escanear vulnerabilidades en contenedores con Trivy

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Escaneando contenedores con Trivy ===${NC}\n"

# Crear directorio para reportes
REPORTS_DIR="./security-reports"
mkdir -p "$REPORTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Lista de servicios a escanear
SERVICES=(
    "api-backend"
    "api-IA"
    "frontend"
    "terminal-marcaje"
    "notification-service"
    "export-service"
    "websocket-service"
    "backup-service"
    "grafana"
    "prometheus"
    "api-gateway"
)

# Función para escanear un Dockerfile
scan_dockerfile() {
    local service=$1
    local dockerfile="./services/${service}/Dockerfile"
    
    if [ -f "$dockerfile" ]; then
        echo -e "${YELLOW}Escaneando Dockerfile de ${service}...${NC}"
        trivy config "$dockerfile" \
            --severity HIGH,CRITICAL \
            --format table \
            > "${REPORTS_DIR}/${service}_dockerfile_${TIMESTAMP}.txt" 2>&1 || true
        echo -e "${GREEN}✓ Completado${NC}\n"
    fi
}

# Función para escanear una imagen
scan_image() {
    local service=$1
    local image=$2
    
    echo -e "${YELLOW}Escaneando imagen ${image}...${NC}"
    trivy image "$image" \
        --severity HIGH,CRITICAL \
        --format table \
        > "${REPORTS_DIR}/${service}_image_${TIMESTAMP}.txt" 2>&1 || true
    echo -e "${GREEN}✓ Completado${NC}\n"
}

# Escanear Dockerfiles de todos los servicios
echo -e "${BLUE}1. Escaneando Dockerfiles...${NC}\n"
for service in "${SERVICES[@]}"; do
    scan_dockerfile "$service"
done

# Escanear imágenes base comunes
echo -e "${BLUE}2. Escaneando imágenes base...${NC}\n"
scan_image "base-node" "node:18-alpine"
scan_image "base-python" "python:3.11-slim"
scan_image "base-nginx" "nginx:alpine"
scan_image "base-mongo" "mongo:latest"
scan_image "base-redis" "redis:alpine"

# Escanear docker-compose.yml
echo -e "${BLUE}3. Escaneando docker-compose.yml...${NC}\n"
if [ -f "./docker-compose.yml" ]; then
    trivy config ./docker-compose.yml \
        --severity HIGH,CRITICAL \
        --format table \
        > "${REPORTS_DIR}/docker-compose_${TIMESTAMP}.txt" 2>&1 || true
    echo -e "${GREEN}✓ Completado${NC}\n"
fi

# Generar resumen
echo -e "${BLUE}4. Generando resumen...${NC}\n"
SUMMARY_FILE="${REPORTS_DIR}/summary_${TIMESTAMP}.txt"
echo "=== Resumen de Escaneo de Seguridad ===" > "$SUMMARY_FILE"
echo "Fecha: $(date)" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

# Contar vulnerabilidades
TOTAL_FILES=$(ls -1 "${REPORTS_DIR}"/*_${TIMESTAMP}.txt 2>/dev/null | wc -l | tr -d ' ')
echo "Archivos escaneados: $TOTAL_FILES" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

# Mostrar archivos con vulnerabilidades críticas
echo "Archivos con vulnerabilidades CRITICAL:" >> "$SUMMARY_FILE"
grep -l "CRITICAL" "${REPORTS_DIR}"/*_${TIMESTAMP}.txt 2>/dev/null | sed 's/.*\///' >> "$SUMMARY_FILE" || echo "Ninguno" >> "$SUMMARY_FILE"

echo "" >> "$SUMMARY_FILE"
echo "Archivos con vulnerabilidades HIGH:" >> "$SUMMARY_FILE"
grep -l "HIGH" "${REPORTS_DIR}"/*_${TIMESTAMP}.txt 2>/dev/null | sed 's/.*\///' >> "$SUMMARY_FILE" || echo "Ninguno" >> "$SUMMARY_FILE"

cat "$SUMMARY_FILE"

echo -e "\n${GREEN}=== Escaneo completado ===${NC}"
echo -e "Reportes guardados en: ${BLUE}${REPORTS_DIR}/${NC}"
echo -e "Ver resumen: ${BLUE}cat ${SUMMARY_FILE}${NC}"
