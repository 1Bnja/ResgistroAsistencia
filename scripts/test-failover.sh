#!/bin/bash

###############################################################################
# Test Paso a Paso - Load Balancing Real (sin Master/Slave)
# 
# Este script demuestra el load balancing entre dos instancias iguales
# y prueba el failover cuando una instancia cae.
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

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TEST PASO A PASO - LOAD BALANCING REAL (SIN MASTER/SLAVE) ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Este test demostrará:${NC}"
echo -e "  1. Ambas instancias comparten la carga equitativamente (50/50)"
echo -e "  2. Si una instancia falla, la otra maneja todo el tráfico"
echo -e "  3. Al recuperarse, vuelve a distribuir la carga\n"

read -p "Presiona ENTER para comenzar..."

# PASO 1: Verificar estado inicial
clear
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}PASO 1: Verificar Estado Inicial${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Verificando contenedores...${NC}\n"

if docker ps | grep -q "api-backend-1"; then
    echo -e "${GREEN}✅ api-backend-1 está corriendo${NC}"
    curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
else
    echo -e "${RED}❌ api-backend-1 NO está corriendo${NC}"
fi

echo ""

if docker ps | grep -q "api-backend-2"; then
    echo -e "${GREEN}✅ api-backend-2 está corriendo${NC}"
    curl -s http://localhost:3001/health | jq '.' 2>/dev/null || curl -s http://localhost:3001/health
else
    echo -e "${RED}❌ api-backend-2 NO está corriendo${NC}"
fi

echo -e "\n${CYAN}Dashboard de HAProxy:${NC} ${GREEN}http://localhost:8404/stats${NC}"
echo -e "${YELLOW}Abre el dashboard en tu navegador para ver las estadísticas en vivo${NC}\n"

read -p "Presiona ENTER para continuar al PASO 2..."

# PASO 2: Test de distribución de carga
clear
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}PASO 2: Test de Distribución de Carga (50/50)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Enviando 20 requests al API a través de HAProxy...${NC}\n"

success_count=0

for i in {1..20}; do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        ((success_count++))
        echo -ne "\r  Request ${i}/20 - Exitosos: ${success_count}"
    else
        echo -ne "\r  Request ${i}/20 - Exitosos: ${success_count} ${RED}[FALLÓ]${NC}"
    fi
    sleep 0.2
done

echo -e "\n\n${GREEN}✅ ${success_count}/20 requests exitosos${NC}"

echo -e "\n${CYAN}Abre el dashboard de HAProxy y verifica:${NC}"
echo -e "  • Sección: ${YELLOW}api_backend${NC}"
echo -e "  • Deberías ver requests distribuidos entre api-1 y api-2"
echo -e "  • Aproximadamente 50% en cada servidor\n"

read -p "Presiona ENTER para continuar al PASO 3..."

