FROM grafana/loki:2.9.3

USER root
COPY loki-config.yml /etc/loki/local-config.yaml
RUN chmod 644 /etc/loki/local-config.yaml && \
    mkdir -p /tmp/loki/chunks /tmp/loki/rules /tmp/loki/compactor && \
    chown -R loki:loki /tmp/loki
USER loki

EXPOSE 3100
