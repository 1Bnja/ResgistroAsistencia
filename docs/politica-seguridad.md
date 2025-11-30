# Política de Seguridad de la Información

## 1. Objetivo
Establecer los lineamientos para garantizar la confidencialidad, integridad y disponibilidad de la información del Sistema de Control de Asistencia.

## 2. Alcance
Esta política aplica a todos los usuarios, desarrolladores y administradores del sistema.

## 3. Responsabilidades
- **Administrador del Sistema**: Mantener la infraestructura segura, gestionar accesos y monitorear logs.
- **Desarrolladores**: Seguir prácticas de codificación segura (OWASP) y no exponer secretos.
- **Usuarios**: Mantener la confidencialidad de sus credenciales.

## 4. Control de Acceso
- El acceso a la base de datos está restringido a la red interna y a IPs autorizadas en MongoDB Atlas.
- El acceso administrativo requiere autenticación fuerte.
- Se aplica el principio de mínimo privilegio para todos los servicios.

## 5. Gestión de Logs
- Se registran eventos de seguridad (login fallido, errores críticos).
- Los logs se rotan automáticamente para evitar saturación.
- Revisión periódica de logs por parte del administrador.

## 6. Actualizaciones
- Se deben aplicar parches de seguridad a las imágenes Docker y dependencias periódicamente.
