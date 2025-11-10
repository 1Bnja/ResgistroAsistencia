FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY src ./src

# Exponer puerto
EXPOSE 3003

# Usuario no privilegiado
USER node

# Comando de inicio
CMD ["node", "src/index.js"]
