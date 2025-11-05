//endpoints de la API

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

/**
 * @route   POST /api/notifications/registro
 * @desc    Envía notificación de registro normal
 * @access  Public (debería ser privado en producción con API key)
 * @body    { usuario, marcaje, horario }
 */
router.post('/registro', notificationController.enviarRegistro);

/**
 * @route   POST /api/notifications/atraso
 * @desc    Envía notificación de atraso
 * @access  Public (debería ser privado en producción con API key)
 * @body    { usuario, marcaje, horario }
 */
router.post('/atraso', notificationController.enviarAtraso);

/**
 * @route   POST /api/notifications/ausente
 * @desc    Envía notificación de ausencia
 * @access  Public (debería ser privado en producción con API key)
 * @body    { usuario, marcaje, horario }
 */
router.post('/ausente', notificationController.enviarAusente);

/**
 * @route   GET /api/notifications/test
 * @desc    Envía correo de prueba
 * @access  Public
 * @query   ?to=email@ejemplo.com (opcional)
 */
router.get('/test', notificationController.enviarPrueba);

/**
 * @route   GET /api/notifications/health
 * @desc    Health check del servicio
 * @access  Public
 */
router.get('/health', notificationController.healthCheck);

module.exports = router;
