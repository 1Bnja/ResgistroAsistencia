const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  login,
  entrenarReconocimientoFacial,
  getEstadoReconocimiento,
  getSyncEncodings
} = require('../controllers/usuarioController');

const { protect, authorize } = require('../middleware/auth');
const { cache, invalidateByTags } = require('../middleware/cache');

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
router.use(protect);

// GET con cache usando tags (mucho más eficiente)
// 60s para lista, 120s para usuario individual
router.get('/', cache(60, { tags: ['usuarios'] }), getUsuarios);
router.get('/:id', cache(120, { tags: ['usuarios'] }), getUsuarioById);

// POST/PUT/DELETE invalidan cache por tags (ultrarrápido, no bloquea)
router.post('/', authorize('admin', 'superadmin'), invalidateByTags(['usuarios']), createUsuario);
router.put('/:id', authorize('admin', 'superadmin'), invalidateByTags(['usuarios']), updateUsuario);
router.delete('/:id', authorize('admin', 'superadmin'), invalidateByTags(['usuarios']), deleteUsuario);

// Reconocimiento facial (invalidar cache al entrenar)
router.post('/:id/entrenar-facial', authorize('admin', 'superadmin'), invalidateByTags(['usuarios']), entrenarReconocimientoFacial);
router.get('/:id/estado-facial', cache(60, { tags: ['usuarios'] }), getEstadoReconocimiento);

module.exports = router;