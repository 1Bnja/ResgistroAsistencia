#!/bin/bash

##############################################################################
# Script de Restauración para MongoDB Atlas
# Descripción: Restaura un backup comprimido de MongoDB
# Uso: ./restore-db.sh <archivo_backup.tar.gz>
##############################################################################

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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

# Verificar argumentos
if [ -z "$1" ]; then
    error "Uso: $0 <archivo_backup.tar.gz>"
    echo ""
    echo "Ejemplos:"
    echo "  $0 mongodb_backup_20241111_120000.tar.gz"
    echo "  $0 ../../volumes/backups/mongodb_backup_20241111_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
TEMP_DIR="/tmp/mongodb_restore_$$"

# Si el archivo no tiene ruta completa, buscar en volumes/backups
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="${PROJECT_ROOT}/volumes/backups/${BACKUP_FILE}"
fi

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

# Cargar variables de entorno
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
else
    error "Archivo .env no encontrado en ${PROJECT_ROOT}"
    exit 1
fi

# Verificar variables de entorno
if [ -z "$MONGODB_URI" ]; then
    error "MONGODB_URI no está configurada en .env"
    exit 1
fi

MONGO_URI=${MONGODB_URI}
DB_NAME="asistencia_db"

log "=== Iniciando Restauración de MongoDB ==="
log "Archivo de backup: ${BACKUP_FILE}"
log "Base de datos destino: ${DB_NAME}"

# Advertencia
echo ""
warning "⚠️  ATENCIÓN: Esta operación sobrescribirá los datos existentes"
echo ""
read -p "¿Desea continuar? (escriba 'SI' para confirmar): " confirm
if [ "$confirm" != "SI" ]; then
    log "Restauración cancelada por el usuario"
    exit 0
fi

# Verificar que mongorestore esté instalado
if ! command -v mongorestore &> /dev/null; then
    error "mongorestore no está instalado. Instala MongoDB Database Tools:"
    error "https://www.mongodb.com/try/download/database-tools"
    exit 1
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
    # Buscar el directorio que contiene archivos .bson o .json
    DUMP_DIR=$(find "${TEMP_DIR}" -name "*.bson.gz" -o -name "*.json.gz" | head -n 1 | xargs dirname)
fi

if [ -z "$DUMP_DIR" ]; then
    error "No se encontró el directorio del dump en el backup"
    log "Contenido del backup:"
    ls -lR "${TEMP_DIR}"
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
