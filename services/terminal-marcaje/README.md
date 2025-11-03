# Terminal de Marcaje - Control de Asistencia

Interfaz dedicada para que los empleados registren su asistencia mediante reconocimiento facial.

## Características

- ✅ Interfaz simple y enfocada para marcaje de entrada/salida
- 📷 Captura facial en tiempo real usando la cámara web
- 🔄 Conexión en tiempo real vía WebSocket
- 📊 Notificación instantánea al dashboard del administrador
- ⚡ Detección automática de atrasos
- 🎨 Interfaz moderna y responsive

## Estructura

```
terminal-marcaje/
├── src/
│   ├── components/
│   │   ├── TerminalMarcaje.jsx    # Componente principal
│   │   ├── CameraCapture.jsx      # Captura de cámara
│   │   └── MarcajeSuccess.jsx     # Pantalla de éxito
│   ├── services/
│   │   ├── api.js                 # Cliente API
│   │   └── websocket.js           # Cliente WebSocket
│   ├── App.jsx
│   └── main.jsx
├── Dockerfile
├── package.json
└── vite.config.js
```

## Flujo de Marcaje

1. **Selección de tipo**: El empleado selecciona "Entrada" o "Salida"
2. **Captura facial**: Se activa la cámara y se captura el rostro
3. **Reconocimiento**: La imagen se envía al servicio de IA para identificación
4. **Registro**: Se crea el marcaje en la base de datos
5. **Notificación**: Se envía evento WebSocket al dashboard
6. **Confirmación**: Se muestra resultado al empleado

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

## Variables de Entorno

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3002
```

## Uso con Docker

```bash
# Construir imagen
docker build -t terminal-marcaje .

# Ejecutar contenedor
docker run -p 5174:80 terminal-marcaje
```

## Integración con el Sistema

El terminal se comunica con:

- **API Backend** (puerto 3000): Para registrar marcajes
- **WebSocket Service** (puerto 3002): Para notificaciones en tiempo real
- **AI Service**: Para reconocimiento facial (próximamente)

## Eventos WebSocket

### Emitidos por el Terminal

- `nuevo-marcaje`: Cuando se registra un nuevo marcaje
  ```javascript
  {
    marcaje: {...},
    usuario: {...},
    tipo: 'entrada' | 'salida',
    estado: 'puntual' | 'atraso' | 'anticipado'
  }
  ```

### Recibidos por el Dashboard

- `nuevo-marcaje`: Actualiza la lista de marcajes
- `atraso-detectado`: Muestra alerta de atraso

## Próximas Mejoras

- [ ] Integración completa con servicio de IA
- [ ] Modo offline con sincronización automática
- [ ] Soporte multi-idioma
- [ ] Modo oscuro
- [ ] Estadísticas de uso del terminal