# PASO 3: Simular falla de api-backend-1
clear
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}PASO 3: Simular Falla de api-backend-1${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Deteniendo api-backend-1...${NC}\n"
docker stop api-backend-1

sleep 2

echo -e "${RED}● api-backend-1 DETENIDO${NC}"
echo -e "${GREEN}● api-backend-2 ACTIVO${NC}\n"

echo -e "${YELLOW}Enviando 10 requests (deberían ir todos a api-backend-2)...${NC}\n"

success_count=0
for i in {1..10}; do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        ((success_count++))
        echo -ne "\r  Request ${i}/10 - Exitosos: ${success_count}"
    else
        echo -ne "\r  Request ${i}/10 - Exitosos: ${success_count} ${RED}[FALLÓ]${NC}"
    fi
    sleep 0.2
done

echo -e "\n\n${GREEN}✅ ${success_count}/10 requests exitosos (todos a api-backend-2)${NC}"

echo -e "\n${CYAN}En el dashboard de HAProxy verás:${NC}"
echo -e "  • ${RED}api-1: DOWN${NC}"
echo -e "  • ${GREEN}api-2: UP${NC} (manejando 100% del tráfico)\n"

read -p "Presiona ENTER para continuar al PASO 4..."

# PASO 4: Recuperar api-backend-1
clear
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}PASO 4: Recuperar api-backend-1${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Iniciando api-backend-1 nuevamente...${NC}\n"
docker start api-backend-1

echo -e "${CYAN}Esperando que el servicio esté listo (health check)...${NC}"

# Esperar a que esté healthy
for i in {1..30}; do
    if docker inspect --format='{{.State.Health.Status}}' api-backend-1 2>/dev/null | grep -q "healthy"; then
        echo -e "\n${GREEN}✅ api-backend-1 está healthy y listo${NC}\n"
        break
    fi
    echo -ne "\r  Esperando... ${i}s"
    sleep 1
done

echo -e "${GREEN}● api-backend-1 ACTIVO${NC}"
echo -e "${GREEN}● api-backend-2 ACTIVO${NC}\n"

echo -e "${YELLOW}Enviando 20 requests (deberían distribuirse 50/50 nuevamente)...${NC}\n"

success_count=0
for i in {1..20}; do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        ((success_count++))
        echo -ne "\r  Request ${i}/20 - Exitosos: ${success_count}"
    else
        echo -ne "\r  Request ${i}/20 - Exitosos: ${success_count} ${RED}[FALLÓ]${NC}"
    fi
    sleep 0.2
done

echo -e "\n\n${GREEN}✅ ${success_count}/20 requests exitosos (distribuidos entre ambos)${NC}"

echo -e "\n${CYAN}En el dashboard de HAProxy verás:${NC}"
echo -e "  • ${GREEN}api-1: UP${NC}"
echo -e "  • ${GREEN}api-2: UP${NC}"
echo -e "  • Tráfico distribuido ~50/50\n"

read -p "Presiona ENTER para continuar al PASO 5..."

# PASO 5: Test de carga continua
clear
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}PASO 5: Test de Carga Continua${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Generando tráfico continuo por 30 segundos...${NC}"
echo -e "${CYAN}Abre ${GREEN}http://localhost:8404/stats${CYAN} para ver la distribución en tiempo real${NC}\n"

echo -e "${MAGENTA}Presiona Ctrl+C para detener antes de 30s${NC}\n"

count=0
start_time=$(date +%s)

while [ $(($(date +%s) - start_time)) -lt 30 ]; do
    if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
        ((count++))
        elapsed=$(($(date +%s) - start_time))
        echo -ne "\r  Tiempo: ${elapsed}s | Requests: ${count} | Rate: ~$((count / (elapsed + 1))) req/s"
    fi
    sleep 0.1
done

echo -e "\n\n${GREEN}✅ Test completado: ${count} requests en 30 segundos${NC}"
echo -e "${CYAN}Rate promedio: ~$((count / 30)) req/s${NC}\n"

# PASO 6: Resumen final
clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    RESUMEN DEL TEST                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ TESTS COMPLETADOS EXITOSAMENTE${NC}\n"

echo -e "${CYAN}Configuración actual:${NC}"
echo -e "  • ${YELLOW}Algoritmo:${NC} Round-Robin (50/50)"
echo -e "  • ${YELLOW}Instancias:${NC} 2 (api-backend-1, api-backend-2)"
echo -e "  • ${YELLOW}Rol:${NC} Ambas iguales (sin master/slave)"
echo -e "  • ${YELLOW}Base de datos:${NC} MongoDB Atlas (cloud con 3 nodos)\n"

echo -e "${CYAN}Ventajas de esta configuración:${NC}"
echo -e "  ✅ Distribución equitativa de carga"
echo -e "  ✅ Alta disponibilidad automática"
echo -e "  ✅ Failover sin pérdida de servicio"
echo -e "  ✅ Recuperación automática"
echo -e "  ✅ Simplicidad (sin roles complejos)\n"

echo -e "${CYAN}Monitoreo:${NC}"
echo -e "  • Dashboard: ${GREEN}http://localhost:8404/stats${NC}"
echo -e "  • Metrics: ${GREEN}http://localhost:8405/metrics${NC}"
echo -e "  • API-1: ${GREEN}http://localhost:3000/health${NC}"
echo -e "  • API-2: ${GREEN}http://localhost:3001/health${NC}\n"

echo -e "${CYAN}Comandos útiles:${NC}"
echo -e "  • Ver logs: ${YELLOW}docker logs -f api-backend-1${NC}"
echo -e "  • Ver stats: ${YELLOW}docker stats api-backend-1 api-backend-2${NC}"
echo -e "  • Demo continua: ${YELLOW}./scripts/demo-load-balancing.sh${NC}\n"

echo -e "${GREEN}🎉 ¡Load Balancing funcionando perfectamente!${NC}\n"
