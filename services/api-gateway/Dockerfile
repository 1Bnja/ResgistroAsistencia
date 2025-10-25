FROM haproxy:2.9-alpine

# Metadata
LABEL maintainer="equipo-asistencia@utalca.cl"
LABEL description="API Gateway HAProxy - Sistema de Asistencia"

# Copiar configuración
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

# Copiar páginas de error
COPY errors/ /usr/local/etc/haproxy/errors/

# Validar configuración
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg || exit 1

# Exponer puertos
EXPOSE 80 443 8404

# Comando por defecto
CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]
