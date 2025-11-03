# Guía: Terminal de Marcaje con WebSocket

Esta guía explica la nueva arquitectura del sistema de control de asistencia con el **Terminal de Marcaje** separado y conectado en tiempo real al Dashboard.

## Arquitectura del Sistema

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Terminal de    │────────▶│  API Backend     │────────▶│   Dashboard     │
│  Marcaje        │         │  (Node.js)       │         │   Admin         │
│  (React)        │         │                  │         │   (React)       │
│                 │         │                  │         │                 │
└────────┬────────┘         └────────┬─────────┘         └────────┬────────┘
         │                           │                            │
         │                           │                            │
         │              ┌────────────▼─────────────┐             │
         │              │                          │             │
         └─────────────▶│  WebSocket Service       │◀────────────┘
                        │  (Socket.IO - Node.js)   │
                        │                          │
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │                          │
                        │  MongoDB Database        │
                        │                          │
                        └──────────────────────────┘
```

## Flujo de Marcaje en Tiempo Real

1. **Empleado llega al terminal**
   - Abre la interfaz del Terminal de Marcaje
   - Selecciona "Entrada" o "Salida"

2. **Captura facial**
   - Se activa la cámara web
   - El empleado posiciona su rostro
   - Se captura la imagen

3. **Procesamiento**
   - Imagen se envía al API Backend
   - Backend llama al servicio de IA (reconocimiento facial)
   - Se identifica al usuario
   - Se registra el marcaje en MongoDB
   - Se calcula si hay atraso

4. **Notificación en tiempo real**
   - Terminal envía evento `nuevo-marcaje` al WebSocket Service
   - WebSocket Service hace broadcast a todos los clientes
   - Dashboard recibe el evento y actualiza la lista en tiempo real

5. **Confirmación**
   - Terminal muestra resultado al empleado
   - Dashboard muestra notificación si es necesario
   - Si hay atraso, se envía email al administrador

## Servicios Implementados

### 1. Terminal de Marcaje (`services/terminal-marcaje`)
- **Puerto**: 5174
- **Tecnología**: React + Vite
- **URL**: `http://localhost:5174`
- **Función**: Interfaz de marcaje para empleados

**Características:**
- ✅ UI simple enfocada en marcaje
- ✅ Captura de cámara en tiempo real
- ✅ Cuenta regresiva antes de capturar
- ✅ Feedback visual inmediato
- ✅ Auto-reset después de marcar
- ✅ Conexión WebSocket en tiempo real

### 2. WebSocket Service (`services/websocket-service`)
- **Puerto**: 3002
- **Tecnología**: Socket.IO + Express
- **URL**: `http://localhost:3002`
- **Función**: Comunicación en tiempo real

**Características:**
- ✅ Manejo de conexiones múltiples
- ✅ Broadcast de eventos
- ✅ Identificación de clientes
- ✅ Health checks
- ✅ API REST para estadísticas

### 3. API Backend (Existente)
- **Puerto**: 3000
- **Tecnología**: Express + MongoDB
- **Función**: Lógica de negocio y persistencia

### 4. Dashboard Admin (Existente)
- **Puerto**: 8080 (a través de nginx)
- **Tecnología**: React
- **Función**: Administración y monitoreo

## Instrucciones de Uso

### Instalación Inicial

```bash
# Clonar repositorio (ya lo tienes)
cd /Users/benja/Desktop/ResgistroAsistencia

# Instalar dependencias del Terminal de Marcaje
cd services/terminal-marcaje
npm install

# Instalar dependencias del WebSocket Service
cd ../websocket-service
npm install

# Volver al root
cd ../..
```

### Levantar con Docker Compose

```bash
# Construir y levantar todos los servicios
docker-compose up --build

# O en modo detached (segundo plano)
docker-compose up -d --build
```

### Levantar servicios individuales (desarrollo)

**Terminal de Marcaje:**
```bash
cd services/terminal-marcaje
npm run dev
# Abre: http://localhost:5174
```

**WebSocket Service:**
```bash
cd services/websocket-service
npm run dev
# Escucha en: http://localhost:3002
```

**API Backend:**
```bash
cd services/api-backend
npm run dev
# Escucha en: http://localhost:3000
```

**Dashboard:**
```bash
cd services/frontend
npm run dev
# Abre: http://localhost:5173 (o el puerto configurado)
```

## Verificación del Sistema

### 1. Verificar servicios corriendo

```bash
# Ver todos los contenedores
docker-compose ps

# Deberías ver:
# - api-backend
# - websocket-service
# - terminal-marcaje
# - frontend-1, frontend-2
# - mongodb (si está configurado)
```

