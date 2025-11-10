# Sistema de Backup para MongoDB Atlas (Cloud)

Este sistema proporciona backups automatizados y manuales para MongoDB Atlas y archivos de la aplicación.

## 📋 Características

- ✅ Backup automático de MongoDB Atlas (Cloud)
- ✅ Backup de archivos y configuraciones
- ✅ Compresión automática (.tar.gz)
- ✅ Política de retención configurable
- ✅ Verificación de integridad
- ✅ Logs detallados
- ✅ Restauración fácil
- ✅ Almacenamiento en volúmenes Docker
- ✅ Soporte para almacenamiento externo

## 🚀 Instalación

### 1. Configurar variables de entorno

```bash
cd infrastructure/backup
cp .env.example .env
nano .env
```

Configura tu URI de MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/nombre_db
MONGODB_DB_NAME=asistencia_db
RETENTION_DAYS=7
```

### 2. Crear directorios de backup

```bash
mkdir -p backups/mongodb backups/files backups/logs
```

### 3. Iniciar el servicio de backup

```bash
docker-compose -f docker-compose.backup.yml up -d
```

## 📝 Uso

### Backup Manual

#### Backup completo (MongoDB + Archivos)
```bash
docker exec backup-service /scripts/backup-all.sh
```

#### Solo MongoDB
```bash
docker exec backup-service /scripts/backup-mongodb.sh
```

#### Solo archivos
```bash
docker exec backup-service /scripts/backup-files.sh
```

### Restauración

#### Listar backups disponibles
```bash
docker exec backup-service ls -lh /backups/mongodb/
```

#### Restaurar un backup específico
```bash
docker exec backup-service /scripts/restore-mongodb.sh /backups/mongodb/mongodb_backup_20240101_120000.tar.gz
```

### Backup Automático

Los backups se ejecutan automáticamente:
- **Frecuencia**: Diario a las 2:00 AM
- **Retención**: Configurable (default: 7 días)

Para modificar la programación, edita el archivo `Dockerfile` y cambia la línea del cron.

## 📂 Estructura de Backups

```
backups/
├── mongodb/
│   ├── mongodb_backup_20240101_120000.tar.gz
│   ├── mongodb_backup_20240102_120000.tar.gz
│   └── mongodb_backup_20240102_120000.log
├── files/
│   ├── files_backup_20240101_120000.tar.gz
│   └── files_backup_20240102_120000.tar.gz
└── logs/
    ├── backup_20240101_120000.log
    └── cron.log
```

## 🔧 Configuración Avanzada

### Modificar retención de backups

En `.env`:
```env
RETENTION_DAYS=14  # Mantener backups por 14 días
```

### Agregar almacenamiento externo

1. Monta un disco externo en tu sistema
2. Edita `docker-compose.backup.yml`:

```yaml
volumes:
  - /mnt/mi-disco-externo:/mnt/external_backup
```

3. Edita `backup-mongodb.sh` y descomenta las líneas:

```bash
EXTERNAL_STORAGE="/mnt/external_backup"
if [ -d "$EXTERNAL_STORAGE" ]; then
    log "Copiando a almacenamiento externo..."
    cp "${COMPRESSED_FILE}" "${EXTERNAL_STORAGE}/"
    log "✓ Backup copiado a ${EXTERNAL_STORAGE}"
fi
```

### Backup a AWS S3 (opcional)

Instala AWS CLI en el contenedor y agrega al script:

```bash
# Copiar a S3
aws s3 cp "${COMPRESSED_FILE}" "s3://${AWS_S3_BUCKET}/backups/mongodb/"
```

## 🔍 Monitoreo

### Ver logs del servicio
```bash
docker logs backup-service -f
```

### Ver logs de backups
```bash
docker exec backup-service tail -f /backups/logs/cron.log
```

### Verificar último backup
```bash
docker exec backup-service ls -lt /backups/mongodb/ | head -n 5
```

## 🛠️ Comandos Útiles

### Verificar integridad de un backup
```bash
docker exec backup-service tar -tzf /backups/mongodb/mongodb_backup_20240101_120000.tar.gz
```

### Copiar backup al host
```bash
docker cp backup-service:/backups/mongodb/mongodb_backup_20240101_120000.tar.gz ./
```

### Limpiar backups antiguos manualmente
```bash
docker exec backup-service find /backups/mongodb -name "*.tar.gz" -mtime +30 -delete
```

## ⚠️ Notas Importantes

### Para MongoDB Atlas:

1. **Asegúrate de tener las herramientas de MongoDB instaladas** en el contenedor (ya incluidas en la imagen base)

2. **Permisos de red**: MongoDB Atlas requiere que agregues la IP del servidor a la whitelist:
   - Ve a MongoDB Atlas → Network Access
   - Agrega la IP de tu servidor o usa `0.0.0.0/0` (no recomendado para producción)

3. **URI de conexión**: Asegúrate de usar la URI completa con credenciales:
   ```
   mongodb+srv://usuario:password@cluster.mongodb.net/nombre_db?retryWrites=true&w=majority
   ```

4. **Tamaño de backups**: Los backups de MongoDB Atlas pueden ser grandes dependiendo de tu base de datos. Asegúrate de tener suficiente espacio en disco.

5. **Backups nativos de Atlas**: MongoDB Atlas también ofrece backups automáticos nativos. Este sistema es complementario y te da control total sobre tus backups locales.

## 🔐 Seguridad

- **Nunca** incluyas credenciales en los scripts
- Usa archivos `.env` para credenciales
- Agrega `.env` a `.gitignore`
- Restringe permisos de los archivos de backup:
  ```bash
  chmod 600 .env
  chmod 700 backups/
  ```

## 🆘 Troubleshooting

### Error: "mongodump: command not found"
El contenedor debe estar basado en la imagen de MongoDB que incluye las herramientas.

### Error: "Authentication failed"
Verifica que las credenciales en `MONGODB_URI` sean correctas.

### Error: "Network timeout"
Verifica la whitelist de IPs en MongoDB Atlas.

### Backup muy lento
MongoDB Atlas puede tener latencia dependiendo de tu región. Considera:
- Usar réplicas en tu región
- Aumentar el timeout de conexión
- Comprimir durante el dump (--gzip)

## 📊 Integración con Monitoring

Para recibir notificaciones de backups, puedes integrar con tu `notification-service`:

```bash
# Al final de backup-all.sh
curl -X POST http://notification-service:3003/api/notifications \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Backup completado exitosamente\", \"type\": \"info\"}"
```

## 📚 Referencias

- [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/)
- [MongoDB Atlas Backup](https://www.mongodb.com/docs/atlas/backup-restore-cluster/)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)
