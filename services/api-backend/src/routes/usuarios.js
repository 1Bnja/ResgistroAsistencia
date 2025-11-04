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

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
router.use(protect);

router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);
router.post('/', authorize('admin', 'superadmin'), createUsuario);
router.put('/:id', authorize('admin', 'superadmin'), updateUsuario);
router.delete('/:id', authorize('admin', 'superadmin'), deleteUsuario);

// Reconocimiento facial
router.post('/:id/entrenar-facial', authorize('admin', 'superadmin'), entrenarReconocimientoFacial);
router.get('/:id/estado-facial', getEstadoReconocimiento);

module.exports = router;