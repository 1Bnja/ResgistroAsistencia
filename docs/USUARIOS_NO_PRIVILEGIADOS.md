# Implementación de Usuarios No Privilegiados en Dockerfiles

## Fecha: 11 de noviembre de 2025

## Resumen de Cambios

Se ha implementado la práctica de seguridad de ejecutar contenedores Docker con usuarios no privilegiados (non-root) en todos los servicios donde es técnicamente posible.

---

## ✅ Servicios con Usuario No Privilegiado Implementado

### 1. **api-backend** ✅ (Ya implementado)
- **Usuario**: `nodejs` (uid 1001)
- **Estado**: Ya configurado correctamente
- **Notas**: Sin cambios necesarios

### 2. **export-service** ✅ (Ya implementado)
- **Usuario**: `node` (usuario pre-existente)
- **Estado**: Ya configurado correctamente
- **Notas**: Sin cambios necesarios

### 3. **notification-service** ✅ (Ya implementado)
- **Usuario**: `nodejs` (uid 1001)
- **Estado**: Ya configurado correctamente
- **Notas**: Sin cambios necesarios

### 4. **websocket-service** ✅ (ACTUALIZADO)
- **Usuario**: `node` (usuario pre-existente en imagen base)
- **Cambios realizados**:
  ```dockerfile
  RUN chown -R node:node /app
  USER node
  ```
- **Puerto**: 3002 (sin cambios)

### 5. **api-IA** ✅ (ACTUALIZADO)
- **Usuario**: `appuser` (uid y gid por defecto del sistema)
- **Cambios realizados**:
  ```dockerfile
  RUN groupadd -r appuser && useradd -r -g appuser appuser
  RUN chown -R appuser:appuser /app
  USER appuser
  ```
- **Puerto**: 5000 (sin cambios)

### 6. **frontend** ✅ (ACTUALIZADO)
- **Usuario**: `nginx-user` (uid 1001)
- **Cambios realizados**:
  - Creación de usuario no privilegiado
  - Cambio de puerto de 80 a 8080 (puerto no privilegiado)
  - Actualización de permisos en directorios necesarios
  - Actualización de nginx.conf para escuchar en puerto 8080
- **Puerto**: Cambiado de 80 → 8080
- **Impacto**: Actualizado haproxy.cfg para apuntar a puerto 8080

### 7. **terminal-marcaje** ✅ (ACTUALIZADO)
- **Usuario**: `nginx-user` (uid 1001)
- **Cambios realizados**:
  - Creación de usuario no privilegiado
  - Cambio de puerto de 80 a 8080
  - Configuración de permisos en directorios
- **Puerto**: Cambiado de 80 → 8080
- **Impacto**: Actualizado docker-compose.yml (5174:8080)

---

## ℹ️ Servicios con Usuario No Privilegiado por Defecto

### 8. **prometheus**
- **Estado**: La imagen oficial `prom/prometheus` ya usa usuario `nobody`
- **Notas**: Sin cambios necesarios

### 9. **grafana**
- **Estado**: La imagen oficial `grafana/grafana` ya usa usuario `grafana` (uid 472)
- **Notas**: Sin cambios necesarios

---

## ❌ Servicios que NO PUEDEN usar Usuario No Privilegiado

### 10. **api-gateway (HAProxy)**
- **Razón**: HAProxy necesita privilegios para:
  - Bind en puertos 80 y 443 (puertos privilegiados)
  - Gestión de conexiones a nivel de sistema
- **Alternativas consideradas**:
  - Usar puertos no privilegiados (ej: 8080, 8443)
  - Usar capabilities de Linux (`CAP_NET_BIND_SERVICE`)
- **Decisión**: Mantener como root por requerimientos arquitectónicos
- **Mitigación**: Uso de imagen oficial `haproxy:2.9-alpine` con actualizaciones de seguridad

### 11. **backup-service**
- **Razón**: Requiere privilegios para:
  - Ejecutar cron como daemon
  - Acceso a operaciones de backup de MongoDB
  - Escritura en sistema de archivos del host
- **Decisión**: Mantener como root por necesidades funcionales
- **Mitigación**: Contenedor aislado, sin exposición de puertos

---

## 📋 Archivos Modificados

### Dockerfiles:
1. `/services/websocket-service/Dockerfile`
2. `/services/api-IA/Dockerfile`
3. `/services/frontend/Dockerfile`
4. `/services/terminal-marcaje/Dockerfile`

### Archivos de Configuración:
1. `/services/frontend/nginx.conf` - Puerto 80 → 8080
2. `/services/api-gateway/haproxy.cfg` - Actualizado backend frontend_backend
3. `/docker-compose.yml` - Actualizado mapeo de puerto terminal-marcaje

---

## 🔄 Cambios en Docker Compose

### terminal-marcaje:
```yaml
ports:
  - "5174:8080"  # Antes: "5174:80"
```