### 2. Health Checks

```bash
# WebSocket Service
curl http://localhost:3002/health

# API Backend
curl http://localhost:3000/health

# Terminal de Marcaje (abre en navegador)
open http://localhost:5174
```

### 3. Verificar WebSocket

```bash
# Ver estadísticas de conexiones
curl http://localhost:3002/stats

# Emitir evento de prueba
curl -X POST http://localhost:3002/emit \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test-event",
    "data": {"message": "Prueba"}
  }'
```

## Prueba del Flujo Completo

### Paso 1: Abrir Dashboard y Terminal

1. **Dashboard Admin**: `http://localhost:8080` (o el puerto configurado)
   - Login como administrador
   - Ve a la sección de marcajes/asistencia

2. **Terminal de Marcaje**: `http://localhost:5174`
   - Debería mostrar la pantalla de bienvenida

### Paso 2: Verificar Conexión WebSocket

En ambas interfaces, deberías ver un indicador de conexión:
- 🟢 Verde = Conectado
- 🔴 Rojo = Desconectado

### Paso 3: Realizar un Marcaje

1. En el **Terminal de Marcaje**:
   - Click en "Entrada" o "Salida"
   - Permite acceso a la cámara
   - Posiciona tu rostro en el círculo
   - Click en "Capturar"
   - Espera cuenta regresiva (3, 2, 1)

2. En el **Dashboard**:
   - Deberías ver aparecer el nuevo marcaje **instantáneamente**
   - Si hay atraso, deberías ver una alerta/notificación

### Paso 4: Verificar en Base de Datos

```bash
# Conectar a MongoDB (si está en Docker)
docker exec -it <mongodb-container> mongosh

# Ver marcajes
use asistencia_db
db.marcajes.find().sort({fecha: -1}).limit(5)
```

## Variables de Entorno

### Terminal de Marcaje (`.env`)
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3002
```

### WebSocket Service (`.env`)
```env
PORT=3002
NODE_ENV=development
CORS_ORIGIN=*
```

### API Backend (`.env`)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/asistencia_db
# ... otras variables
```

## Troubleshooting

### Problema: WebSocket no conecta

**Solución:**
1. Verificar que el servicio esté corriendo: `docker ps | grep websocket`
2. Verificar logs: `docker logs websocket-service`
3. Verificar puerto: `lsof -i :3002`
4. Verificar CORS en el servicio WebSocket

### Problema: Terminal no captura imagen

**Solución:**
1. Verificar permisos de cámara en el navegador
2. Usar HTTPS o localhost (requerido por getUserMedia)
3. Revisar consola del navegador (F12)

### Problema: Marcaje no aparece en Dashboard

**Solución:**
1. Verificar que el Dashboard esté suscrito a eventos WebSocket
2. Revisar logs del backend: `docker logs api-backend`
3. Verificar que el marcaje se guardó en la BD
4. Verificar que el WebSocket Service está funcionando

### Problema: "Cannot find module"

**Solución:**
```bash
# Reinstalar dependencias
cd services/terminal-marcaje
rm -rf node_modules package-lock.json
npm install

# Lo mismo para websocket-service
cd ../websocket-service
rm -rf node_modules package-lock.json
npm install
```

## Próximos Pasos

### Integración con IA (Reconocimiento Facial)

Actualmente el terminal usa un `usuarioId` hardcodeado. Para integrar IA:

1. Implementar servicio de IA (Python + face_recognition)
2. Entrenar modelo con fotos de empleados
3. Actualizar `TerminalMarcaje.jsx`:

```javascript
// En handleImageCaptured
const recognitionResponse = await faceRecognitionService.recognizeFace(imageData);
const usuarioId = recognitionResponse.data.usuarioId;
```

### Mejoras Sugeridas

- [ ] Agregar autenticación a WebSocket
- [ ] Implementar modo offline en terminal
- [ ] Agregar métricas y logging
- [ ] Implementar rate limiting
- [ ] Agregar tests automatizados
- [ ] Configurar HTTPS/WSS para producción
- [ ] Agregar notificaciones push al dashboard
- [ ] Implementar historial de marcajes en terminal

## Recursos Adicionales

- **Socket.IO Docs**: https://socket.io/docs/v4/
- **React Camera Hook**: https://github.com/react-hook/use-media
- **Docker Compose Networking**: https://docs.docker.com/compose/networking/

## Soporte

Si tienes problemas o preguntas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica health checks de cada servicio
3. Consulta los README de cada servicio
4. Revisa la consola del navegador (F12)
