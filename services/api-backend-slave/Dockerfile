FROM node:18-alpine

# Crear usuario no privilegiado
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force

# Copiar código fuente
COPY src/ ./src/
COPY scripts/ ./scripts/

# Dar permisos al usuario nodejs
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no privilegiado
USER nodejs

# Variables de entorno
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    IS_SLAVE=true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]