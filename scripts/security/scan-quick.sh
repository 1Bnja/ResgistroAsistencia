#!/bin/bash
# Escaneo rápido de un servicio específico

if [ -z "$1" ]; then
    echo "Uso: ./scan-quick.sh <nombre-servicio>"
    echo "Ejemplo: ./scan-quick.sh frontend"
    echo ""
    echo "Servicios disponibles:"
    echo "  - api-backend"
    echo "  - api-IA"
    echo "  - frontend"
    echo "  - terminal-marcaje"
    echo "  - notification-service"
    echo "  - export-service"
    echo "  - websocket-service"
    exit 1
fi

SERVICE=$1
DOCKERFILE="./services/${SERVICE}/Dockerfile"

if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: No se encontró Dockerfile en services/${SERVICE}/"
    exit 1
fi

echo "Escaneando ${SERVICE}..."
echo ""

# Escanear Dockerfile
echo "=== Análisis de Dockerfile ==="
trivy config "$DOCKERFILE" --severity HIGH,CRITICAL

echo ""
echo "=== Análisis de dependencias (package.json/requirements.txt) ==="

# Escanear dependencias según el tipo de servicio
if [ -f "./services/${SERVICE}/package.json" ]; then
    trivy fs "./services/${SERVICE}/package.json" --severity HIGH,CRITICAL
elif [ -f "./services/${SERVICE}/requirements.txt" ]; then
    trivy fs "./services/${SERVICE}/requirements.txt" --severity HIGH,CRITICAL
fi
