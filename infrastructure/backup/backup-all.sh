#!/bin/bash

##############################################################################
# Script Maestro de Backup
# Descripción: Ejecuta todos los backups (MongoDB + Archivos)
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/backups/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE" >&2
}

# Crear directorio de logs
mkdir -p "${LOG_DIR}"

log "========================================="
log "=== INICIANDO PROCESO DE BACKUP COMPLETO ==="
log "========================================="

# Contador de errores
ERRORS=0

# 1. Backup de MongoDB
log ""
log ">>> Ejecutando backup de MongoDB..."
if bash "${SCRIPT_DIR}/backup-mongodb.sh" 2>&1 | tee -a "$LOG_FILE"; then
    log "✓ Backup de MongoDB completado"
else
    error "✗ Fallo el backup de MongoDB"
    ((ERRORS++))
fi

# 2. Backup de Archivos
log ""
log ">>> Ejecutando backup de archivos..."
if bash "${SCRIPT_DIR}/backup-files.sh" 2>&1 | tee -a "$LOG_FILE"; then
    log "✓ Backup de archivos completado"
else
    error "✗ Fallo el backup de archivos"
    ((ERRORS++))
fi

# 3. Resumen final
log ""
log "========================================="
log "=== PROCESO DE BACKUP FINALIZADO ==="
log "========================================="
log "Errores encontrados: ${ERRORS}"
log "Log completo: ${LOG_FILE}"

# Limpiar logs antiguos (mantener últimos 30 días)
find "${LOG_DIR}" -name "backup_*.log" -type f -mtime +30 -delete

if [ $ERRORS -eq 0 ]; then
    log "✓ Todos los backups completados exitosamente"
    exit 0
else
    error "✗ Se encontraron errores durante el proceso de backup"
    exit 1
fi
