# Dockerfile para servicio de backup
FROM mongo:7.0

# Instalar herramientas necesarias
RUN apt-get update && apt-get install -y \
    cron \
    curl \
    bash \
    gzip \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Crear directorios
RUN mkdir -p /backups/mongodb \
    /backups/files \
    /backups/logs \
    /scripts

# Copiar scripts de backup
COPY backup-mongodb.sh /scripts/
COPY restore-mongodb.sh /scripts/
COPY backup-files.sh /scripts/
COPY backup-all.sh /scripts/

# Dar permisos de ejecución
RUN chmod +x /scripts/*.sh

# Crear archivo de cron
RUN echo "# Backup automático diario a las 2:00 AM" > /etc/cron.d/backup-cron && \
    echo "0 2 * * * root /scripts/backup-all.sh >> /backups/logs/cron.log 2>&1" >> /etc/cron.d/backup-cron && \
    echo "" >> /etc/cron.d/backup-cron && \
    chmod 0644 /etc/cron.d/backup-cron && \
    crontab /etc/cron.d/backup-cron

# Script de entrada
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["cron", "-f"]
