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
const { cache, invalidateCache } = require('../middleware/cache');

// Rutas públicas para terminales (invalidan cache al crear marcaje)
router.post('/registrar', invalidateCache(['cache:*:marcajes*', 'cache:*:estadisticas*']), registrarMarcaje);
router.post('/reconocimiento', invalidateCache(['cache:*:marcajes*', 'cache:*:estadisticas*']), registrarMarcajeReconocimiento);
router.post('/credenciales', invalidateCache(['cache:*:marcajes*', 'cache:*:estadisticas*']), registrarMarcajeConCredenciales);

// Rutas protegidas
router.use(protect);

// GET con cache (30s para marcajes, 60s para estadísticas)
router.get('/', cache(30), getMarcajes);
router.get('/hoy', cache(30), getMarcajesHoy);
router.get('/estadisticas', authorize('admin', 'superadmin'), cache(60), getEstadisticas);

module.exports = router;