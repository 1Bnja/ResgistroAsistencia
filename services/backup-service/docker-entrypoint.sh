#!/bin/bash

##############################################################################
# Script de entrada para el contenedor de backup
# Inicia cron y mantiene el contenedor activo
##############################################################################

set -e

echo "=== Iniciando servicio de backup ==="
echo "Fecha: $(date)"
echo "Cron jobs configurados:"
crontab -l

# Crear directorios si no existen
mkdir -p /backups/mongodb
mkdir -p /backups/files
mkdir -p /var/log/backup

echo "Directorio de backups: /backups"
echo "Logs: /var/log/backup/cron.log"
echo ""
echo "Programación de backups:"
echo "  - Diario a las 2:00 AM (hora del contenedor)"
echo "  - Retención: 7 días"
echo ""

# Ejecutar backup inicial (opcional, comentar si no se desea)
echo "Ejecutando backup inicial..."
/scripts/backup-daily.sh

# Iniciar cron en foreground
echo "Iniciando cron daemon..."
exec "$@"
