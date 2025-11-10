const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

/**
 * Rutas de exportación
 */

// Health check
router.get('/health', exportController.health);

// Exportar todos los marcajes
// Ejemplo: GET /api/export/marcajes/excel?fechaInicio=2024-11-01&fechaFin=2024-11-30
router.get('/marcajes/excel', exportController.exportarMarcajes);

// Exportar asistencia de un usuario específico
// Ejemplo: GET /api/export/usuario/673e0e9db09f0e2b9ae8f3c4/excel?fechaInicio=2024-11-01
router.get('/usuario/:usuarioId/excel', exportController.exportarPorUsuario);

module.exports = router;
