# Prometheus Service
FROM prom/prometheus:latest

# Metadata
LABEL maintainer="Sistema de Control de Asistencia"
LABEL description="Prometheus para monitoreo de métricas"

# Copiar configuración personalizada
COPY --chown=65534:65534 prometheus.yml /etc/prometheus/prometheus.yml

# La imagen oficial de Prometheus ya corre como usuario no-root (nobody UID 65534)
# Especificamos explícitamente para Trivy
USER nobody

# El resto de la configuración se hace vía command en docker-compose
# - storage.tsdb.path se monta como volumen
# - web.enable-lifecycle para hot-reload

# Exponer puerto
EXPOSE 9090

# El comando default de la imagen base ya ejecuta prometheus
# Solo necesitamos asegurar que use nuestra config
