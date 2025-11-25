# Build stage
FROM node:20-alpine AS builder

# Argumentos para build time
ARG VITE_API_URL
ARG VITE_WS_URL

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pasar las variables de entorno a Vite durante el build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Production stage
FROM nginx:alpine

# Crear usuario no privilegiado
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user

# Copiar build de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración de Nginx para puerto no privilegiado
RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Crear directorios necesarios con permisos
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx-user:nginx-user /var/run/nginx.pid

# Cambiar a usuario no privilegiado
USER nginx-user

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
