# WebSocket Service - Control de Asistencia

Servicio de WebSocket en tiempo real para sincronización entre el terminal de marcaje y el dashboard del administrador.

## Características

- 🔄 Comunicación bidireccional en tiempo real
- 📡 Soporte para múltiples clientes simultáneos
- 🔍 Identificación de tipo de cliente (dashboard/terminal)
- 📊 Endpoints de estadísticas y health check
- ⚡ Reconexión automática
- 🛡️ CORS configurado

## Eventos

### Eventos del Cliente → Servidor

#### `identify`
Identifica el tipo de cliente conectado.

**Payload:**
```javascript
{
  type: 'dashboard' | 'terminal'
}
```

#### `nuevo-marcaje`
Envía información de un nuevo marcaje.

**Payload:**
```javascript
{
  marcaje: {
    _id: string,
    hora: string,
    fecha: Date,
    tipo: 'entrada' | 'salida',
    estado: 'puntual' | 'atraso' | 'anticipado'
  },
  usuario: {
    nombre: string,
    apellido: string,
    cargo: string
  },
  tipo: 'entrada' | 'salida',
  estado: string,
  minutosAtraso?: number
}
```

#### `usuario-actualizado`
Notifica cambios en información de usuario.

**Payload:**
```javascript
{
  usuarioId: string,
  campos: Object
}
```

#### `solicitar-estadisticas`
Solicita estadísticas del servidor.

**Sin payload**

### Eventos del Servidor → Cliente

#### `connect`
Confirmación de conexión establecida.

#### `nuevo-marcaje`
Broadcast de nuevo marcaje a todos los clientes.

#### `atraso-detectado`
Notificación especial de atraso detectado.

**Payload:**
```javascript
{
  usuario: Object,
  minutosAtraso: number,
  hora: string,
  fecha: Date
}
```

#### `usuario-actualizado`
Broadcast de actualización de usuario.

#### `estadisticas`
Respuesta con estadísticas del servidor.

**Payload:**
```javascript
{
  conexiones: number,
  clientes: Array<{
    id: string,
    type: string,
    connectedAt: Date
  }>
}
```

## Endpoints HTTP

### `GET /health`
Health check del servicio.

**Respuesta:**
```json
{
  "success": true,
  "message": "WebSocket service is running",
  "connections": 5,
  "uptime": 123.45,
  "timestamp": "2025-11-03T..."
}
```

### `GET /stats`
Estadísticas del servicio.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "activeConnections": [...]
  }
}
```

### `POST /emit`
Emite un evento a todos los clientes (útil para testing).

**Request:**
```json
{
  "event": "test-event",
  "data": {...}
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Evento emitido a N clientes"
}
```

## Configuración

### Variables de Entorno

```env
PORT=3002
NODE_ENV=development
CORS_ORIGIN=*
```

### Docker

```bash
# Construir
docker build -t websocket-service .

# Ejecutar
docker run -p 3002:3002 websocket-service
```

## Uso desde Cliente

### JavaScript/React

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002', {
  path: '/socket.io/',
  transports: ['websocket', 'polling']
});

// Conectar
socket.on('connect', () => {
  console.log('Conectado:', socket.id);

  // Identificarse
  socket.emit('identify', { type: 'dashboard' });
});

// Escuchar eventos
socket.on('nuevo-marcaje', (data) => {
  console.log('Nuevo marcaje:', data);
});

// Enviar eventos
socket.emit('nuevo-marcaje', {
  marcaje: {...},
  usuario: {...}
});
```

## Monitoreo

```bash
# Ver logs en tiempo real
docker logs -f websocket-service

# Verificar salud
curl http://localhost:3002/health

# Ver estadísticas
curl http://localhost:3002/stats

# Emitir evento de prueba
curl -X POST http://localhost:3002/emit \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {"message": "Hello"}}'
```

## Seguridad

- ✅ CORS configurado
- ✅ Timeouts de ping/pong
- ✅ Reconexión automática
- ✅ Health checks
- ⚠️ No autenticación (agregar en producción)
- ⚠️ No encriptación (usar WSS en producción)

## Troubleshooting

### El cliente no se conecta

1. Verificar que el puerto 3002 esté expuesto
2. Verificar configuración de CORS
3. Revisar logs del servidor: `docker logs websocket-service`

### Eventos no se reciben

1. Verificar que el cliente se identificó correctamente
2. Revisar que el evento esté siendo emitido
3. Verificar que el cliente esté suscrito al evento correcto
