#!/bin/bash

##############################################################################
# Script de Backup para Archivos de la Aplicación
# Descripción: Respalda archivos estáticos, configuraciones y logs
##############################################################################

# Configuración
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="files_backup_${TIMESTAMP}"
BACKUP_DIR="/backups/files"
COMPRESSED_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Directorios a respaldar (ajustar según tu estructura)
DIRS_TO_BACKUP=(
    "/app/logs"
    "/app/uploads"
    "/app/config"
    "/app/public/assets"
)

# Archivos específicos a respaldar
FILES_TO_BACKUP=(
    "/app/.env"
    "/app/docker-compose.yml"
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
    rm -f "$TEMP_LIST"
    exit 1
fi

# Crear backup comprimido
log "Creando archivo comprimido..."
if tar -czf "${COMPRESSED_FILE}" -T "$TEMP_LIST" 2>&1 | grep -v "Removing leading"; then
    BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
    log "✓ Backup creado: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
else
    error "✗ Fallo al crear el backup"
    rm -f "$TEMP_LIST"
    exit 1
fi

# Limpiar archivo temporal
rm -f "$TEMP_LIST"

# Aplicar política de retención
log "Aplicando política de retención (${RETENTION_DAYS} días)..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "files_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ $DELETED_COUNT -gt 0 ]; then
    log "✓ Eliminados ${DELETED_COUNT} backups antiguos"
else
    log "✓ No hay backups antiguos para eliminar"
fi

# Verificar integridad
log "Verificando integridad del backup..."
if tar -tzf "${COMPRESSED_FILE}" > /dev/null 2>&1; then
    log "✓ Verificación de integridad OK"
else
    error "✗ El archivo comprimido está corrupto"
    exit 1
fi

# Resumen
log "=== Backup de Archivos Completado ==="
log "Archivo: ${COMPRESSED_FILE}"
log "Tamaño: ${BACKUP_SIZE}"
log "Backups totales: $(ls -1 ${BACKUP_DIR}/files_backup_*.tar.gz 2>/dev/null | wc -l)"

exit 0
