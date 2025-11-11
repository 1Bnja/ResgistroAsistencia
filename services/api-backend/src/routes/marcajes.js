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
const { cache, invalidateByTags } = require('../middleware/cache');

// Rutas públicas para terminales (invalidan cache por tags - ultrarrápido)
router.post('/registrar', invalidateByTags(['marcajes', 'estadisticas']), registrarMarcaje);
router.post('/reconocimiento', invalidateByTags(['marcajes', 'estadisticas']), registrarMarcajeReconocimiento);
router.post('/credenciales', invalidateByTags(['marcajes', 'estadisticas']), registrarMarcajeConCredenciales);

// Rutas protegidas
router.use(protect);

// GET con cache usando tags (30s para marcajes, 60s para estadísticas)
router.get('/', cache(30, { tags: ['marcajes'] }), getMarcajes);
router.get('/hoy', cache(30, { tags: ['marcajes'] }), getMarcajesHoy);
router.get('/estadisticas', authorize('admin', 'superadmin'), cache(60, { tags: ['estadisticas'] }), getEstadisticas);

module.exports = router;