### frontend-1 y frontend-2:
- Puerto interno cambiado de 80 → 8080
- Sin cambios en docker-compose.yml (no tienen puertos expuestos directamente)
- HAProxy actualizado para comunicarse con puerto 8080

---

## 🚀 Pasos para Aplicar los Cambios

### 1. Reconstruir y reiniciar servicios afectados:

```bash
# Reconstruir todos los servicios modificados
docker compose build websocket-service api-service frontend-1 frontend-2 terminal-marcaje api-gateway

# Reiniciar servicios
docker compose up -d --force-recreate websocket-service ai-service frontend-1 frontend-2 terminal-marcaje api-gateway
```

### 2. Verificar que los contenedores están ejecutando con usuarios no privilegiados:

```bash
# Verificar websocket-service
docker exec websocket-service whoami  # Debe retornar: node

# Verificar api-IA
docker exec ai-service whoami  # Debe retornar: appuser

# Verificar frontend
docker exec frontend-1 whoami  # Debe retornar: nginx-user

# Verificar terminal-marcaje
docker exec terminal-marcaje whoami  # Debe retornar: nginx-user
```

### 3. Verificar que los servicios funcionan correctamente:

```bash
# Health checks
curl http://localhost:3002/health  # websocket-service
curl http://localhost:5050/health  # ai-service
curl http://localhost:8080/health.html  # frontend (via gateway)
curl http://localhost:5174/  # terminal-marcaje
```

---

## 🔒 Beneficios de Seguridad

### Implementados:
1. **Reducción de superficie de ataque**: Los procesos no pueden realizar operaciones privilegiadas
2. **Principio de mínimo privilegio**: Cada servicio solo tiene los permisos necesarios
3. **Contención de brechas**: Un compromiso del contenedor no da acceso root
4. **Aislamiento mejorado**: Los procesos no pueden modificar archivos del sistema

### Limitaciones aceptadas:
1. **api-gateway**: Requiere root para puertos privilegiados (80, 443)
2. **backup-service**: Requiere root para operaciones de cron y backup

---

## 📊 Estadísticas Finales

- **Total de servicios**: 11
- **Con usuario no privilegiado**: 9 (82%)
  - 7 implementados manualmente
  - 2 por imagen base oficial
- **Con limitaciones técnicas**: 2 (18%)
  - api-gateway (HAProxy)
  - backup-service (Cron/Backup)

---

## ⚠️ Notas Importantes

### Usuarios en imágenes base:
- **node:18-alpine / node:20-alpine**: Incluye usuario `node` (uid 1000)
- **nginx:alpine**: No incluye usuario no privilegiado por defecto
- **python:3.10-slim**: No incluye usuario no privilegiado por defecto

### Puertos privilegiados:
- Puertos < 1024 requieren privilegios root en Linux
- Solución: Usar puertos ≥ 1024 o capabilities específicas

### Testing:
- Todos los servicios deben ser probados exhaustivamente
- Verificar permisos de escritura en volúmenes montados
- Confirmar que las aplicaciones pueden leer/escribir archivos necesarios

---

## 📝 Próximos Pasos Recomendados

1. **Monitoreo**: Verificar logs después del despliegue
2. **Testing**: Ejecutar suite completa de pruebas
3. **Documentación**: Actualizar README de cada servicio
4. **Seguridad adicional**:
   - Implementar escaneo de vulnerabilidades en imágenes
   - Considerar políticas de AppArmor/SELinux
   - Implementar network policies en Kubernetes (si aplica)

---

## 🆘 Troubleshooting

### Problema: "Permission denied" al escribir archivos
**Solución**: Verificar que los directorios tengan permisos correctos:
```dockerfile
RUN chown -R user:group /path/to/directory
```

### Problema: Container no puede escuchar en puerto
**Solución**: Verificar que el puerto sea ≥ 1024 o usar capabilities

### Problema: Aplicación no encuentra archivos
**Solución**: Verificar que COPY use --chown en Dockerfile:
```dockerfile
COPY --chown=user:group src/ ./src/
```

---

## ✅ Checklist de Validación

- [x] websocket-service ejecuta como usuario `node`
- [x] api-IA ejecuta como usuario `appuser`
- [x] frontend ejecuta como usuario `nginx-user` en puerto 8080
- [x] terminal-marcaje ejecuta como usuario `nginx-user` en puerto 8080
- [x] HAProxy actualizado para comunicarse con frontend:8080
- [x] docker-compose.yml actualizado con nuevos puertos
- [ ] Tests ejecutados exitosamente
- [ ] Servicios verificados en ambiente de desarrollo
- [ ] Documentación actualizada en READMEs individuales

---

**Autor**: Sistema de Control de Asistencia - DevOps Team  
**Última actualización**: 11 de noviembre de 2025
