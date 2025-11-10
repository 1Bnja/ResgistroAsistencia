require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./utils/logger');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Rutas
app.use('/api/export', exportRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Export Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/export/health',
      exportAll: 'GET /api/export/marcajes/excel',
      exportUser: 'GET /api/export/usuario/:usuarioId/excel'
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  logger.error('Error no manejado', {
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/asistencia_db';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('✅ Conectado a MongoDB', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  } catch (error) {
    logger.error('❌ Error al conectar a MongoDB', {
      error: error.message
    });
    process.exit(1);
  }
};

// Iniciar servidor
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Servicio de Exportación iniciado`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor', {
      error: error.message
    });
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});

// Iniciar
startServer();
