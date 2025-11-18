#!/bin/bash

##############################################################################
# Script de Backup Diario (para ejecución desde cron)
# Ejecuta backup de MongoDB con retención de 7 días
##############################################################################

# Configuración
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
BACKUP_DIR="/backups/mongodb"
TEMP_DIR="/tmp/${BACKUP_NAME}"
COMPRESSED_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
LOG_FILE="/var/log/backup/backup_${TIMESTAMP}.log"

# Configuración de retención (días)
RETENTION_DAYS=7

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar variables de entorno
if [ -z "$MONGODB_URI" ]; then
    error "MONGODB_URI no está configurada"
    exit 1
fi

MONGO_URI=${MONGODB_URI}
DB_NAME="asistencia_db"

log "========================================="
log "=== INICIANDO BACKUP AUTOMÁTICO ==="
log "========================================="
log "Base de datos: ${DB_NAME}"
log "Timestamp: ${TIMESTAMP}"

# Crear directorios si no existen
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

# 1. Realizar el dump de MongoDB
log "Ejecutando mongodump..."
if mongodump --uri="${MONGO_URI}" \
             --db="${DB_NAME}" \
             --out="${TEMP_DIR}" \
             --gzip \
             2>&1 | tee -a "$LOG_FILE"; then
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

# 4. Eliminar backups antiguos (retención de 7 días)
log "Aplicando política de retención (${RETENTION_DAYS} días)..."
DELETED_COUNT=0
find "${BACKUP_DIR}" -name "mongodb_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} | while read file; do
    rm "$file"
    log "  Eliminado: $(basename $file)"
    ((DELETED_COUNT++))
done

if [ $DELETED_COUNT -eq 0 ]; then
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
log "========================================="
log "=== BACKUP COMPLETADO EXITOSAMENTE ==="
log "========================================="
log "Archivo: ${COMPRESSED_FILE}"
log "Tamaño: ${BACKUP_SIZE}"
log "Backups totales: ${TOTAL_BACKUPS}"
log "Retención: ${RETENTION_DAYS} días"
log "Próximo backup: $(date -d '+1 day' '+%Y-%m-%d') 02:00:00"

# Limpiar logs antiguos (mantener últimos 30 días)
find "/var/log/backup" -name "backup_*.log" -type f -mtime +30 -delete

exit 0
