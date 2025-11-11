# Prometheus Service

Servicio de monitoreo y recolección de métricas para el Sistema de Control de Asistencia.

## 🎯 Propósito

Prometheus recolecta métricas de:
- API Backend (principal y slave)
- HAProxy (API Gateway)
- cAdvisor (métricas de contenedores Docker)
- Node Exporter (métricas del sistema host)

## 📋 Configuración

### prometheus.yml

Define:
- **scrape_interval**: Cada 15s recolecta métricas
- **evaluation_interval**: Cada 15s evalúa reglas
- **scrape_configs**: Lista de servicios a monitorear

### Targets Configurados

| Job Name | Endpoint | Descripción |
|----------|----------|-------------|
| prometheus | localhost:9090 | Auto-monitoreo |
| api-backend | api-backend:3000/metrics | Métricas de aplicación |
| api-backend | api-backend-slave:3000/metrics | Replica de lectura |
| cadvisor | cadvisor:8080 | Métricas de contenedores |
| node-exporter | node-exporter:9100 | Métricas del sistema |
| haproxy | api-gateway:8405/metrics | Métricas del balanceador |

## 🚀 Uso

### Acceso a la UI
```
http://localhost:9090
```

### Queries Útiles

**Request rate:**
```promql
rate(http_requests_total[5m])
```

**Error rate:**
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

**Response time p95:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## 🏗️ Dockerfile

Basado en `prom/prometheus:latest` con configuración embebida.

## 📊 Integración con Grafana

Grafana se conecta a Prometheus en `http://prometheus:9090` para visualizar las métricas.
