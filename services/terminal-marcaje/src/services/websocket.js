import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const wsURL = import.meta.env.VITE_WS_URL || 'http://localhost:3002';

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
      this.emit('connect', { id: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket desconectado:', reason);
      this.emit('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión WebSocket:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Suscribirse a eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Emitir eventos a los listeners locales
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

const websocketService = new WebSocketService();

export default websocketService;
