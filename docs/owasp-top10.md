# Análisis OWASP Top 10 (2021)

## A01:2021 - Broken Access Control
**Mitigación:** Implementación de roles y permisos estrictos. Validación de JWT en cada petición protegida.

## A02:2021 - Cryptographic Failures
**Mitigación:** Uso de HTTPS (Cloudflare/HAProxy). Hashing de contraseñas con bcrypt.

## A03:2021 - Injection
**Mitigación:** Uso de Mongoose para prevenir inyección NoSQL. Validación de inputs.

## A04:2021 - Insecure Design
**Mitigación:** Rate limiting, validación de esquemas, principio de mínimo privilegio.

## A05:2021 - Security Misconfiguration
**Mitigación:** Hardening de contenedores, eliminación de usuarios root, headers de seguridad.

## A06:2021 - Vulnerable and Outdated Components
**Mitigación:** Escaneo de imágenes y dependencias con Trivy. Actualización periódica.

## A07:2021 - Identification and Authentication Failures
**Mitigación:** Contraseñas fuertes, protección contra fuerza bruta, gestión segura de sesiones JWT.

## A08:2021 - Software and Data Integrity Failures
**Mitigación:** Verificación de integridad en CI/CD (futuro), uso de imágenes oficiales.

## A09:2021 - Security Logging and Monitoring Failures
**Mitigación:** Logging centralizado en Docker, rotación de logs, monitoreo de errores.

## A10:2021 - Server-Side Request Forgery (SSRF)
**Mitigación:** Validación de URLs en servicios que hacen peticiones externas (ej. AI Service).
