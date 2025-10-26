const express = require('express');
const router = express.Router();
const {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  login
} = require('../controllers/usuarioController');

const { protect, authorize } = require('../middleware/auth');

// Rutas públicas
router.post('/login', login);

// Rutas protegidas
router.use(protect); // Todas las rutas debajo requieren autenticación

router.get('/', getUsuarios);
router.get('/:id', getUsuarioById);

// Solo admin puede crear, actualizar, eliminar
router.post('/', authorize('admin', 'superadmin'), createUsuario);
router.put('/:id', authorize('admin', 'superadmin'), updateUsuario);
router.delete('/:id', authorize('admin', 'superadmin'), deleteUsuario);

module.exports = router;