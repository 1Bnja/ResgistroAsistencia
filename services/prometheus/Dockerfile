# Prometheus Service
FROM prom/prometheus:latest

# Metadata
LABEL maintainer="Sistema de Control de Asistencia"
LABEL description="Prometheus para monitoreo de métricas"

# Copiar configuración personalizada
COPY prometheus.yml /etc/prometheus/prometheus.yml

# El resto de la configuración se hace vía command en docker-compose
# - storage.tsdb.path se monta como volumen
# - web.enable-lifecycle para hot-reload

# Exponer puerto
EXPOSE 9090

# El comando default de la imagen base ya ejecuta prometheus
# Solo necesitamos asegurar que use nuestra config
