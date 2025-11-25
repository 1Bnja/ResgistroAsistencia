# Security Scanning con Trivy

Scripts para escanear vulnerabilidades en contenedores y dependencias.

## 🚀 Uso Rápido

### Escanear todos los servicios
```bash
cd /Users/benja/Desktop/ResgistroAsistencia
./scripts/security/scan-containers.sh
```

### Escanear un servicio específico
```bash
./scripts/security/scan-quick.sh frontend
./scripts/security/scan-quick.sh api-backend
./scripts/security/scan-quick.sh api-IA
```

## 📋 Comandos Útiles

### Escanear una imagen Docker específica
```bash
trivy image node:18-alpine
trivy image mongo:latest
trivy image python:3.11-slim
```

### Escanear imágenes construidas localmente
```bash
# Primero construye la imagen
docker build -t mi-servicio:latest ./services/frontend

# Luego escanéala
trivy image mi-servicio:latest
```

### Escanear un Dockerfile
```bash
trivy config services/frontend/Dockerfile
```

### Escanear dependencias de Node.js
```bash
trivy fs services/frontend/package.json
```

### Escanear dependencias de Python
```bash
trivy fs services/api-IA/requirements.txt
```

### Escanear todo el proyecto
```bash
trivy fs .
```

## 🎯 Niveles de Severidad

- **CRITICAL**: Requiere acción inmediata
- **HIGH**: Requiere atención pronto
- **MEDIUM**: Revisar cuando sea posible
- **LOW**: Informativo

## 📊 Opciones de Salida

### Formato JSON (para integración CI/CD)
```bash
trivy image node:18-alpine --format json -o report.json
```

### Formato SARIF (para GitHub Security)
```bash
trivy image node:18-alpine --format sarif -o report.sarif
```

### Formato tabla (legible)
```bash
trivy image node:18-alpine --format table
```

## 🔧 Configuración

### Filtrar por severidad
```bash
trivy image node:18-alpine --severity HIGH,CRITICAL
```

### Ignorar vulnerabilidades no arregladas
```bash
trivy image node:18-alpine --ignore-unfixed
```

### Usar archivo .trivyignore
Crea un archivo `.trivyignore` en la raíz del proyecto para ignorar CVEs específicos.

## 📁 Reportes

Los reportes se guardan en `security-reports/` con timestamp:
- `{servicio}_dockerfile_{timestamp}.txt` - Análisis de Dockerfile
- `{servicio}_image_{timestamp}.txt` - Análisis de imagen
- `summary_{timestamp}.txt` - Resumen general

## 🔄 Integración CI/CD

### GitHub Actions
```yaml
- name: Run Trivy scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myimage:latest'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### GitLab CI
```yaml
trivy:
  script:
    - trivy image --exit-code 1 --severity CRITICAL myimage:latest
```

## 🛡️ Mejores Prácticas

1. **Escanea regularmente** - Al menos una vez por semana
2. **Escanea antes de deploy** - Integra en tu pipeline CI/CD
3. **Actualiza imágenes base** - Usa versiones específicas y actualizadas
4. **Revisa dependencias** - Mantén package.json y requirements.txt actualizados
5. **Documenta excepciones** - Usa .trivyignore con justificación

## 📚 Recursos

- [Documentación Trivy](https://aquasecurity.github.io/trivy/)
- [Trivy GitHub](https://github.com/aquasecurity/trivy)
- [CVE Database](https://cve.mitre.org/)
