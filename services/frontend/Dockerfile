# Multi-stage build para optimizar el tamaño de la imagen

# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Etapa 2: Producción con Nginx
FROM nginx:1.25-alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos estáticos desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear usuario no privilegiado
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-app -g nginx-app nginx-app && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health.html || exit 1

# Cambiar a usuario no privilegiado
USER nginx-app

# Exponer puerto
EXPOSE 80

# Metadata
LABEL maintainer="Sistema de Asistencia" \
      version="1.0" \
      description="Frontend React para control de asistencia"

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
