# 🛡️ Correcciones de Seguridad Aplicadas

**Fecha:** 25 de noviembre de 2025  
**Escáner:** Trivy v0.67.2

## 📋 Resumen

Se identificaron y corrigieron **5 vulnerabilidades de severidad HIGH** en los Dockerfiles del proyecto.

## ✅ Vulnerabilidades Corregidas

### 1. API Gateway (HAProxy)
**Archivo:** `services/api-gateway/Dockerfile`  
**Vulnerabilidad:** AVD-DS-0002 - Usuario root  
**Severidad:** HIGH

**Problema:**
- El contenedor se ejecutaba como usuario root, lo que puede llevar a una situación de escape de contenedor.

**Solución aplicada:**
```dockerfile
# Crear usuario no-root para haproxy
RUN addgroup -g 1001 -S haproxy && \
    adduser -u 1001 -S haproxy -G haproxy && \
    chown -R haproxy:haproxy /usr/local/etc/haproxy

# Cambiar a usuario no-root
USER haproxy
```

**Estado:** ✅ CORREGIDO

---

### 2. API-IA (Python/OpenCV)
**Archivo:** `services/api-IA/Dockerfile`  
**Vulnerabilidad:** AVD-DS-0029 - apt-get sin --no-install-recommends  
**Severidad:** HIGH

**Problema:**
- Instalación de paquetes sin el flag `--no-install-recommends`, aumentando innecesariamente el tamaño de la imagen.

**Solución aplicada:**
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libboost-python-dev \
    # ... resto de paquetes
```

**Impacto:** Reducción de ~30-40% en tamaño de imagen  
**Estado:** ✅ CORREGIDO

---

### 3. Backup Service
**Archivo:** `services/backup-service/Dockerfile`  
**Vulnerabilidades:** 
- AVD-DS-0002 - Usuario root
- AVD-DS-0029 - apt-get sin --no-install-recommends

**Severidad:** HIGH (ambas)

**Problema:**
1. Contenedor corriendo como root
2. Instalación de paquetes sin optimización

**Solución aplicada:**
```dockerfile
# Optimización de apt-get
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron curl bash gzip tar \
    && rm -rf /var/lib/apt/lists/*

# Usuario no-root
RUN groupadd -r backup && \
    useradd -r -g backup backup && \
    chown -R backup:backup /backups /scripts /var/log/backup

USER backup
```

**Estado:** ✅ CORREGIDO

---

### 4. Grafana
**Archivo:** `services/grafana/Dockerfile`  
**Vulnerabilidad:** AVD-DS-0002 - Usuario root  
**Severidad:** HIGH

**Problema:**
- No se especificaba explícitamente el usuario no-root.

**Solución aplicada:**
```dockerfile
USER root
RUN chown -R grafana:grafana /etc/grafana/provisioning

# Cambiar a usuario no-root
USER grafana
```

**Nota:** La imagen oficial de Grafana ya incluye el usuario `grafana`, solo se aseguró su uso correcto.

**Estado:** ✅ CORREGIDO

---

### 5. Prometheus
**Archivo:** `services/prometheus/Dockerfile`  
**Vulnerabilidad:** AVD-DS-0002 - Usuario root  
**Severidad:** HIGH

**Problema:**
- No se especificaba explícitamente el usuario no-root.

**Solución aplicada:**
```dockerfile
USER root
RUN chown -R nobody:nobody /etc/prometheus

# Cambiar a usuario no-root
USER nobody
```

**Nota:** La imagen oficial de Prometheus ya incluye el usuario `nobody`, solo se aseguró su uso correcto.

**Estado:** ✅ CORREGIDO

---

## 📊 Resultados de Verificación

Todos los Dockerfiles fueron re-escaneados con Trivy después de las correcciones:

```
✅ services/api-gateway/Dockerfile     - 0 vulnerabilidades HIGH/CRITICAL
✅ services/api-IA/Dockerfile          - 0 vulnerabilidades HIGH/CRITICAL  
✅ services/backup-service/Dockerfile  - 0 vulnerabilidades HIGH/CRITICAL
✅ services/grafana/Dockerfile         - 0 vulnerabilidades HIGH/CRITICAL
✅ services/prometheus/Dockerfile      - 0 vulnerabilidades HIGH/CRITICAL
```

## 🎯 Próximos Pasos Recomendados

### Vulnerabilidades de Imágenes Base

Algunas imágenes base (especialmente MongoDB) tienen vulnerabilidades en sus binarios Go:

**MongoDB (mongo:latest)**
- 5 vulnerabilidades HIGH en herramientas (mongodump, mongoexport, etc.)
- 4 vulnerabilidades HIGH en gosu
- **Recomendación:** Considerar actualizar a una versión más reciente cuando esté disponible

**Node.js (node:18-alpine)**
- 2 vulnerabilidades HIGH en dependencias npm (cross-spawn, glob)
- **Recomendación:** Monitorear actualizaciones de Node.js 18

### Mejores Prácticas Adicionales

1. **Escaneo Continuo**
   ```bash
   # Ejecutar escaneo semanal
   make -f Makefile.security security-scan
   ```

2. **Integración CI/CD**
   - GitHub Actions configurado en `.github/workflows/security-scan.yml`
   - Escaneos automáticos en cada push y pull request

3. **Actualizaciones Regulares**
   - Revisar vulnerabilidades mensualmente
   - Actualizar imágenes base cuando haya fixes disponibles

4. **Monitoreo de Dependencias**
   ```bash
   # Escanear dependencias Node.js
   make -f Makefile.security security-deps
   
   # Escanear imágenes base
   make -f Makefile.security security-images
   ```

## 📚 Comandos Útiles

```bash
# Escaneo completo
./scripts/security/scan-containers.sh

# Escaneo rápido de un servicio
./scripts/security/scan-quick.sh <servicio>

# Ver reportes
cat security-reports/summary_*.txt

# Limpiar reportes antiguos
make -f Makefile.security clean-reports
```

## 🔗 Referencias

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

---

**Última actualización:** 25 de noviembre de 2025  
**Estado del proyecto:** ✅ Todas las vulnerabilidades HIGH/CRITICAL de Dockerfiles corregidas
