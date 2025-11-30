# Matriz de Riesgos

| ID | Riesgo | Probabilidad | Impacto | Nivel | Mitigación |
|----|--------|--------------|---------|-------|------------|
| R01 | Acceso no autorizado a la BD | Baja | Alto | Medio | Uso de MongoDB Atlas con IP Whitelist y credenciales fuertes. |
| R02 | Ataque de Fuerza Bruta (Login) | Media | Medio | Medio | Implementación de Rate Limiting en HAProxy. |
| R03 | Exposición de Secretos (Git) | Baja | Alto | Medio | Uso de `.env` y `.gitignore`. Script de rotación. |
| R04 | Inyección SQL/NoSQL | Baja | Alto | Medio | Uso de ORM/ODM (Mongoose) y validación de entradas. |
| R05 | Ataque XSS | Media | Medio | Medio | Headers de seguridad (CSP, X-XSS-Protection) en HAProxy. |
| R06 | Denegación de Servicio (DoS) | Baja | Alto | Medio | Rate Limiting y Cloudflare. |
| R07 | Vulnerabilidades en Dependencias | Media | Medio | Medio | Escaneo periódico con Trivy. |
| R08 | Pérdida de Datos | Baja | Alto | Medio | Backups automáticos diarios. |
