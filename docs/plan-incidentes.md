# Plan de Respuesta a Incidentes

## 1. Detección
- **Fuentes**: Alertas de monitoreo (Prometheus/Grafana), reportes de usuarios, logs de seguridad.
- **Acción**: Verificar la veracidad del incidente y clasificar su severidad (Baja, Media, Alta, Crítica).

## 2. Contención
- **Objetivo**: Limitar el daño.
- **Acciones**:
    - Aislar contenedores afectados.
    - Bloquear IPs atacantes en HAProxy/Cloudflare.
    - Rotar credenciales comprometidas inmediatamente.

## 3. Erradicación
- **Objetivo**: Eliminar la causa raíz.
- **Acciones**:
    - Parchear vulnerabilidades.
    - Eliminar malware o archivos sospechosos.
    - Restaurar desde backup limpio si es necesario.

## 4. Recuperación
- **Objetivo**: Restaurar el servicio normal.
- **Acciones**:
    - Reiniciar servicios.
    - Verificar integridad de datos.
    - Monitorear intensivamente por 24 horas.

## 5. Lecciones Aprendidas
- **Acción**: Post-mortem del incidente. Documentar qué falló y cómo prevenirlo.
