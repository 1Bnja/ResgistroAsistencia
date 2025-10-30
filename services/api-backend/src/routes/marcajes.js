const express = require('express');
const router = express.Router();
const {
  registrarMarcaje,
  getMarcajes,
  getMarcajesHoy,
  getEstadisticas
} = require('../controllers/marcajeController');

const { protect, authorize } = require('../middleware/auth');

// Ruta pública para el terminal
router.post('/registrar', registrarMarcaje);

// Rutas protegidas
router.use(protect);

router.get('/', getMarcajes);
router.get('/hoy', getMarcajesHoy);
router.get('/estadisticas', authorize('admin', 'superadmin'), getEstadisticas);

module.exports = router;