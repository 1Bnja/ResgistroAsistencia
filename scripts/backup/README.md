# Scripts de Backup - Sistema de Asistencia

Sistema automatizado de respaldo para MongoDB Atlas y archivos de la aplicación.

## 📋 Scripts Disponibles

### 1. `backup-db.sh`
Realiza backup completo de la base de datos MongoDB Atlas.

### 2. `backup-files.sh`
Realiza backup de archivos y configuraciones de la aplicación.

### 3. `restore-db.sh` ⭐
Restaura un backup de la base de datos MongoDB.

### 4. `test-restore.sh` 🧪
Ejecuta pruebas completas del sistema de restauración.

## 🚀 Instalación

### 1. Instalar MongoDB Database Tools

**REQUERIDO** para que funcionen los scripts de backup y restauración.

**macOS:**
```bash
brew install mongodb/brew/mongodb-database-tools
```

**Linux (Ubuntu/Debian):**
```bash
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.9.4.tgz
tar -zxvf mongodb-database-tools-*.tgz
sudo cp mongodb-database-tools-*/bin/* /usr/local/bin/
```

**Verificar instalación:**
```bash
mongodump --version
mongorestore --version
```

### 2. Configurar Variables de Entorno

Asegúrate de que tu archivo `.env` en la raíz del proyecto contenga:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/asistencia_db
```

### 3. Dar Permisos de Ejecución

```bash
chmod +x scripts/backup/*.sh
```

## 🔄 Recuperación (Restauración)

### Opción 1: Script Automático (Recomendado)

```bash
cd scripts/backup

# Listar backups disponibles
ls -lh ../../volumes/backups/mongodb/

# Restaurar backup específico
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

### Opción 2: Desde Contenedor de Backup

```bash
# Listar backups
docker exec backup-service ls -lh /backups/mongodb/

# Restaurar
docker exec -it backup-service /scripts/restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

### Proceso Paso a Paso

1. **Navegar al directorio:**
   ```bash
   cd scripts/backup
   ```

2. **Ver backups disponibles:**
   ```bash
   ls -lh ../../volumes/backups/mongodb/
   ```

3. **Ejecutar restauración:**
   ```bash
   ./restore-db.sh <nombre_del_backup.tar.gz>
   ```

4. **Confirmar operación:**
   - El script pedirá confirmación
   - Escribe `SI` (en mayúsculas) para continuar

5. **Esperar completación:**
   - El script mostrará el progreso
   - Al finalizar mostrará resumen

6. **Verificar datos:**
   ```bash
   # Ver logs de la aplicación
   docker logs api-backend-dev --tail 20
   
   # Verificar en la interfaz web
   open http://localhost
   ```

### ⚠️ IMPORTANTE

- La restauración **SOBRESCRIBE** todos los datos existentes
- Se recomienda crear un backup antes de restaurar
- Requiere confirmación manual (`SI` en mayúsculas)
- El proceso toma 10-30 segundos dependiendo del tamaño

## 🧪 Pruebas de Restauración

Ejecuta el script de prueba para verificar que todo está configurado correctamente:

```bash
cd scripts/backup
./test-restore.sh
```

El script verificará:
- ✅ MongoDB Database Tools instalados
- ✅ Backups disponibles
- ✅ Integridad de los backups
- ✅ Conexión a MongoDB
- ✅ Variables de entorno
- ✅ Permisos de scripts

**Resultado esperado:**
```
========================================
RESUMEN DE PRUEBAS
========================================

Total de pruebas: 11
Pruebas exitosas: 11
Pruebas fallidas: 0
Tasa de éxito: 100%

✅ ¡TODAS LAS PRUEBAS PASARON!

El sistema de restauración está listo para usar.
```

## 📊 Ejemplo de Uso Completo

```bash
# 1. Ejecutar pruebas
cd scripts/backup
./test-restore.sh

# 2. Crear backup actual (opcional pero recomendado)
./backup-db.sh

# 3. Listar backups disponibles
ls -lh ../../volumes/backups/mongodb/

# 4. Restaurar backup específico
./restore-db.sh mongodb_backup_20251111_153951.tar.gz

# 5. Confirmar con 'SI'
# 6. Esperar completación
# 7. Verificar en la aplicación
```

## 📝 Características del Sistema

### Backup Automático (Contenedor)
- ✅ Ejecutado diariamente a las 2:00 AM
- ✅ Retención de 7 días
- ✅ Compresión automática
- ✅ Logs detallados

### Backup Manual (Scripts)
- ✅ Backup on-demand
- ✅ Backup de base de datos
- ✅ Backup de archivos
- ✅ Retención configurable

### Restauración
- ✅ Script con confirmación de seguridad
- ✅ Verificación de integridad
- ✅ Soporte para backups locales
- ✅ Logs de operación

## 🆘 Solución de Problemas

### "mongorestore: command not found"
**Solución:** Instalar MongoDB Database Tools (ver sección Instalación)

### "MONGODB_URI no está configurada"
**Solución:**
```bash
# Verificar archivo .env
cat ../../.env | grep MONGODB_URI

# Si no existe, agregar
echo "MONGODB_URI=mongodb+srv://..." >> ../../.env
```

### "El archivo de backup no existe"
**Solución:**
```bash
# Usar solo el nombre del archivo, no la ruta completa
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

### "Error al descomprimir el backup"
**Solución:**
```bash
# Verificar integridad
tar -tzf ../../volumes/backups/mongodb/mongodb_backup_20251111_153951.tar.gz

# Si falla, usar backup anterior
ls -lt ../../volumes/backups/mongodb/ | head
```

## 📚 Documentación Adicional

- **Guía Completa de Recuperación:** [docs/RECUPERACION.md](../../docs/RECUPERACION.md)
- **Documentación de Backup Service:** [services/backup-service/README.md](../../services/backup-service/README.md)

## 🔐 Seguridad

- ⚠️ Los backups contienen datos sensibles
- ⚠️ No compartir archivos de backup
- ⚠️ Verificar permisos: `chmod 600 ../../volumes/backups/mongodb/*.tar.gz`
- ⚠️ Almacenar en ubicación segura

## 📞 Soporte

Para más ayuda:
1. Revisar logs: `cat ../../volumes/logs/restore-test_*.log`
2. Ejecutar pruebas: `./test-restore.sh`
3. Consultar documentación completa: `docs/RECUPERACION.md`

## 📂 Estructura de Backups

Los backups se almacenan en `volumes/backups/`:

```
volumes/backups/
├── mongodb_backup_20241111_120000.tar.gz
├── mongodb_backup_20241111_120000.log
├── mongodb_backup_20241112_020000.tar.gz
├── mongodb_backup_20241112_020000.log
├── files_backup_20241111_120000.tar.gz
└── files_backup_20241112_020000.tar.gz
```

## 🔄 Automatización con Cron

Para ejecutar backups automáticos diariamente:

### Editar crontab:
```bash
crontab -e
```

### Agregar líneas (backup diario a las 2:00 AM):
```cron
# Backup de base de datos diario a las 2:00 AM
0 2 * * * cd /ruta/a/tu/proyecto/scripts/backup && ./backup-db.sh >> /ruta/a/tu/proyecto/volumes/logs/backup.log 2>&1

# Backup de archivos semanal (domingos a las 3:00 AM)
0 3 * * 0 cd /ruta/a/tu/proyecto/scripts/backup && ./backup-files.sh >> /ruta/a/tu/proyecto/volumes/logs/backup.log 2>&1
```

**Nota:** Reemplaza `/ruta/a/tu/proyecto` con la ruta absoluta de tu proyecto.

## ⚙️ Configuración Avanzada

### Cambiar Política de Retención

Edita la variable `RETENTION_DAYS` en los scripts:

**backup-db.sh:**
```bash
RETENTION_DAYS=7  # Cambiar a los días deseados
```

**backup-files.sh:**
```bash
RETENTION_DAYS=14  # Cambiar a los días deseados
```

### Agregar Más Directorios/Archivos al Backup

Edita el array en `backup-files.sh`:

```bash
DIRS_TO_BACKUP=(
    "volumes/logs"
    "services/notification-service/logs"
    "config"
    "docs"
    "tu/directorio/personalizado"  # Agregar aquí
)

FILES_TO_BACKUP=(
    "docker-compose.yml"
    ".env.example"
    "tu-archivo.conf"  # Agregar aquí
)
```

## 🔍 Verificar Backups

### Listar backups disponibles:
```bash
ls -lh ../../volumes/backups/
```

### Ver contenido de un backup:
```bash
tar -tzf ../../volumes/backups/mongodb_backup_20241111_120000.tar.gz
```

### Ver logs de un backup:
```bash
cat ../../volumes/backups/mongodb_backup_20241111_120000.log
```

## 🆘 Solución de Problemas

### Error: "mongodump: command not found"
- Instalar MongoDB Database Tools (ver sección Instalación)

### Error: "MONGODB_URI no está configurada"
- Verificar que el archivo `.env` existe en la raíz del proyecto
- Verificar que contiene la variable `MONGODB_URI`

### Error: "Permission denied"
- Dar permisos de ejecución: `chmod +x *.sh`

### Backup corrupto
- El script verifica automáticamente la integridad
- Si falla, revisar espacio en disco: `df -h`
- Revisar permisos de escritura en `volumes/backups/`

## 📊 Mejores Prácticas

1. **Backups Regulares:** Configura cron para backups automáticos diarios
2. **Verifica Restauraciones:** Prueba restaurar un backup mensualmente
3. **Almacenamiento Externo:** Copia backups importantes a almacenamiento externo o cloud
4. **Monitoreo:** Revisa logs periódicamente para detectar fallos
5. **Documentación:** Actualiza este README si modificas los scripts

## 📝 Logs

Los logs se generan automáticamente en:
- `volumes/backups/mongodb_backup_TIMESTAMP.log` (por cada backup de BD)
- `volumes/logs/backup.log` (si usas cron)

## 🔐 Seguridad

- ⚠️ **NO** incluyas el archivo `.env` en backups que compartas
- ⚠️ Los backups contienen datos sensibles, almacénalos de forma segura
- ⚠️ Usa `.env.example` como plantilla, nunca `.env` real

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en `volumes/backups/`
2. Verifica que MongoDB Database Tools esté instalado
3. Confirma que las variables de entorno estén configuradas
4. Revisa los permisos de los scripts y directorios
