#!/bin/bash

# Script de Rotación de Secretos
# Genera nuevos secretos para JWT y otras credenciales críticas

ENV_FILE=".env"
BACKUP_DIR="scripts/security/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== Iniciando Rotación de Secretos ===${NC}"

# 1. Crear backup del .env actual
if [ -f "$ENV_FILE" ]; then
    mkdir -p "$BACKUP_DIR"
    cp "$ENV_FILE" "$BACKUP_DIR/.env.backup_$DATE"
    echo -e "${GREEN}✓ Backup creado en $BACKUP_DIR/.env.backup_$DATE${NC}"
else
    echo -e "${RED}✗ No se encontró el archivo $ENV_FILE${NC}"
    exit 1
fi

# 2. Generar nuevos secretos
# Generar JWT Secret (32 bytes hex)
NEW_JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✓ Nuevo JWT_SECRET generado${NC}"

# 3. Actualizar .env
# Usamos sed para reemplazar la línea que empieza con JWT_SECRET=
if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" "$ENV_FILE"
    echo -e "${GREEN}✓ JWT_SECRET actualizado en $ENV_FILE${NC}"
else
    echo "JWT_SECRET=$NEW_JWT_SECRET" >> "$ENV_FILE"
    echo -e "${GREEN}✓ JWT_SECRET agregado a $ENV_FILE${NC}"
fi

# 4. Notificar reinicio necesario
echo -e "\n${YELLOW}IMPORTANTE:${NC}"
echo "1. Los secretos han sido rotados localmente."
echo "2. Debes reiniciar los servicios para que tomen los cambios:"
echo "   docker-compose restart api-backend api-gateway"
echo "3. Si usas MongoDB Atlas u otros servicios externos, recuerda actualizar las credenciales allí si las rotaste."
echo -e "${GREEN}=== Rotación Completada ===${NC}"
