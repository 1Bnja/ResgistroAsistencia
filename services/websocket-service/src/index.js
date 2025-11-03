require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configurar CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Configurar Socket.IO
const io = new Server(server, {
  cors: corsOptions,
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Almacenar conexiones activas
const connections = new Map();
let connectionCount = 0;

// Eventos de Socket.IO
io.on('connection', (socket) => {
  connectionCount++;
  connections.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    type: 'unknown' // dashboard | terminal
  });

  console.log(`✅ Cliente conectado: ${socket.id} (Total: ${connectionCount})`);

  // Identificar tipo de cliente
  socket.on('identify', (data) => {
    const connection = connections.get(socket.id);
    if (connection) {
      connection.type = data.type;
      console.log(`📋 Cliente ${socket.id} identificado como: ${data.type}`);
    }
  });

  // Evento: Nuevo marcaje
  socket.on('nuevo-marcaje', (data) => {
    console.log('📍 Nuevo marcaje recibido:', {
      usuario: data.usuario?.nombre,
      tipo: data.tipo,
      estado: data.estado,
      hora: data.marcaje?.hora
    });

    // Broadcast a todos los clientes conectados (especialmente dashboards)
    socket.broadcast.emit('nuevo-marcaje', data);

    // Si es un atraso, emitir evento especial
    if (data.estado === 'atraso') {
      socket.broadcast.emit('atraso-detectado', {
        usuario: data.usuario,
        minutosAtraso: data.minutosAtraso,
        hora: data.marcaje?.hora,
        fecha: data.marcaje?.fecha
      });
    }
  });

  // Evento: Actualización de usuario
  socket.on('usuario-actualizado', (data) => {
    console.log('👤 Usuario actualizado:', data.usuarioId);
    socket.broadcast.emit('usuario-actualizado', data);
  });

  // Evento: Solicitar estadísticas
  socket.on('solicitar-estadisticas', () => {
    const stats = {
      conexiones: connectionCount,
      clientes: Array.from(connections.values()).map(c => ({
        id: c.id,
        type: c.type,
        connectedAt: c.connectedAt
      }))
    };
    socket.emit('estadisticas', stats);
  });

  // Desconexión
  socket.on('disconnect', (reason) => {
    connectionCount--;
    connections.delete(socket.id);
    console.log(`❌ Cliente desconectado: ${socket.id} (Razón: ${reason}) (Total: ${connectionCount})`);
  });

  // Manejo de errores
  socket.on('error', (error) => {
    console.error(`⚠️ Error en socket ${socket.id}:`, error);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'WebSocket service is running',
    connections: connectionCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Endpoint para obtener estadísticas
app.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalConnections: connectionCount,
      activeConnections: Array.from(connections.values()).map(c => ({
        id: c.id,
        type: c.type,
        connectedAt: c.connectedAt
      }))
    }
  });
});

// Endpoint para enviar eventos (útil para testing o integración con backend)
app.post('/emit', (req, res) => {
  const { event, data } = req.body;

  if (!event || !data) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere "event" y "data"'
    });
  }

  io.emit(event, data);
  console.log(`📤 Evento emitido: ${event}`);

  res.json({
    success: true,
    message: `Evento "${event}" emitido a ${connectionCount} clientes`
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`🚀 WebSocket Service corriendo en puerto ${PORT}`);
  console.log(`📍 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
