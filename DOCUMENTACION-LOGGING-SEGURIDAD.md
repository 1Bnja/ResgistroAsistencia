# Documentación del Sistema de Logging Centralizado

## 📋 Índice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Componentes](#componentes)
3. [Eventos de Seguridad Registrados](#eventos-de-seguridad-registrados)
4. [Configuración Implementada](#configuración-implementada)
5. [Uso del Sistema](#uso-del-sistema)
6. [Script de Consulta](#script-de-consulta)
7. [Dashboard de Grafana](#dashboard-de-grafana)
8. [Mantenimiento](#mantenimiento)

---

## 🏗️ Arquitectura del Sistema

El sistema implementa una arquitectura centralizada de logs basada en:

```
[Servicios Docker] → [Promtail] → [Loki] → [Grafana]
                          ↓
                   [Script CLI]
```

### Stack Tecnológico
- **Loki**: Base de datos de logs (como Prometheus pero para logs)
- **Promtail**: Agente recolector de logs de containers
- **Grafana**: Dashboard de visualización
- **Docker Logs**: Sistema base de logging con rotación

---

## 🔧 Componentes

### 1. Loki (Puerto 3100)
**Ubicación**: `/services/loki/`
**Función**: Almacenamiento centralizado de logs

**Características**:
- Retención: 7 días (168 horas)
- Compactación automática cada 10 minutos
- Almacenamiento en volumen Docker: `loki-data`
- Índices BoltDB con archivos locales

**Configuración clave** (`loki-config.yml`):
```yaml
limits_config:
  retention_period: 168h  # 7 días
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32

compactor:
  retention_enabled: true
  retention_delete_delay: 2h
```

### 2. Promtail (Puerto 9080)
**Ubicación**: `/services/promtail/`
**Función**: Recolección de logs de containers

**Recolecta logs de**:
- Todos los containers Docker via `/var/run/docker.sock`
- Logs del sistema desde `/var/log`

**Pipeline de procesamiento**:
- Extrae timestamps
- Parsea JSON (servicios Node.js)
- Extrae información de seguridad (auth, errores HTTP, DB)
- Etiqueta eventos por tipo

### 3. Grafana (Puerto 3030)
**URL Pública**: https://portfoliocvgasvill.uk/grafana
**Credenciales**: admin / admin123

**Datasource configurado**:
- Loki (auto-provisionado)
- URL interna: `http://loki:3100`

### 4. Docker Logs con Rotación
**Configuración en todos los servicios**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Tamaño máximo por archivo
    max-file: "3"      # Número de archivos a mantener
```

**Espacioen disco por servicio**: 30MB máximo (10MB × 3 archivos)
**Total del sistema**: ~420MB (14 servicios × 30MB)

---

## 🔒 Eventos de Seguridad Registrados

### 1. Autenticación y Autorización

#### Intentos de autenticación fallidos
**Servicios**: api-backend-1, api-backend-2
**Patrones detectados**:
- Errores de login
- Tokens inválidos
- JWT expirados
- Credenciales incorrectas

**Query Loki**:
```logql
{service=~"api-backend.*"} |~ "(?i)(auth|login|password|token|jwt).*(error|fail|denied|invalid)"
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh auth
```

### 2. Accesos Denegados

#### Errores HTTP 401 (No autorizado)
**Servicios**: api-gateway, api-backend-*
**Significado**: Usuario no autenticado intentando acceder a recursos protegidos

#### Errores HTTP 403 (Prohibido)
**Servicios**: api-gateway, api-backend-*
**Significado**: Usuario autenticado sin permisos suficientes

**Query Loki**:
```logql
{service=~"api-gateway|api-backend.*"} |~ " (401|403) "
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh access-denied
```

### 3. Errores de Autorización
**Servicios**: Todos
**Incluye**:
- Permisos insuficientes
- Roles incorrectos
- Acceso a recursos restringidos

### 4. Acceso a Endpoints Sensibles

#### Registros de marcajes
**Servicios**: api-backend-*
**Query**:
```logql
{service=~"api-backend.*"} |~ "(?i)marcaje"
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh marcajes
```

#### Operaciones administrativas
Cualquier operación con privilegios elevados queda registrada en los logs de los servicios correspondientes.

### 5. Cambios en Configuración
**Servicios**: Todos
**Incluye**:
- Cambios en variables de entorno
- Reinicios de servicios
- Actualizaciones de configuración

### 6. Conexiones a Base de Datos

#### Eventos registrados
**Servicios**: api-backend-*, export-service, notification-service
- Conexiones exitosas
- Desconexiones
- Errores de conexión
- Timeouts

**Query Loki**:
```logql
{service=~"api-backend.*|export-service|notification-service"} |~ "(?i)(mongodb|database).*(connect|disconnect|error)"
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh db
```

### 7. Errores HTTP por Código

#### Errores 4xx (Errores de Cliente)
**Query Loki**:
```logql
{service="api-gateway"} |~ " 4[0-9]{2} "
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh 4xx
```

#### Errores 5xx (Errores de Servidor)
**Query Loki**:
```logql
{service="api-gateway"} |~ " 5[0-9]{2} "
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh 5xx
```

### 8. Errores Críticos del Sistema
**Niveles**: CRITICAL, FATAL, ERROR
**Todos los servicios**

**Query Loki**:
```logql
{service=~".*"} |~ "(?i)(critical|fatal|error)"
```

**Script CLI**:
```bash
./consultar-logs-seguridad.sh errors
```

---

## ⚙️ Configuración Implementada

### Archivos Modificados

#### 1. docker-compose.yml
**Cambios**:
- Agregados servicios `loki` y `promtail`
- Logging rotativo en 14 servicios
- Red `frontend-network` agregada a Grafana
- Variables de entorno de Grafana actualizadas

#### 2. services/loki/
```
loki/
├── Dockerfile
└── loki-config.yml
```

#### 3. services/promtail/
```
promtail/
├── Dockerfile
└── promtail-config.yml
```

#### 4. services/grafana/
```
grafana/
├── Dockerfile
└── provisioning/
    └── datasources/
        └── loki.yml
```

#### 5. services/api-gateway/haproxy.cfg
**Agregado**:
- ACL para `/grafana`
- Backend `grafana_backend`
- Ruteo a Grafana con strip de prefijo

### Volúmenes Docker
```yaml
volumes:
  loki-data:      # Almacenamiento de logs de Loki
  grafana-data:   # Dashboards y configuración de Grafana
```

---

## 🚀 Uso del Sistema

### Acceso a Grafana
1. Abrir navegador en: https://portfoliocvgasvill.uk/grafana
2. Iniciar sesión:
   - Usuario: `admin`
   - Contraseña: `admin123`

### Explorar Logs en Grafana
1. Click en "Explore" (icono de brújula)
2. Seleccionar datasource "Loki"
3. Usar consultas LogQL (ejemplos arriba)

### Crear Dashboard Personalizado
1. Click en "+" → "Dashboard"
2. "Add visualization"
3. Seleccionar "Loki" como datasource
4. Agregar query LogQL
5. Seleccionar tipo de visualización (Logs, Time series, Table, etc.)

---

## 📜 Script de Consulta

### Ubicación
`/home/sysadmin/RegistroAsistencia/consultar-logs-seguridad.sh`

### Uso
```bash
./consultar-logs-seguridad.sh [opción]
```

### Opciones Disponibles

| Opción | Descripción |
|--------|-------------|
| `auth` | Intentos de autenticación fallidos |
| `access-denied` | Accesos denegados (401, 403) |
| `db` | Conexiones a base de datos |
| `errors` | Errores críticos del sistema |
| `marcajes` | Actividad de marcajes |
| `4xx` | Errores HTTP 4xx |
| `5xx` | Errores HTTP 5xx |
| `stats` | Estadísticas de seguridad (resumen) |
| `service <nombre>` | Logs de un servicio específico |
| `help` | Ayuda |

### Ejemplos

```bash
# Ver estadísticas de seguridad de las últimas 24 horas
./consultar-logs-seguridad.sh stats

# Ver intentos de autenticación fallidos
./consultar-logs-seguridad.sh auth

# Ver logs de un servicio específico
./consultar-logs-seguridad.sh service api-backend-1

# Cambiar rango de tiempo (últimas 2 horas)
TIME_RANGE=2h ./consultar-logs-seguridad.sh errors

# Ver errores 5xx de la última hora
TIME_RANGE=1h ./consultar-logs-seguridad.sh 5xx
```

### Variables de Entorno

```bash
# URL de Loki (default: http://localhost:3100)
LOKI_URL=http://localhost:3100

# Rango de tiempo (default: 24h)
TIME_RANGE=24h  # Formatos: 1h, 2h, 24h, 7d
```

---

## 📊 Dashboard de Grafana

### Consultas Recomendadas

#### Panel 1: Fallos de Autenticación por Hora
```logql
sum(count_over_time({service=~"api-backend.*"} |~ "(?i)(auth|login).*(error|fail)" [1m]))
```
**Visualización**: Time series

#### Panel 2: Accesos Denegados (401/403)
```logql
{service=~"api-gateway|api-backend.*"} |~ " (401|403) "
```
**Visualización**: Logs

#### Panel 3: Errores HTTP 4xx vs 5xx
```logql
# Query A (4xx)
sum(count_over_time({service="api-gateway"} |~ " 4[0-9]{2} " [1m]))

# Query B (5xx)
sum(count_over_time({service="api-gateway"} |~ " 5[0-9]{2} " [1m]))
```
**Visualización**: Time series

#### Panel 4: Actividad de Marcajes
```logql
sum(count_over_time({service=~"api-backend.*"} |~ "(?i)marcaje" [5m]))
```
**Visualización**: Time series / Stat

#### Panel 5: Top 10 IPs con más solicitudes
```logql
topk(10, sum by (client_ip) (count_over_time({service="api-gateway"} | regexp "(?P<client_ip>[0-9\\.]+)" [1h])))
```
**Visualización**: Table

#### Panel 6: Conexiones a DB
```logql
{service=~"api-backend.*|export-service|notification-service"} |~ "(?i)(mongodb|database).*(connect|disconnect|error)"
```
**Visualización**: Logs

---

## 🔧 Mantenimiento

### Verificar Estado de Servicios
```bash
# Ver estado de Loki, Promtail y Grafana
docker ps --filter "name=loki\|promtail\|grafana"

# Verificar health de Loki
curl http://localhost:3100/ready

# Verificar health de Promtail
curl http://localhost:9080/ready

# Verificar health de Grafana
curl http://localhost:3030/api/health
```

### Monitorear Uso de Disco
```bash
# Ver tamaño del volumen de Loki
docker system df -v | grep loki-data

# Ver tamaño de logs Docker
du -sh /var/lib/docker/containers/*/
```

### Limpiar Logs Antiguos
Los logs se auto-limpian según configuración:
- **Loki**: 7 días de retención automática
- **Docker logs**: 3 archivos × 10MB por servicio

Manual (si es necesario):
```bash
# Limpiar logs de Docker manualmente
docker system prune -a --volumes

# Reiniciar Loki para forzar compactación
docker-compose restart loki
```

### Logs de los Servicios de Logging
```bash
# Ver logs de Loki
docker logs loki --tail 100

# Ver logs de Promtail
docker logs promtail --tail 100

# Ver logs de Grafana
docker logs grafana --tail 100
```

### Backup de Dashboards
```bash
# Exportar dashboard desde Grafana UI
# Settings → JSON Model → Copy

# O usar API
curl -u admin:admin123 http://localhost:3030/api/dashboards/uid/<dashboard-uid> > dashboard-backup.json
```

### Restaurar Servicios
```bash
# Reiniciar stack de logging
docker-compose restart loki promtail grafana

# Reconstruir si hay cambios de configuración
docker-compose up -d --build loki promtail grafana
```

---

## 📈 Métricas del Sistema

### Servicios Monitoreados
Total: **19 servicios**

1. api-backend-1
2. api-backend-2
3. ai-service-1
4. ai-service-2
5. websocket-service-1
6. websocket-service-2
7. frontend-1
8. frontend-2
9. terminal-marcaje
10. notification-service
11. export-service
12. api-gateway
13. prometheus
14. grafana
15. cadvisor
16. node-exporter
17. backup-service
18. loki
19. promtail

### Capacidad de Almacenamiento

**Logs Docker** (local):
- 30MB por servicio (10MB × 3 archivos)
- Total: ~570MB (19 servicios)

**Loki** (centralizado):
- Retención: 7 días
- Compresión eficiente (similar a Prometheus)
- Estimado: 1-5GB dependiendo de la actividad

**Logs totales del sistema**: ~5.5GB máximo

---

## 🔐 Seguridad

### Recomendaciones

1. **Cambiar contraseña de Grafana**:
   ```bash
   # En docker-compose.yml
   GF_SECURITY_ADMIN_PASSWORD: <nueva-contraseña-segura>
   ```

2. **Limitar acceso a Grafana**:
   - Usar autenticación OAuth/LDAP en producción
   - Configurar WAF en HAProxy para `/grafana`

3. **Auditar logs regularmente**:
   ```bash
   # Ejecutar diariamente
   ./consultar-logs-seguridad.sh stats > /var/log/security-audit-$(date +%Y%m%d).log
   ```

4. **Alertas en Grafana**:
   - Configurar alertas para patrones sospechosos
   - Enviar notificaciones a email/Slack

5. **Backup de configuración**:
   ```bash
   # Backup semanal
   tar -czf loki-config-backup.tar.gz services/loki/ services/promtail/
   ```

---

## 📞 Soporte

### Documentación Oficial
- Loki: https://grafana.com/docs/loki/
- Promtail: https://grafana.com/docs/loki/latest/clients/promtail/
- Grafana: https://grafana.com/docs/grafana/

### Comandos Útiles
```bash
# Ver todos los logs de seguridad del día
./consultar-logs-seguridad.sh stats

# Monitorear en tiempo real (desde Docker)
docker logs -f api-backend-1

# Query directo a Loki API
curl -G 'http://localhost:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service="api-backend-1"}' \
  --data-urlencode 'limit=10'
```

---

## ✅ Checklist de Implementación Completado

- [x] Loki instalado y configurado
- [x] Promtail recolectando logs de 19 servicios
- [x] Grafana con datasource Loki configurado
- [x] Rotación de logs en todos los servicios (10MB × 3)
- [x] Script CLI de consulta de logs
- [x] HAProxy configurado para `/grafana`
- [x] Retención de 7 días configurada
- [x] Documentación completa
- [x] Eventos de seguridad identificados y documentados

---

**Fecha de implementación**: 2 de Diciembre, 2025
**Versión**: 1.0
**Sistema**: Control de Asistencia - Universidad
