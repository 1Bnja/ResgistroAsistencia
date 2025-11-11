# Multi-stage build para optimizar el tamaño de la imagen

# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (necesarias para build)
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:1.25-alpine

# Crear usuario no privilegiado
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos estáticos desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear directorios necesarios con permisos
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx

# Modificar nginx.conf para usar puerto no privilegiado (se hará en nginx.conf)
# Cambiar PID file location
RUN touch /var/run/nginx.pid && \
    chown nginx-user:nginx-user /var/run/nginx.pid

# Cambiar a usuario no privilegiado
USER nginx-user

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health.html || exit 1

# Exponer puerto no privilegiado
EXPOSE 8080

# Metadata
LABEL maintainer="Sistema de Asistencia" \
      version="1.0" \
      description="Frontend React para control de asistencia"

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
