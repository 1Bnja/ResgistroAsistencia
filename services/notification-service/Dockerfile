# notification service dockerfile

FROM node:18-alpine AS base

LABEL maintainer="Universidad de Talca - Administración de Redes"
LABEL description="Servicio de Notificaciones - Sistema de Asistencia"
LABEL version="1.0.0"

# Instalar dependencias del sistema
RUN apk add --no-cache \
    tzdata \
    && cp /usr/share/zoneinfo/America/Santiago /etc/localtime \
    && echo "America/Santiago" > /etc/timezone


WORKDIR /app

FROM base AS dependencies

# Copiar package files
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production --ignore-scripts

# Instalar dependencias de desarrollo (para build si es necesario)
RUN npm ci --ignore-scripts

# Production
FROM base AS production

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3002

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copiar dependencias de producción
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

#código fuente node
COPY --chown=nodejs:nodejs . .

# directorio para logs
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]
