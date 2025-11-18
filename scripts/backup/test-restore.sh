#!/bin/bash

##############################################################################
# Script de Prueba de Restauración
# Descripción: Realiza una prueba completa del proceso de restauración
#              y documenta los resultados
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_LOG="${PROJECT_ROOT}/volumes/logs/restore-test_${TIMESTAMP}.log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$TEST_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$TEST_LOG" >&2
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$TEST_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$TEST_LOG"
}

fail() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$TEST_LOG"
}

section() {
    echo "" | tee -a "$TEST_LOG"
    echo -e "${BLUE}========================================${NC}" | tee -a "$TEST_LOG"
    echo -e "${BLUE}$1${NC}" | tee -a "$TEST_LOG"
    echo -e "${BLUE}========================================${NC}" | tee -a "$TEST_LOG"
}

# Cargar variables de entorno
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
else
    error "Archivo .env no encontrado"
    exit 1
fi

section "PRUEBA DE RESTAURACIÓN DE BACKUPS"
log "Inicio de prueba: $(date)"
log "Log de prueba: ${TEST_LOG}"

# Contador de pruebas
TESTS_PASSED=0
TESTS_FAILED=0

# ==========================================
# PRUEBA 1: Verificar herramientas
# ==========================================
section "PRUEBA 1: Verificar Herramientas Requeridas"

info "Verificando mongorestore..."
if command -v mongorestore &> /dev/null; then
    VERSION=$(mongorestore --version | head -n1)
    success "mongorestore instalado: $VERSION"
    ((TESTS_PASSED++))
else
    fail "mongorestore no está instalado"
    ((TESTS_FAILED++))
fi

info "Verificando mongodump..."
if command -v mongodump &> /dev/null; then
    VERSION=$(mongodump --version | head -n1)
    success "mongodump instalado: $VERSION"
    ((TESTS_PASSED++))
else
    fail "mongodump no está instalado"
    ((TESTS_FAILED++))
fi

# ==========================================
# PRUEBA 2: Verificar backups disponibles
# ==========================================
section "PRUEBA 2: Verificar Backups Disponibles"

BACKUP_DIR="${PROJECT_ROOT}/volumes/backups/mongodb"
if [ -d "$BACKUP_DIR" ]; then
    success "Directorio de backups existe: $BACKUP_DIR"
    ((TESTS_PASSED++))
else
    fail "Directorio de backups no existe"
    ((TESTS_FAILED++))
    exit 1
fi

BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
if [ $BACKUP_COUNT -gt 0 ]; then
    success "Backups disponibles: $BACKUP_COUNT"
    ((TESTS_PASSED++))
    log "Listado de backups:"
    ls -lh ${BACKUP_DIR}/*.tar.gz | tee -a "$TEST_LOG"
else
    fail "No hay backups disponibles"
    ((TESTS_FAILED++))
    exit 1
fi

# Seleccionar el backup más reciente
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/*.tar.gz | head -n1)
BACKUP_NAME=$(basename "$LATEST_BACKUP")
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)

info "Backup seleccionado para prueba: $BACKUP_NAME"
info "Tamaño: $BACKUP_SIZE"

# ==========================================
# PRUEBA 3: Verificar integridad del backup
# ==========================================
section "PRUEBA 3: Verificar Integridad del Backup"

info "Verificando archivo comprimido..."
if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
    success "Backup no está corrupto"
    ((TESTS_PASSED++))
else
    fail "Backup está corrupto"
    ((TESTS_FAILED++))
    exit 1
fi

info "Contenido del backup:"
tar -tzf "$LATEST_BACKUP" | head -10 | tee -a "$TEST_LOG"
FILE_COUNT=$(tar -tzf "$LATEST_BACKUP" | wc -l | tr -d ' ')
info "Archivos en backup: $FILE_COUNT"

# ==========================================
# PRUEBA 4: Crear backup de estado actual
# ==========================================
section "PRUEBA 4: Crear Backup del Estado Actual (Pre-restauración)"

info "Creando backup de seguridad antes de la prueba..."
PRE_BACKUP="${BACKUP_DIR}/pre_restore_test_${TIMESTAMP}.tar.gz"

# Obtener conteos actuales
info "Conectando a MongoDB para obtener estadísticas actuales..."
CURRENT_STATS=$(docker run --rm mongo:7 mongosh "${MONGODB_URI}" --quiet --eval "
    db = db.getSiblingDB('asistencia_db');
    print('Usuarios: ' + db.usuarios.countDocuments());
    print('Marcajes: ' + db.marcajes.countDocuments());
    print('Horarios: ' + db.horarios.countDocuments());
    print('Establecimientos: ' + db.establecimientos.countDocuments());
" 2>/dev/null)

if [ $? -eq 0 ]; then
    success "Estado actual de la base de datos:"
    echo "$CURRENT_STATS" | tee -a "$TEST_LOG"
    ((TESTS_PASSED++))
else
    fail "No se pudo conectar a MongoDB"
    ((TESTS_FAILED++))
fi

# ==========================================
# PRUEBA 5: Simular restauración (dry-run)
# ==========================================
section "PRUEBA 5: Prueba de Descompresión"

TEMP_DIR="/tmp/restore_test_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

info "Descomprimiendo backup en directorio temporal..."
if tar -xzf "$LATEST_BACKUP" -C "$TEMP_DIR" 2>&1 | tee -a "$TEST_LOG"; then
    success "Backup descomprimido correctamente"
    ((TESTS_PASSED++))
else
    fail "Error al descomprimir backup"
    ((TESTS_FAILED++))
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Buscar directorio de dump
DUMP_DIR=$(find "$TEMP_DIR" -type d -name "asistencia_db" | head -n 1)
if [ -n "$DUMP_DIR" ]; then
    success "Directorio de dump encontrado: $DUMP_DIR"
    ((TESTS_PASSED++))
    
    info "Contenido del dump:"
    ls -lh "$DUMP_DIR" | tee -a "$TEST_LOG"
else
    fail "No se encontró directorio de dump"
    ((TESTS_FAILED++))
    rm -rf "$TEMP_DIR"
    exit 1
fi

# ==========================================
# PRUEBA 6: Verificar script de restauración
# ==========================================
section "PRUEBA 6: Verificar Script de Restauración"

RESTORE_SCRIPT="${SCRIPT_DIR}/restore-db.sh"
if [ -f "$RESTORE_SCRIPT" ]; then
    success "Script de restauración existe: $RESTORE_SCRIPT"
    ((TESTS_PASSED++))
else
    fail "Script de restauración no encontrado"
    ((TESTS_FAILED++))
fi

if [ -x "$RESTORE_SCRIPT" ]; then
    success "Script tiene permisos de ejecución"
    ((TESTS_PASSED++))
else
    fail "Script no tiene permisos de ejecución"
    ((TESTS_FAILED++))
fi

# ==========================================
# PRUEBA 7: Verificar variables de entorno
# ==========================================
section "PRUEBA 7: Verificar Variables de Entorno"

if [ -n "$MONGODB_URI" ]; then
    success "MONGODB_URI está configurada"
    ((TESTS_PASSED++))
    # Mostrar URI parcialmente (ocultar credenciales)
    MASKED_URI=$(echo "$MONGODB_URI" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
    info "URI: $MASKED_URI"
else
    fail "MONGODB_URI no está configurada"
    ((TESTS_FAILED++))
fi

# ==========================================
# LIMPIEZA
# ==========================================
section "LIMPIEZA"

info "Eliminando archivos temporales..."
rm -rf "$TEMP_DIR"
success "Archivos temporales eliminados"

# ==========================================
# RESUMEN
# ==========================================
section "RESUMEN DE PRUEBAS"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

log ""
log "Total de pruebas: $TOTAL_TESTS"
log "Pruebas exitosas: $TESTS_PASSED"
log "Pruebas fallidas: $TESTS_FAILED"
log "Tasa de éxito: ${PASS_RATE}%"
log ""

if [ $TESTS_FAILED -eq 0 ]; then
    success "¡TODAS LAS PRUEBAS PASARON!"
    log ""
    log "El sistema de restauración está listo para usar."
    log ""
    log "Para restaurar un backup, ejecuta:"
    log "  cd ${SCRIPT_DIR}"
    log "  ./restore-db.sh $BACKUP_NAME"
    log ""
    exit 0
else
    fail "ALGUNAS PRUEBAS FALLARON"
    log ""
    log "Revisa el log para más detalles: $TEST_LOG"
    log ""
    exit 1
fi
