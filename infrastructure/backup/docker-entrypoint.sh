#!/bin/bash
set -e

echo "=== Servicio de Backup Inicializado ==="
echo "MongoDB URI: ${MONGODB_URI:0:20}..."
echo "Base de datos: ${MONGODB_DB_NAME}"
echo "Retención: ${RETENTION_DAYS:-7} días"
echo ""
echo "Programación de backups:"
echo "- Diario a las 2:00 AM"
echo ""
echo "Para ejecutar un backup manual:"
echo "  docker exec backup-service /scripts/backup-all.sh"
echo ""
echo "Para restaurar:"
echo "  docker exec backup-service /scripts/restore-mongodb.sh /backups/mongodb/<archivo>.tar.gz"
echo ""

# Ejecutar comando
exec "$@"
