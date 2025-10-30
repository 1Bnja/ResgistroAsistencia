require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const slaveGuard = require('./middleware/slaveGuard');

// Importar rutas
const usuariosRoutes = require('./routes/usuarios');
const marcajesRoutes = require('./routes/marcajes');
const horariosRoutes = require('./routes/horarios');

const app = express();

// Conectar a base de datos
connectDB();

// Middlewares
app.use(helmet()); // Seguridad
app.use(cors()); // CORS
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // JSON body parser
app.use(express.urlencoded({ extended: true }));

// Middleware que protege la instancia slave (read-only)
app.use(slaveGuard);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas API
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/usuarios`, usuariosRoutes);
app.use(`/api/${API_VERSION}/marcajes`, marcajesRoutes);
app.use(`/api/${API_VERSION}/horarios`, horariosRoutes);

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Error handler (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Modo: ${process.env.NODE_ENV}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});