#!/bin/bash

##############################################################################
# Script de Restauración para MongoDB
# Uso: docker exec backup-service /scripts/restore-db.sh <archivo.tar.gz>
##############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Verificar argumentos
if [ -z "$1" ]; then
    error "Uso: $0 <archivo_backup.tar.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh /backups/mongodb/mongodb_backup_*.tar.gz 2>/dev/null || echo "  No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"
TEMP_DIR="/tmp/mongodb_restore_$$"

# Si no tiene ruta completa, buscar en /backups/mongodb
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="/backups/mongodb/${BACKUP_FILE}"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    error "El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

# Verificar variables de entorno
if [ -z "$MONGODB_URI" ]; then
    error "MONGODB_URI no está configurada"
    exit 1
fi

MONGO_URI=${MONGODB_URI}
DB_NAME="asistencia_db"

log "=== Iniciando Restauración de MongoDB ==="
log "Archivo de backup: ${BACKUP_FILE}"
log "Base de datos destino: ${DB_NAME}"

echo ""
warning "⚠️  ATENCIÓN: Esta operación sobrescribirá los datos existentes"
echo ""

# Crear directorio temporal
mkdir -p "${TEMP_DIR}"

# Descomprimir backup
log "Descomprimiendo backup..."
if tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"; then
    log "✓ Backup descomprimido"
else
    error "✗ Fallo al descomprimir el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Encontrar el directorio del dump
DUMP_DIR=$(find "${TEMP_DIR}" -type d -name "${DB_NAME}" | head -n 1)
if [ -z "$DUMP_DIR" ]; then
    DUMP_DIR=$(find "${TEMP_DIR}" -name "*.bson.gz" -o -name "*.json.gz" | head -n 1 | xargs dirname)
fi

if [ -z "$DUMP_DIR" ]; then
    error "No se encontró el directorio del dump en el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

log "Directorio del dump: ${DUMP_DIR}"

# Restaurar con mongorestore
log "Ejecutando mongorestore..."
if mongorestore --uri="${MONGO_URI}" \
                --db="${DB_NAME}" \
                --gzip \
                --drop \
                "${DUMP_DIR}"; then
    log "✓ Restauración completada exitosamente"
else
    error "✗ Fallo al restaurar el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Limpiar archivos temporales
log "Limpiando archivos temporales..."
rm -rf "${TEMP_DIR}"

log "=== Restauración Completada ==="
exit 0
