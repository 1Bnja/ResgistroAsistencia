// ==========================================
// SERVIDOR EXPRESS - NOTIFICATION SERVICE
// Sistema de Control de Asistencia - UTalca
// ==========================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const logger = require('./config/logger.config');
const notificationRoutes = require('./routes/notificationRoutes');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3002;

// ==========================================
// MIDDLEWARES
// ==========================================

// Helmet para seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan para logs HTTP
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Log de todas las peticiones
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ==========================================
// RUTAS
// ==========================================

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio de Notificaciones - Sistema de Asistencia UTalca',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/notifications/health',
      test: '/api/notifications/test',
      registro: 'POST /api/notifications/registro',
      atraso: 'POST /api/notifications/atraso',
      ausente: 'POST /api/notifications/ausente'
    },
    documentation: 'https://github.com/tu-repo/notification-service'
  });
});

// Health check simple
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Ruta no encontrada
app.use((req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  logger.info('╔════════════════════════════════════════════════╗');
  logger.info('║                                                ║');
  logger.info('║   SERVICIO DE NOTIFICACIONES INICIADO         ║');
  logger.info('║   Sistema de Control de Asistencia            ║');
  logger.info('║   Universidad de Talca                         ║');
  logger.info('║                                                ║');
  logger.info('╚════════════════════════════════════════════════╝');
  logger.info('');
  logger.info(`🚀 Servidor escuchando en puerto ${PORT}`);
  logger.info(`📧 Email: ${process.env.SMTP_USER}`);
  logger.info(`📬 Admin: ${process.env.ADMIN_EMAIL}`);
  logger.info(`🌐 Ambiente: ${process.env.NODE_ENV}`);
  logger.info('');
  logger.info('Endpoints disponibles:');
  logger.info(`  GET  http://localhost:${PORT}/`);
  logger.info(`  GET  http://localhost:${PORT}/health`);
  logger.info(`  GET  http://localhost:${PORT}/api/notifications/health`);
  logger.info(`  GET  http://localhost:${PORT}/api/notifications/test`);
  logger.info(`  POST http://localhost:${PORT}/api/notifications/registro`);
  logger.info(`  POST http://localhost:${PORT}/api/notifications/atraso`);
  logger.info(`  POST http://localhost:${PORT}/api/notifications/ausente`);
  logger.info('');
  logger.info('✅ Servicio listo para recibir peticiones');
  logger.info('');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise });
  process.exit(1);
});

module.exports = app;
