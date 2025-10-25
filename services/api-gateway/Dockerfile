FROM haproxy:2.9-alpine

LABEL maintainer="equipo-asistencia@utalca.cl"
LABEL description="API Gateway con HAProxy para Sistema de Asistencia"
LABEL proyecto="Registro Asistencia - Universidad de Talca"

COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg

COPY errors/ /usr/local/etc/haproxy/errors/

RUN addgroup -g 1000 haproxy-user && \
    adduser -D -u 1000 -G haproxy-user haproxy-user

RUN haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg || exit 1

# Exponer puertos
# 80: HTTP
# 443: HTTPS (futuro)
# 8404: Stats/Monitoring
EXPOSE 80 443 8404

USER haproxy-user

CMD ["haproxy", "-f", "/usr/local/etc/haproxy/haproxy.cfg"]