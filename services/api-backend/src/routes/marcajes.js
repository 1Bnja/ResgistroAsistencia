const express = require('express');
const router = express.Router();
const {
  registrarMarcaje,
  registrarMarcajeReconocimiento,
  getMarcajes,
  getMarcajesHoy,
  getEstadisticas
} = require('../controllers/marcajeController');

const { protect, authorize } = require('../middleware/auth');

// Rutas públicas para terminales
router.post('/registrar', registrarMarcaje);
router.post('/reconocimiento', registrarMarcajeReconocimiento);

// Rutas protegidas
router.use(protect);

router.get('/', getMarcajes);
router.get('/hoy', getMarcajesHoy);
router.get('/estadisticas', authorize('admin', 'superadmin'), getEstadisticas);

module.exports = router;