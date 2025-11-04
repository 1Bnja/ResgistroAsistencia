const express = require('express');
const router = express.Router();
const {
  getHorarios,
  createHorario,
  updateHorario,
  deleteHorario
} = require('../controllers/horarioController');

const { protect, authorize } = require('../middleware/auth');

// Todas las rutas de horarios requieren autenticación
router.use(protect);

router.get('/', getHorarios);

// Solo admin puede crear, actualizar, eliminar
router.post('/', authorize('admin', 'superadmin'), createHorario);
router.put('/:id', authorize('admin', 'superadmin'), updateHorario);
router.delete('/:id', authorize('admin', 'superadmin'), deleteHorario);

module.exports = router;