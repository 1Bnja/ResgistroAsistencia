#!/bin/bash

##############################################################################
# Script de Backup para MongoDB Atlas
# Descripción: Realiza backup de la base de datos MongoDB en la nube
##############################################################################

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
BACKUP_DIR="${PROJECT_ROOT}/volumes/backups"
TEMP_DIR="/tmp/${BACKUP_NAME}"
COMPRESSED_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Configuración de retención (días)
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Cargar variables de entorno
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
else
    error "Archivo .env no encontrado en ${PROJECT_ROOT}"
    exit 1
fi

# Verificar que las variables de entorno estén configuradas
if [ -z "$MONGODB_URI" ]; then
    error "MONGODB_URI no está configurada en .env"
    exit 1
fi

MONGO_URI=${MONGODB_URI}
DB_NAME="asistencia_db"

log "=== Iniciando Backup de MongoDB ==="
log "Base de datos: ${DB_NAME}"
log "Timestamp: ${TIMESTAMP}"

# Crear directorios si no existen
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

# Verificar que mongodump esté instalado
if ! command -v mongodump &> /dev/null; then
    error "mongodump no está instalado. Instala MongoDB Database Tools:"
    error "https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# 1. Realizar el dump de MongoDB
log "Ejecutando mongodump..."
if mongodump --uri="${MONGO_URI}" \
             --db="${DB_NAME}" \
             --out="${TEMP_DIR}" \
             --gzip \
             2>&1 | tee "${BACKUP_DIR}/${BACKUP_NAME}.log"; then
    log "✓ Dump completado exitosamente"
else
    error "✗ Fallo al realizar el dump"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# 2. Comprimir el backup
log "Comprimiendo backup..."
if tar -czf "${COMPRESSED_FILE}" -C "/tmp" "${BACKUP_NAME}"; then
    BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    log "✓ Backup comprimido: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
else
    error "✗ Fallo al comprimir el backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# 3. Limpiar directorio temporal
log "Limpiando archivos temporales..."
rm -rf "${TEMP_DIR}"

# 4. Eliminar backups antiguos (retención)
log "Aplicando política de retención (${RETENTION_DAYS} días)..."
OLD_BACKUPS=$(find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS})
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read file; do
        rm "$file"
        log "Eliminado: $(basename $file)"
    done
else
    log "✓ No hay backups antiguos para eliminar"
fi

# 5. Verificar la integridad del backup
log "Verificando integridad del archivo comprimido..."
if tar -tzf "${COMPRESSED_FILE}" > /dev/null 2>&1; then
    log "✓ Verificación de integridad OK"
else
    error "✗ El archivo comprimido está corrupto"
    exit 1
fi

# 6. Resumen
TOTAL_BACKUPS=$(ls -1 ${BACKUP_DIR}/mongodb_backup_*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
log "=== Backup Completado ==="
log "Archivo: ${COMPRESSED_FILE}"
log "Tamaño: ${BACKUP_SIZE}"
log "Backups totales: ${TOTAL_BACKUPS}"

exit 0
