// ==========================================
// CONTROLADOR DE NOTIFICACIONES
// Maneja las peticiones HTTP para notificaciones
// ==========================================

const emailService = require('../services/emailService');
const logger = require('../config/logger.config');

/**
 * Envía notificación de registro normal
 * POST /api/notifications/registro
 */
async function enviarRegistro(req, res) {
  try {
    const { usuario, marcaje, horario } = req.body;
    
    // Validar datos requeridos
    if (!usuario || !marcaje) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (usuario, marcaje)'
      });
    }
    
    // Preparar datos para el email
    const emailData = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rut: usuario.rut || 'No especificado',
      email: usuario.email || 'No especificado',
      tipo: marcaje.tipo || 'Entrada',
      fecha: marcaje.fecha,
      hora: marcaje.hora,
      estado: marcaje.estado || 'PUNTUAL',
      ubicacion: marcaje.ubicacion || 'Terminal Principal'
    };
    
    // Enviar correo
    const result = await emailService.enviarNotificacionRegistro(emailData);
    
    logger.info('Notificación de registro enviada', {
      usuario: `${usuario.nombre} ${usuario.apellido}`,
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Notificación de registro enviada correctamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    logger.error('Error en enviarRegistro:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de registro',
      error: error.message
    });
  }
}

/**
 * Envía notificación de atraso
 * POST /api/notifications/atraso
 */
async function enviarAtraso(req, res) {
  try {
    const { usuario, marcaje, horario } = req.body;
    
    // Validar datos requeridos
    if (!usuario || !marcaje || !horario) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (usuario, marcaje, horario)'
      });
    }
    
    // Validar que tenga minutos de atraso
    if (!marcaje.minutosAtraso || marcaje.minutosAtraso <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Los minutos de atraso deben ser mayores a 0'
      });
    }
    
    // Preparar datos para el email
    const emailData = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rut: usuario.rut || 'No especificado',
      email: usuario.email || 'No especificado',
      tipo: marcaje.tipo || 'Entrada',
      fecha: marcaje.fecha,
      hora: marcaje.hora,
      horaEsperada: horario.horaEntrada,
      minutosAtraso: marcaje.minutosAtraso,
      tolerancia: horario.tolerancia || 0,
      ubicacion: marcaje.ubicacion || 'Terminal Principal'
    };
    
    // Enviar correo
    const result = await emailService.enviarNotificacionAtraso(emailData);
    
    logger.info('Notificación de atraso enviada', {
      usuario: `${usuario.nombre} ${usuario.apellido}`,
      minutosAtraso: marcaje.minutosAtraso,
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Notificación de atraso enviada correctamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    logger.error('Error en enviarAtraso:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de atraso',
      error: error.message
    });
  }
}

/**
 * Envía notificación de ausencia
 * POST /api/notifications/ausente
 */
async function enviarAusente(req, res) {
  try {
    const { usuario, marcaje, horario } = req.body;
    
    // Validar datos requeridos
    if (!usuario || !marcaje || !horario) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (usuario, marcaje, horario)'
      });
    }
    
    // Validar que tenga minutos de atraso
    if (!marcaje.minutosAtraso || marcaje.minutosAtraso <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Los minutos de atraso deben ser mayores a 0'
      });
    }
    
    // Preparar datos para el email
    const emailData = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rut: usuario.rut || 'No especificado',
      email: usuario.email || 'No especificado',
      tipo: marcaje.tipo || 'Entrada',
      fecha: marcaje.fecha,
      hora: marcaje.hora,
      horaEsperada: horario.horaEntrada,
      minutosAtraso: marcaje.minutosAtraso,
      limiteAtraso: marcaje.limiteAtraso || parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30,
      tolerancia: horario.tolerancia || 0,
      ubicacion: marcaje.ubicacion || 'Terminal Principal'
    };
    
    // Enviar correo
    const result = await emailService.enviarNotificacionAusente(emailData);
    
    logger.info('Notificación de ausencia enviada', {
      usuario: `${usuario.nombre} ${usuario.apellido}`,
      minutosAtraso: marcaje.minutosAtraso,
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Notificación de ausencia enviada correctamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    logger.error('Error en enviarAusente:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de ausencia',
      error: error.message
    });
  }
}

/**
 * Envía correo de prueba
 * GET /api/notifications/test
 */
async function enviarPrueba(req, res) {
  try {
    const { to } = req.query;
    
    const result = await emailService.enviarCorreoPrueba(to);
    
    logger.info('Correo de prueba enviado', {
      to: to || 'admin',
      messageId: result.messageId
    });
    
    res.status(200).json({
      success: true,
      message: 'Correo de prueba enviado correctamente',
      messageId: result.messageId
    });
    
  } catch (error) {
    logger.error('Error en enviarPrueba:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al enviar correo de prueba',
      error: error.message
    });
  }
}

/**
 * Health check
 * GET /api/notifications/health
 */
function healthCheck(req, res) {
  res.status(200).json({
    success: true,
    message: 'Servicio de notificaciones funcionando correctamente',
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER
    }
  });
}

module.exports = {
  enviarRegistro,
  enviarAtraso,
  enviarAusente,
  enviarPrueba,
  healthCheck
};
