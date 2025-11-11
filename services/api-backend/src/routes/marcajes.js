const express = require('express');
const router = express.Router();
const {
  registrarMarcaje,
  registrarMarcajeReconocimiento,
  registrarMarcajeConCredenciales,
  getMarcajes,
  getMarcajesHoy,
  getEstadisticas
} = require('../controllers/marcajeController');

const { protect, authorize } = require('../middleware/auth');

// Rutas públicas para terminales
router.post('/registrar', registrarMarcaje);
router.post('/reconocimiento', registrarMarcajeReconocimiento);
router.post('/credenciales', registrarMarcajeConCredenciales);

// Rutas protegidas
router.use(protect);

// Rutas GET
router.get('/', getMarcajes);
router.get('/hoy', getMarcajesHoy);
router.get('/estadisticas', authorize('admin', 'superadmin'), getEstadisticas);

module.exports = router;