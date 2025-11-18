# Servicio de Backup Automatizado

Contenedor Docker que ejecuta backups automáticos diarios de MongoDB Atlas.

## Características

- ✅ Backup automático diario a las 2:00 AM
- ✅ Retención de 7 días
- ✅ Backups comprimidos (.tar.gz)
- ✅ Verificación de integridad
- ✅ Logs detallados
- ✅ Restauración fácil

## Estructura

```
services/backup-service/
├── Dockerfile              # Imagen con MongoDB Tools y cron
├── docker-entrypoint.sh    # Script de inicio
├── scripts/
│   ├── backup-daily.sh     # Backup automático (llamado por cron)
│   └── restore-db.sh       # Restauración de backups
└── README.md
```

## Uso

### Ver logs del servicio
```bash
docker logs backup-service
```

### Ver logs de backups
```bash
docker exec backup-service tail -f /var/log/backup/cron.log
```

### Listar backups disponibles
```bash
docker exec backup-service ls -lh /backups/mongodb/
```

### Ejecutar backup manual
```bash
docker exec backup-service /scripts/backup-daily.sh
```

### Restaurar un backup
```bash
# Listar backups disponibles
docker exec backup-service ls -lh /backups/mongodb/

# Restaurar backup específico
docker exec backup-service /scripts/restore-db.sh mongodb_backup_20241111_120000.tar.gz
```

## Programación

- **Frecuencia**: Diario a las 2:00 AM (hora del contenedor UTC)
- **Retención**: 7 días (backups más antiguos se eliminan automáticamente)
- **Logs**: Se mantienen por 30 días

## Volúmenes

- `/backups` - Almacena los backups comprimidos
- `/var/log/backup` - Logs del servicio

## Variables de Entorno

Definidas en el `docker-compose.yml`:
- `MONGODB_URI` - URI de conexión a MongoDB Atlas

## Monitoreo

Revisa regularmente:
1. Logs de cron: `/var/log/backup/cron.log`
2. Espacio en disco: `docker exec backup-service df -h /backups`
3. Backups recientes: `docker exec backup-service ls -lt /backups/mongodb/ | head`
