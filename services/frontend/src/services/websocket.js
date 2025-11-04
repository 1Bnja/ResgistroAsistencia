import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    // ⚠️ WebSocket DESHABILITADO - El servicio no está disponible
    console.warn('⚠️ WebSocket deshabilitado: El servicio de notificaciones en tiempo real no está disponible');
    return;
    
    /* CÓDIGO DESHABILITADO - Para habilitar, elimina el return de arriba
    if (this.socket?.connected) {
      return;
    }

    const wsURL = import.meta.env.VITE_WS_URL || window.location.origin;

    this.socket = io(wsURL, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket conectado:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error);
    });

    // Escuchar eventos del servidor
    this.socket.on('nuevo-marcaje', (data) => {
      this.emit('nuevo-marcaje', data);
    });

    this.socket.on('atraso-detectado', (data) => {
      this.emit('atraso-detectado', data);
    });

    this.socket.on('usuario-actualizado', (data) => {
      this.emit('usuario-actualizado', data);
    });
    */
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Método para suscribirse a eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Retornar función para cancelar suscripción
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Método para emitir eventos a los listeners
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Enviar evento al servidor
  send(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.error('WebSocket no está conectado');
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Singleton
const websocketService = new WebSocketService();

export default websocketService;
