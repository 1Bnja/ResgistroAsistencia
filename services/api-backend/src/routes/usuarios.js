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
const { cache, invalidateCache } = require('../middleware/cache');

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
router.use(protect);

// GET con cache (60s para lista, 120s para usuario individual)
router.get('/', cache(60), getUsuarios);
router.get('/:id', cache(120), getUsuarioById);

// POST/PUT/DELETE invalidan cache de usuarios
router.post('/', authorize('admin', 'superadmin'), invalidateCache('cache:*:usuarios*'), createUsuario);
router.put('/:id', authorize('admin', 'superadmin'), invalidateCache('cache:*:usuarios*'), updateUsuario);
router.delete('/:id', authorize('admin', 'superadmin'), invalidateCache('cache:*:usuarios*'), deleteUsuario);

// Reconocimiento facial (invalidar cache al entrenar)
router.post('/:id/entrenar-facial', authorize('admin', 'superadmin'), invalidateCache('cache:*:usuarios*'), entrenarReconocimientoFacial);
router.get('/:id/estado-facial', cache(60), getEstadoReconocimiento);

module.exports = router;