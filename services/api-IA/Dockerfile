# 1. La base: Empezamos con una imagen oficial de Python
FROM python:3.10-slim

# 2. Instalar las dependencias de LINUX
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libboost-python-dev \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Configurar pip con timeout más largo
ENV PIP_DEFAULT_TIMEOUT=300

# 5. Instalar las bibliotecas de Python en pasos separados
COPY requirements.txt .

# Instalar dependencias base primero
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir numpy

# Instalar opencv-python-headless (más ligero, sin GUI)
RUN pip install --no-cache-dir opencv-python-headless

# Instalar el resto de dependencias
RUN pip install --no-cache-dir dlib face_recognition Flask flask-cors requests

# 6. Crear usuario no privilegiado
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 7. Copiar el resto de nuestro código
COPY . .

# 8. Dar permisos al usuario no privilegiado
RUN chown -R appuser:appuser /app

# 9. Cambiar a usuario no privilegiado
USER appuser

# 10. Exponer el puerto para nuestra aplicación web
EXPOSE 5000

# 11. El comando que se ejecutará cuando inicie el contenedor
CMD ["python", "reconocimiento.py"]
