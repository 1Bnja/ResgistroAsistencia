#!/bin/bash
# Script para consultar logs de seguridad desde Loki
# Uso: ./consultar-logs-seguridad.sh [opcion]

LOKI_URL="http://localhost:3100"
TIME_RANGE="24h"  # Últimas 24 horas por defecto

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

function query_loki() {
    local query="$1"
    local limit="${2:-100}"

    # Calcular timestamps usando Python (Loki usa nanosegundos)
    local timestamps=$(python3 -c "
import time
time_range = '${TIME_RANGE}'
multiplier = {'h': 3600, 'm': 60, 'd': 86400}
unit = time_range[-1]
value = int(time_range[:-1])
seconds = value * multiplier.get(unit, 3600)
end_time = int(time.time())
start_time = end_time - seconds
print(f'{start_time}000000000 {end_time}000000000')
")
    local start_time=$(echo $timestamps | awk '{print $1}')
    local end_time=$(echo $timestamps | awk '{print $2}')

    # Hacer la consulta a Loki
    curl -s -G "${LOKI_URL}/loki/api/v1/query_range" \
        --data-urlencode "query=${query}" \
        --data-urlencode "limit=${limit}" \
        --data-urlencode "start=${start_time}" \
        --data-urlencode "end=${end_time}" | \
        python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['status'] == 'success':
        results = data['data']['result']
        count = 0
        for stream in results:
            labels = stream['stream']
            for value in stream['values']:
                timestamp, log = value
                # Convertir timestamp nanosegundos a segundos
                ts = int(timestamp) // 1000000000
                from datetime import datetime
                dt = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
                
                # Imprimir con formato
                service = labels.get('service', 'unknown')
                container = labels.get('container', 'unknown')
                print(f'[{dt}] [{service}] {log}')
                count += 1
        if count == 0:
            print('No se encontraron logs')
        else:
            print(f'\n--- Total: {count} logs ---')
    else:
        print('Error en la consulta:', data.get('error', 'Unknown error'))
except Exception as e:
    print(f'Error procesando respuesta: {e}')
    sys.exit(1)
"
}

function count_logs() {
    local query="$1"
    local message="$2"
    
    local encoded_query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''count_over_time($query[${TIME_RANGE}])'''))")
    
    count=$(curl -s -G "${LOKI_URL}/loki/api/v1/query" \
        --data-urlencode "query=sum(count_over_time(${query}[${TIME_RANGE}]))" | \
        python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['status'] == 'success':
        results = data['data']['result']
        if results and len(results) > 0:
            print(results[0]['value'][1])
        else:
            print('0')
    else:
        print('0')
except:
    print('0')
")
    
    echo -e "${message}: ${GREEN}${count}${NC}"
}

# Menú principal
case "$1" in
    "auth")
        print_header "INTENTOS DE AUTENTICACIÓN FALLIDOS"
        query='{service=~"api-backend.*"} |~ "(?i)(auth|login|password|token|jwt).*(error|fail|denied|invalid)"'
        query_loki "$query" 50
        ;;
    
    "access-denied")
        print_header "ACCESOS DENEGADOS (401, 403)"
        query='{service=~"api-gateway|api-backend.*"} |~ " (401|403) "'
        query_loki "$query" 50
        ;;
    
    "db")
        print_header "CONEXIONES A BASE DE DATOS"
        query='{service=~"api-backend.*|export-service|notification-service"} |~ "(?i)(mongodb|database).*(connect|disconnect|error)"'
        query_loki "$query" 50
        ;;
    
    "errors")
        print_header "ERRORES CRÍTICOS DEL SISTEMA"
        query='{service=~".*"} |~ "(?i)(critical|fatal|error)"'
        query_loki "$query" 100
        ;;
    
    "marcajes")
        print_header "ACTIVIDAD DE MARCAJES"
        query='{service=~"api-backend.*"} |~ "(?i)marcaje"'
        query_loki "$query" 100
        ;;
    
    "4xx")
        print_header "ERRORES HTTP 4XX (ÚLTIMAS 24H)"
        query='{service="api-gateway"} |~ " 4[0-9]{2} "'
        query_loki "$query" 100
        ;;
    
    "5xx")
        print_header "ERRORES HTTP 5XX (ÚLTIMAS 24H)"
        query='{service="api-gateway"} |~ " 5[0-9]{2} "'
        query_loki "$query" 100
        ;;
    
    "stats")
        print_header "ESTADÍSTICAS DE SEGURIDAD (ÚLTIMAS 24H)"
        echo ""
        count_logs '{service=~"api-backend.*"} |~ "(?i)(auth|login).*(error|fail)"' "Fallos de autenticación"
        count_logs '{service=~"api-gateway|api-backend.*"} |~ " 401 "' "Errores 401 (No autorizado)"
        count_logs '{service=~"api-gateway|api-backend.*"} |~ " 403 "' "Errores 403 (Prohibido)"
        count_logs '{service="api-gateway"} |~ " 4[0-9]{2} "' "Total errores 4xx"
        count_logs '{service="api-gateway"} |~ " 5[0-9]{2} "' "Total errores 5xx"
        count_logs '{service=~"api-backend.*"} |~ "(?i)marcaje"' "Operaciones de marcaje"
        count_logs '{service=~".*"} |~ "(?i)(error|critical|fatal)"' "Errores totales del sistema"
        echo ""
        ;;
    
    "service")
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Debes especificar el nombre del servicio${NC}"
            echo "Uso: $0 service <nombre-servicio>"
            echo "Ejemplo: $0 service api-backend-1"
            exit 1
        fi
        print_header "LOGS DEL SERVICIO: $2"
        query="{service=\"$2\"}"
        query_loki "$query" 100
        ;;
    
    "help"|"-h"|"--help")
        echo -e "${BLUE}=== SCRIPT DE CONSULTA DE LOGS DE SEGURIDAD ===${NC}"
        echo ""
        echo "Uso: $0 [opción]"
        echo ""
        echo "Opciones disponibles:"
        echo ""
        echo -e "  ${GREEN}auth${NC}           - Ver intentos de autenticación fallidos"
        echo -e "  ${GREEN}access-denied${NC}  - Ver accesos denegados (401, 403)"
        echo -e "  ${GREEN}db${NC}             - Ver conexiones a base de datos"
        echo -e "  ${GREEN}errors${NC}         - Ver errores críticos del sistema"
        echo -e "  ${GREEN}marcajes${NC}       - Ver actividad de marcajes"
        echo -e "  ${GREEN}4xx${NC}            - Ver errores HTTP 4xx"
        echo -e "  ${GREEN}5xx${NC}            - Ver errores HTTP 5xx"
        echo -e "  ${GREEN}stats${NC}          - Ver estadísticas de seguridad"
        echo -e "  ${GREEN}service <nombre>${NC} - Ver logs de un servicio específico"
        echo -e "  ${GREEN}help${NC}           - Mostrar esta ayuda"
        echo ""
        echo "Variables de entorno:"
        echo "  LOKI_URL     - URL de Loki (default: http://localhost:3100)"
        echo "  TIME_RANGE   - Rango de tiempo (default: 24h)"
        echo ""
        echo "Ejemplos:"
        echo "  $0 auth"
        echo "  $0 stats"
        echo "  $0 service api-backend-1"
        echo "  TIME_RANGE=1h $0 errors"
        echo ""
        ;;
    
    *)
        echo -e "${RED}Error: Opción no válida${NC}"
        echo "Usa '$0 help' para ver las opciones disponibles"
        exit 1
        ;;
esac
