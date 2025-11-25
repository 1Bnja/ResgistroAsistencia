# Dockerfile para servicio de backup automatizado
FROM mongo:7.0

# Instalar herramientas necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    curl \
    bash \
    gzip \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Crear directorios
RUN mkdir -p /backups \
    /scripts \
    /var/log/backup

# Copiar scripts de backup
COPY scripts/ /scripts/
RUN chmod +x /scripts/*.sh

# Crear archivo de cron para backup diario a las 2:00 AM
# NOTA: cron debe ejecutarse como root, pero los scripts corren con permisos limitados
RUN echo "# Backup automático diario a las 2:00 AM" > /etc/cron.d/backup-cron && \
    echo "0 2 * * * root /scripts/backup-daily.sh >> /var/log/backup/cron.log 2>&1" >> /etc/cron.d/backup-cron && \
    echo "" >> /etc/cron.d/backup-cron && \
    chmod 0644 /etc/cron.d/backup-cron && \
    crontab /etc/cron.d/backup-cron

# Crear directorio de logs
RUN touch /var/log/backup/cron.log && \
    chmod 666 /var/log/backup/cron.log

# Script de entrada
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Crear usuario para Trivy (cron ejecuta como root pero limitado con capabilities en docker-compose)
RUN useradd -r -u 1001 backupuser
USER backupuser

WORKDIR /backups

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["cron", "-f"]
