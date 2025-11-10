#!/bin/bash

##############################################################################
# Script de Restauración para MongoDB Atlas (Cloud)
# Descripción: Restaura un backup comprimido de MongoDB
# Uso: ./restore-mongodb.sh <archivo_backup.tar.gz>
##############################################################################

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
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
    echo "Ejemplo: $0 /backups/mongodb/mongodb_backup_20240101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
TEMP_DIR="/tmp/mongodb_restore_$$"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

# Verificar variables de entorno
if [ -z "$MONGODB_URI" ] && [ -z "$MONGODB_WRITE_URI" ]; then
    error "MONGODB_URI o MONGODB_WRITE_URI no están configuradas"
    exit 1
fi

MONGO_URI=${MONGODB_WRITE_URI:-$MONGODB_URI}
DB_NAME=${MONGODB_DB_NAME:-asistencia_db}

log "=== Iniciando Restauración de MongoDB ==="
log "Archivo de backup: ${BACKUP_FILE}"
log "Base de datos destino: ${DB_NAME}"

# Advertencia
warning "⚠️  ATENCIÓN: Esta operación sobrescribirá los datos existentes"
read -p "¿Desea continuar? (escriba 'SI' para confirmar): " confirm
if [ "$confirm" != "SI" ]; then
    log "Restauración cancelada por el usuario"
    exit 0
fi

# Crear directorio temporal
mkdir -p "${TEMP_DIR}"

# 1. Descomprimir backup
log "Descomprimiendo backup..."
if tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"; then
    log "✓ Backup descomprimido"
else
    error "✗ Fallo al descomprimir el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# 2. Encontrar el directorio del dump
DUMP_DIR=$(find "${TEMP_DIR}" -type d -name "${DB_NAME}" | head -n 1)
if [ -z "$DUMP_DIR" ]; then
    # Buscar el directorio padre
    DUMP_DIR=$(find "${TEMP_DIR}" -type d -maxdepth 2 | grep -v "^${TEMP_DIR}$" | head -n 1)
fi

if [ -z "$DUMP_DIR" ]; then
    error "No se encontró el directorio del dump en el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

log "Directorio del dump: ${DUMP_DIR}"

# 3. Restaurar con mongorestore
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

# 4. Limpiar archivos temporales
log "Limpiando archivos temporales..."
rm -rf "${TEMP_DIR}"

log "=== Restauración Completada ==="
exit 0
