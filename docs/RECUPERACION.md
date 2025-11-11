# Guía de Recuperación de Backups

Esta guía proporciona instrucciones paso a paso para restaurar backups de la base de datos MongoDB Atlas.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Verificar Backups Disponibles](#verificar-backups-disponibles)
- [Proceso de Restauración](#proceso-de-restauración)
- [Verificación Post-Restauración](#verificación-post-restauración)
- [Pruebas Documentadas](#pruebas-documentadas)
- [Solución de Problemas](#solución-de-problemas)

## 🔧 Requisitos Previos

### 1. MongoDB Database Tools

El script de restauración requiere `mongorestore` instalado:

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
mongorestore --version
```

### 2. Variables de Entorno

Verificar que el archivo `.env` contenga:
```bash
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/asistencia_db
```

### 3. Acceso a Backups

Los backups se encuentran en:
```
volumes/backups/mongodb/
```

## 📦 Verificar Backups Disponibles

### Desde el Host (macOS/Linux)

Listar backups disponibles:
```bash
ls -lh volumes/backups/mongodb/
```

Ejemplo de salida:
```
-rw-r--r--  1 user  staff   4.5M Nov 11 12:39 mongodb_backup_20251111_153951.tar.gz
-rw-r--r--  1 user  staff   2.3K Nov 11 12:39 mongodb_backup_20251111_153951.log
-rw-r--r--  1 user  staff   4.4M Nov 10 02:00 mongodb_backup_20251110_020000.tar.gz
```

### Desde el Contenedor de Backup

```bash
docker exec backup-service ls -lh /backups/mongodb/
```

### Ver Contenido de un Backup

```bash
tar -tzf volumes/backups/mongodb/mongodb_backup_20251111_153951.tar.gz | head -20
```

## 🔄 Proceso de Restauración

### Opción 1: Usando el Script (Recomendado)

#### Paso 1: Navegar al directorio de scripts
```bash
cd scripts/backup
```

#### Paso 2: Listar backups disponibles
```bash
ls -lh ../../volumes/backups/mongodb/
```

#### Paso 3: Ejecutar restauración
```bash
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

El script te pedirá confirmación:
```
=== Iniciando Restauración de MongoDB ===
Archivo de backup: /Users/.../volumes/backups/mongodb_backup_20251111_153951.tar.gz
Base de datos destino: asistencia_db

⚠️  ATENCIÓN: Esta operación sobrescribirá los datos existentes

¿Desea continuar? (escriba 'SI' para confirmar):
```

#### Paso 4: Confirmar restauración
Escribe `SI` (en mayúsculas) y presiona Enter.

#### Paso 5: Esperar completación
```
[2025-11-11 15:45:00] Descomprimiendo backup...
[2025-11-11 15:45:01] ✓ Backup descomprimido
[2025-11-11 15:45:01] Directorio del dump: /tmp/mongodb_restore_12345/mongodb_backup_20251111_153951/asistencia_db
[2025-11-11 15:45:01] Ejecutando mongorestore...
2025-11-11T15:45:01.000+0000    preparing collections to restore from
2025-11-11T15:45:02.000+0000    reading metadata for asistencia_db.usuarios from /tmp/...
2025-11-11T15:45:02.000+0000    restoring asistencia_db.usuarios from /tmp/...
2025-11-11T15:45:03.000+0000    finished restoring asistencia_db.usuarios (4 documents, 0 failures)
...
[2025-11-11 15:45:10] ✓ Restauración completada exitosamente
[2025-11-11 15:45:10] Limpiando archivos temporales...
[2025-11-11 15:45:10] === Restauración Completada ===
```

### Opción 2: Desde el Contenedor de Backup

```bash
# Listar backups
docker exec backup-service ls -lh /backups/mongodb/

# Restaurar
docker exec -it backup-service /scripts/restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

### Opción 3: Restauración Manual

Si prefieres hacerlo manualmente:

```bash
# 1. Descomprimir backup
cd volumes/backups/mongodb
tar -xzf mongodb_backup_20251111_153951.tar.gz

# 2. Cargar variables de entorno
source ../../.env

# 3. Ejecutar mongorestore
mongorestore --uri="${MONGODB_URI}" \
             --db="asistencia_db" \
             --gzip \
             --drop \
             ./mongodb_backup_20251111_153951/asistencia_db

# 4. Limpiar archivos temporales
rm -rf mongodb_backup_20251111_153951
```

## ✅ Verificación Post-Restauración

### 1. Verificar Conexión a la Base de Datos

```bash
docker logs api-backend-dev --tail 20
```

Buscar:
```
✅ MongoDB conectado (default): ac-bm096cl-shard-00-00.v7a5bj5.mongodb.net
```

### 2. Verificar Colecciones Restauradas

Conectarse a MongoDB:
```bash
docker run --rm -it mongo:7 mongosh "${MONGODB_URI}" --quiet
```

Verificar datos:
```javascript
// Contar usuarios
db.usuarios.countDocuments()

// Contar marcajes
db.marcajes.countDocuments()

// Contar horarios
db.horarios.countDocuments()

// Verificar último marcaje
db.marcajes.findOne({}, {sort: {createdAt: -1}})

// Salir
exit
```

### 3. Verificar Aplicación Web

1. Acceder a `http://localhost`
2. Intentar login con credenciales conocidas
3. Verificar que los datos se muestren correctamente

### 4. Revisar Logs de la Aplicación

```bash
# API Backend
docker logs api-backend-dev --tail 50

# Notification Service
docker logs asistencia-notification-service --tail 50
```

## 📝 Pruebas Documentadas

### Prueba 1: Restauración Básica

**Fecha:** 11 de Noviembre 2025  
**Backup utilizado:** `mongodb_backup_20251111_153951.tar.gz`  
**Tamaño del backup:** 4.5 MB  
**Base de datos:** asistencia_db

**Proceso:**
```bash
cd scripts/backup
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

**Resultado:**
```
✓ Backup descomprimido
✓ Restauración completada exitosamente
✓ 62 documentos restaurados
```

**Verificación:**
- ✅ Usuarios: 4 documentos
- ✅ Marcajes: 52 documentos
- ✅ Horarios: 4 documentos
- ✅ Establecimientos: 2 documentos
- ✅ Login funcional
- ✅ Dashboard muestra datos correctos

**Tiempo total:** ~15 segundos

### Prueba 2: Restauración con Confirmación

**Escenario:** Usuario cancela la operación

**Proceso:**
```bash
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
# Escribir "NO" cuando se solicita confirmación
```

**Resultado:**
```
⚠️  ATENCIÓN: Esta operación sobrescribirá los datos existentes

¿Desea continuar? (escriba 'SI' para confirmar): NO
[2025-11-11 15:50:00] Restauración cancelada por el usuario
```

**Verificación:**
- ✅ Script se detuvo correctamente
- ✅ No se modificaron datos
- ✅ Base de datos intacta

### Prueba 3: Restauración desde Contenedor

**Proceso:**
```bash
docker exec -it backup-service /scripts/restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

**Resultado:**
```
✓ Restauración completada exitosamente
```

**Verificación:**
- ✅ Funciona desde contenedor
- ✅ Acceso correcto a backups
- ✅ Variables de entorno cargadas

## 🔍 Solución de Problemas

### Error: "mongorestore: command not found"

**Causa:** MongoDB Database Tools no está instalado

**Solución:**
```bash
# macOS
brew install mongodb/brew/mongodb-database-tools

# Linux
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.9.4.tgz
tar -zxvf mongodb-database-tools-*.tgz
sudo cp mongodb-database-tools-*/bin/* /usr/local/bin/
```

### Error: "MONGODB_URI no está configurada"

**Causa:** Archivo `.env` no existe o no tiene la variable

**Solución:**
```bash
# Verificar que existe
ls -la .env

# Si no existe, copiar desde ejemplo
cp .env.example .env

# Editar y agregar MONGODB_URI
nano .env
```

### Error: "El archivo de backup no existe"

**Causa:** Ruta incorrecta al archivo de backup

**Solución:**
```bash
# Listar backups disponibles
ls -lh ../../volumes/backups/mongodb/

# Usar solo el nombre del archivo (sin ruta)
./restore-db.sh mongodb_backup_20251111_153951.tar.gz
```

### Error: "Failed to connect to MongoDB"

**Causa:** URI de conexión incorrecta o problemas de red

**Solución:**
```bash
# Verificar URI
echo $MONGODB_URI

# Probar conexión
docker run --rm mongo:7 mongosh "${MONGODB_URI}" --quiet --eval "db.serverStatus().ok"

# Verificar firewall/VPN si es necesario
```

### Error: "Error al descomprimir el backup"

**Causa:** Archivo corrupto

**Solución:**
```bash
# Verificar integridad
tar -tzf volumes/backups/mongodb/mongodb_backup_20251111_153951.tar.gz > /dev/null

# Si falla, usar un backup anterior
ls -lt volumes/backups/mongodb/ | head
```

## 📞 Contacto y Soporte

En caso de problemas durante la restauración:

1. Revisar logs del script
2. Verificar espacio en disco: `df -h`
3. Comprobar permisos: `ls -la volumes/backups/`
4. Consultar logs de la aplicación: `docker logs api-backend-dev`

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- Los backups contienen datos sensibles
- Almacenar en ubicación segura
- No compartir backups públicamente
- Restringir acceso a archivos de backup
- Verificar permisos: `chmod 600 volumes/backups/mongodb/*.tar.gz`

## 📚 Referencias

- [MongoDB Restore Documentation](https://www.mongodb.com/docs/database-tools/mongorestore/)
- [Backup README](../../scripts/backup/README.md)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
