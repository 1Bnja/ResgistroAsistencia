const express = require('express');
const router = express.Router();
const establecimientoController = require('../controllers/establecimientoController');
const { protect, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación y rol de superadmin
router.use(protect);
router.use(authorize('superadmin'));

// CRUD de establecimientos (solo superadmin)
router.get('/', establecimientoController.getEstablecimientos);
router.get('/:id', establecimientoController.getEstablecimientoById);
router.post('/', establecimientoController.createEstablecimiento);
router.put('/:id', establecimientoController.updateEstablecimiento);
router.delete('/:id', establecimientoController.deleteEstablecimiento);
router.get('/:id/usuarios', establecimientoController.getUsuariosPorEstablecimiento);

module.exports = router;
