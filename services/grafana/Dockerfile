# Grafana Service
FROM grafana/grafana:latest

# Metadata
LABEL maintainer="Sistema de Control de Asistencia"
LABEL description="Grafana para visualización de métricas"

# Copiar configuraciones de provisioning
COPY provisioning/datasources/ /etc/grafana/provisioning/datasources/
COPY provisioning/dashboards/ /etc/grafana/provisioning/dashboards/

# Configuraciones via ENV se pasan en docker-compose:
# - GF_SECURITY_ADMIN_USER
# - GF_SECURITY_ADMIN_PASSWORD
# - GF_USERS_ALLOW_SIGN_UP
# - GF_SERVER_ROOT_URL
# - GF_INSTALL_PLUGINS

# Exponer puerto
EXPOSE 3000

# El comando default de la imagen base ya ejecuta grafana-server
