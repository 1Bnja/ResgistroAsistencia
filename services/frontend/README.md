# Frontend - Sistema de Control de Asistencia con Reconocimiento Facial

Frontend React del sistema de control de asistencia que utiliza reconocimiento facial con IA.

## Características

- **Autenticación JWT**: Login seguro con tokens JWT
- **Dashboard en Tiempo Real**: Visualización de marcajes en tiempo real mediante WebSocket
- **Terminal de Marcaje**: Interfaz para captura facial y registro de asistencia
- **Panel de Administración**: Gestión de usuarios y horarios
- **Lista de Marcajes**: Filtros avanzados y exportación de datos
- **Responsive Design**: Adaptable a diferentes dispositivos
- **Notificaciones en Tiempo Real**: Alertas de nuevos marcajes y atrasos

## Tecnologías

- **React 18**: Framework principal
- **React Router 6**: Navegación y rutas
- **Axios**: Cliente HTTP para API REST
- **Socket.io Client**: Comunicación WebSocket en tiempo real
- **date-fns**: Manejo de fechas
- **React Icons**: Iconografía
- **Vite**: Build tool y dev server
- **Nginx**: Servidor web en producción

## Estructura del Proyecto

```
frontend/
├── public/
│   ├── index.html          # HTML principal
│   ├── health.html         # Endpoint de health check
│   └── favicon.svg         # Icono de la aplicación
├── src/
│   ├── components/         # Componentes reutilizables
│   │   ├── Navbar.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── Loader.jsx
│   │   └── Alert.jsx
│   ├── context/            # Context API
│   │   └── AuthContext.jsx
│   ├── pages/              # Páginas/Vistas
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── TerminalMarcaje.jsx
│   │   ├── Marcajes.jsx
│   │   ├── AdminUsuarios.jsx
│   │   └── AdminHorarios.jsx
│   ├── services/           # Servicios
│   │   ├── api.js         # Cliente API REST
│   │   └── websocket.js   # Cliente WebSocket
│   ├── App.jsx             # Componente principal y rutas
│   ├── main.jsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── Dockerfile              # Dockerfile multi-stage
├── nginx.conf              # Configuración Nginx
├── vite.config.js          # Configuración Vite
├── package.json            # Dependencias
└── README.md               # Este archivo
```

## Requisitos Previos

- Node.js 18+
- npm o yarn
- Docker (para producción)

## Instalación y Desarrollo

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus configuraciones:

```env
VITE_API_URL=http://localhost/api/v1
VITE_WS_URL=http://localhost
VITE_ENV=development
```

### 3. Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 4. Build para producción

```bash
npm run build
```

Los archivos estáticos se generarán en `dist/`

### 5. Preview del build

```bash
npm run preview
```

## Uso con Docker

### Build de la imagen

```bash
docker build -t asistencia-frontend:latest .
```

### Ejecutar contenedor

```bash
docker run -d \
  --name frontend \
  -p 80:80 \
  -e VITE_API_URL=http://api-gateway/api/v1 \
  asistencia-frontend:latest
```

### Con Docker Compose

Ya está incluido en el `docker-compose.yml` principal del proyecto.

```bash
# Desde la raíz del proyecto
docker-compose up -d frontend
```

## Rutas de la Aplicación

### Públicas

- `/login` - Página de inicio de sesión

### Protegidas (requieren autenticación)

- `/` - Dashboard principal con estadísticas y marcajes en tiempo real
- `/terminal` - Terminal de marcaje con reconocimiento facial
- `/marcajes` - Lista completa de marcajes con filtros

### Admin (requieren rol admin)

- `/admin/usuarios` - Gestión de usuarios (CRUD)
- `/admin/horarios` - Gestión de horarios (CRUD)

## Características Principales

### 1. Autenticación

El sistema utiliza JWT para autenticación. El token se almacena en localStorage y se incluye automáticamente en todas las peticiones a la API.

```javascript
// Login
const { login } = useAuth();
await login(email, password);

// Logout
const { logout } = useAuth();
logout();
```

### 2. Dashboard en Tiempo Real

El dashboard se conecta vía WebSocket para recibir actualizaciones en tiempo real:

- Nuevos marcajes
- Alertas de atrasos
- Estadísticas actualizadas

