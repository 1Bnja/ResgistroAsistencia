#!/bin/bash

##############################################################################
# Script de Backup para Archivos de la Aplicación
# Descripción: Respalda archivos estáticos, configuraciones y logs
##############################################################################

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="files_backup_${TIMESTAMP}"
BACKUP_DIR="${PROJECT_ROOT}/volumes/backups"
COMPRESSED_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Directorios a respaldar (relativos al PROJECT_ROOT)
DIRS_TO_BACKUP=(
    "volumes/logs"
    "config"
    "docs"
)

# Archivos específicos a respaldar
FILES_TO_BACKUP=(
    "docker-compose.yml"
    ".env.example"
)

# Configuración de retención (días)
RETENTION_DAYS=${RETENTION_DAYS:-14}

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

log "=== Iniciando Backup de Archivos ==="
log "Timestamp: ${TIMESTAMP}"

# Crear directorio de backup si no existe
mkdir -p "${BACKUP_DIR}"

# Crear lista temporal de archivos a respaldar
TEMP_LIST="/tmp/backup_list_${TIMESTAMP}.txt"
> "$TEMP_LIST"

cd "${PROJECT_ROOT}"

# Agregar directorios existentes a la lista
for dir in "${DIRS_TO_BACKUP[@]}"; do
    if [ -d "$dir" ]; then
        echo "$dir" >> "$TEMP_LIST"
        log "✓ Agregado directorio: $dir"
    else
        warning "Directorio no encontrado: $dir"
    fi
done

# Agregar archivos existentes a la lista
for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        echo "$file" >> "$TEMP_LIST"
        log "✓ Agregado archivo: $file"
    else
        warning "Archivo no encontrado: $file"
    fi
done

# Verificar que hay algo que respaldar
if [ ! -s "$TEMP_LIST" ]; then
    error "No hay archivos o directorios para respaldar"
    rm "$TEMP_LIST"
    exit 1
fi

# Crear el backup comprimido
log "Comprimiendo archivos..."
if tar -czf "${COMPRESSED_FILE}" -T "$TEMP_LIST" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    log "✓ Backup comprimido: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
else
    error "✗ Fallo al comprimir el backup"
    rm "$TEMP_LIST"
    exit 1
fi

# Limpiar lista temporal
rm "$TEMP_LIST"

# Eliminar backups antiguos (retención)
log "Aplicando política de retención (${RETENTION_DAYS} días)..."
OLD_BACKUPS=$(find "${BACKUP_DIR}" -name "files_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS})
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read file; do
        rm "$file"
        log "Eliminado: $(basename $file)"
    done
else
    log "✓ No hay backups antiguos para eliminar"
fi

# Verificar integridad
log "Verificando integridad del archivo comprimido..."
if tar -tzf "${COMPRESSED_FILE}" > /dev/null 2>&1; then
    log "✓ Verificación de integridad OK"
else
    error "✗ El archivo comprimido está corrupto"
    exit 1
fi

# Resumen
TOTAL_BACKUPS=$(ls -1 ${BACKUP_DIR}/files_backup_*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
log "=== Backup Completado ==="
log "Archivo: ${COMPRESSED_FILE}"
log "Tamaño: ${BACKUP_SIZE}"
log "Backups totales: ${TOTAL_BACKUPS}"

exit 0
