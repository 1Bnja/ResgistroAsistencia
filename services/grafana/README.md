# Grafana Service

Servicio de visualización de métricas para el Sistema de Control de Asistencia.

## 🎯 Propósito

Grafana proporciona dashboards interactivos para visualizar métricas de:
- Performance de APIs
- Estado de servicios
- Métricas de infraestructura
- Estadísticas de HAProxy

## 📋 Configuración

### Credenciales Default
```
Usuario: admin
Password: admin123
```

**⚠️ IMPORTANTE:** Cambiar estas credenciales en producción mediante variables de entorno.

### Provisioning Automático

El servicio incluye configuración automática de:

#### Datasources (`provisioning/datasources/`)
- **Prometheus**: Pre-configurado apuntando a `http://prometheus:9090`

#### Dashboards (`provisioning/dashboards/`)
- **api-metrics.json**: Métricas de API Backend
- **haproxy-metrics.json**: Métricas de balanceador HAProxy
- **services-monitoring.json**: Monitoreo general de servicios
- **dashboard.yml**: Proveedor de dashboards

## 🚀 Uso

### Acceso a la UI
```
http://localhost:3030
```

### Estructura de Dashboards

1. **API Metrics Dashboard**
   - Requests por segundo
   - Response time (p50, p95, p99)
   - Error rate
   - Status codes distribution

2. **HAProxy Metrics Dashboard**
   - Backend health
   - Connection rate
   - Request distribution
   - Session metrics

3. **Services Monitoring Dashboard**
   - Container CPU/Memory
   - Network I/O
   - Service availability

## 🏗️ Dockerfile

Basado en `grafana/grafana:latest` con provisioning embebido.

## 📊 Agregar Nuevos Dashboards

### Opción 1: Via UI (Recomendado para desarrollo)
1. Crear dashboard en la UI
2. Exportar JSON
3. Copiar a `provisioning/dashboards/`
4. Rebuild del contenedor

### Opción 2: Via Provisioning (Producción)
1. Crear archivo `.json` en `provisioning/dashboards/`
2. Rebuild del contenedor
3. Dashboard se carga automáticamente

## 🔧 Variables de Entorno

Configuradas en `docker-compose.yml`:

```yaml
GF_SECURITY_ADMIN_USER: Usuario admin
GF_SECURITY_ADMIN_PASSWORD: Password admin
GF_USERS_ALLOW_SIGN_UP: Permitir registro de usuarios
GF_SERVER_ROOT_URL: URL base de Grafana
GF_INSTALL_PLUGINS: Plugins a instalar automáticamente
```

## 🔌 Plugins Instalados

- `grafana-clock-panel`: Panel de reloj
- `grafana-simple-json-datasource`: Datasource JSON genérico

## 📈 Queries PromQL Útiles

Ver en los dashboards pre-configurados para ejemplos de queries.