### 3. Terminal de Marcaje

Flujo del terminal:
1. Activar cámara
2. Capturar foto del usuario
3. Enviar al servicio de IA para reconocimiento facial
4. Registrar marcaje automáticamente
5. Mostrar resultado (puntual/atraso)

### 4. Panel de Administración

Los administradores pueden:
- Crear, editar y eliminar usuarios
- Asignar horarios a usuarios
- Configurar horarios de trabajo
- Ver todos los marcajes del sistema

## API Endpoints Utilizados

### Autenticación

- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/me` - Obtener perfil

### Usuarios

- `GET /api/v1/usuarios` - Listar usuarios
- `POST /api/v1/usuarios` - Crear usuario
- `PUT /api/v1/usuarios/:id` - Actualizar usuario
- `DELETE /api/v1/usuarios/:id` - Eliminar usuario

### Marcajes

- `GET /api/v1/marcajes` - Listar marcajes
- `GET /api/v1/marcajes/hoy` - Marcajes de hoy
- `POST /api/v1/marcajes/registrar` - Registrar marcaje
- `GET /api/v1/marcajes/estadisticas` - Estadísticas

### Horarios

- `GET /api/v1/horarios` - Listar horarios
- `POST /api/v1/horarios` - Crear horario
- `PUT /api/v1/horarios/:id` - Actualizar horario
- `DELETE /api/v1/horarios/:id` - Eliminar horario

### Reconocimiento Facial

- `POST /api/v1/facial/recognize` - Reconocer rostro

## WebSocket Events

### Eventos del Servidor

- `nuevo-marcaje` - Se emite cuando hay un nuevo marcaje
- `atraso-detectado` - Se emite cuando se detecta un atraso
- `usuario-actualizado` - Se emite cuando se actualiza un usuario

### Suscripción a eventos

```javascript
import websocketService from './services/websocket';

// Conectar
websocketService.connect();

// Escuchar eventos
const unsubscribe = websocketService.on('nuevo-marcaje', (data) => {
  console.log('Nuevo marcaje:', data);
});

// Limpiar suscripción
unsubscribe();
```

## Optimizaciones

### Dockerfile Multi-Stage

El Dockerfile utiliza multi-stage build para:
- Reducir el tamaño de la imagen final
- Separar dependencias de desarrollo y producción
- Optimizar el tiempo de build

### Nginx

Configuración optimizada con:
- Compresión gzip
- Cache de archivos estáticos
- Proxy a API backend
- Soporte para WebSocket
- Headers de seguridad

### Vite

Build optimizado con:
- Tree shaking
- Code splitting
- Minificación
- Hot Module Replacement (HMR) en desarrollo

## Seguridad

- HTTPS recomendado en producción
- Tokens JWT con expiración
- Sanitización de inputs
- Headers de seguridad en Nginx
- No ejecución como root en contenedor
- Variables sensibles en .env (no commiteadas)

## Health Check

El contenedor expone un endpoint de health check en `/health.html` que retorna HTTP 200 si el servicio está operativo.

```bash
curl http://localhost/health.html
```

## Troubleshooting

### La cámara no funciona

- Verifica permisos del navegador
- Requiere HTTPS o localhost
- Verifica que el dispositivo tenga cámara

### No se conecta al WebSocket

- Verifica que el servicio websocket esté corriendo
- Verifica la configuración de VITE_WS_URL
- Revisa logs del navegador

### Error de autenticación

- Verifica que el backend esté corriendo
- Verifica VITE_API_URL
- Limpia localStorage y vuelve a iniciar sesión

## Desarrollo

### Agregar nueva página

1. Crear componente en `src/pages/`
2. Agregar ruta en `src/App.jsx`
3. Agregar link en `src/components/Navbar.jsx`

### Agregar nuevo endpoint

1. Agregar función en `src/services/api.js`
2. Usar en componente con async/await

### Agregar estilos

Los estilos están en `src/index.css`. Usa las variables CSS definidas en `:root` para mantener consistencia.

## Licencia

Este proyecto es parte de un proyecto académico de la Universidad de Talca.

## Autores

- Benjamin Navarro
- Sebastián Retamal
- Gastón Villanueva

---

Universidad de Talca - Administración de Redes - 2025
