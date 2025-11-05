// ==========================================
// SERVICIO DE EMAIL
// Lógica para envío de correos electrónicos
// ==========================================

const { transporter, defaultFrom, adminEmail, appName } = require('../config/email.config');
const { renderTemplate, generatePlainText } = require('../utils/templateEngine');
const logger = require('../config/logger.config');

/**
 * Envía un correo electrónico
 * @param {object} options - Opciones del correo
 * @returns {Promise} Resultado del envío
 */
async function sendEmail(options) {
  const { to, subject, html, text } = options;
  
  try {
    const mailOptions = {
      from: options.from || defaultFrom,
      to,
      subject: `${appName} - ${subject}`,
      html,
      text: text || 'Este correo requiere un cliente que soporte HTML.'
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('✅ Correo enviado exitosamente', {
      messageId: info.messageId,
      to,
      subject
    });
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    logger.error('❌ Error al enviar correo', {
      error: error.message,
      to,
      subject
    });
    
    throw error;
  }
}

/**
 * Envía notificación de registro normal
 * @param {object} data - Datos del registro
 * @returns {Promise} Resultado del envío
 */
async function enviarNotificacionRegistro(data) {
  try {
    const templateData = {
      nombre: data.nombre,
      apellido: data.apellido,
      rut: data.rut,
      email: data.email,
      tipoMarcaje: data.tipo || 'Entrada',
      fecha: data.fecha,
      hora: data.hora,
      estado: data.estado || 'PUNTUAL',
      ubicacion: data.ubicacion || 'Terminal Principal'
    };
    
    const html = renderTemplate('registro', templateData);
    const text = generatePlainText('registro', templateData);
    
    return await sendEmail({
      to: adminEmail,
      subject: `Registro de ${templateData.tipoMarcaje} - ${data.nombre} ${data.apellido}`,
      html,
      text
    });
    
  } catch (error) {
    logger.error('Error al enviar notificación de registro', { error: error.message });
    throw error;
  }
}

/**
 * Envía notificación de atraso
 * @param {object} data - Datos del atraso
 * @returns {Promise} Resultado del envío
 */
async function enviarNotificacionAtraso(data) {
  try {
    const templateData = {
      nombre: data.nombre,
      apellido: data.apellido,
      rut: data.rut,
      email: data.email,
      tipoMarcaje: data.tipo || 'Entrada',
      fecha: data.fecha,
      hora: data.hora,
      horaEsperada: data.horaEsperada,
      minutosAtraso: data.minutosAtraso,
      tolerancia: data.tolerancia || 0,
      ubicacion: data.ubicacion || 'Terminal Principal'
    };
    
    const html = renderTemplate('atraso', templateData);
    const text = generatePlainText('atraso', templateData);
    
    return await sendEmail({
      to: adminEmail,
      subject: `⏰ ATRASO - ${data.nombre} ${data.apellido} (${data.minutosAtraso} minutos)`,
      html,
      text
    });
    
  } catch (error) {
    logger.error('Error al enviar notificación de atraso', { error: error.message });
    throw error;
  }
}

/**
 * Envía notificación de ausencia
 * @param {object} data - Datos de la ausencia
 * @returns {Promise} Resultado del envío
 */
async function enviarNotificacionAusente(data) {
  try {
    const limiteAtraso = data.limiteAtraso || parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30;
    const excesoAtraso = data.minutosAtraso - limiteAtraso;
    
    const templateData = {
      nombre: data.nombre,
      apellido: data.apellido,
      rut: data.rut,
      email: data.email,
      tipoMarcaje: data.tipo || 'Entrada',
      fecha: data.fecha,
      hora: data.hora,
      horaEsperada: data.horaEsperada,
      minutosAtraso: data.minutosAtraso,
      limiteAtraso,
      excesoAtraso,
      tolerancia: data.tolerancia || 0,
      ubicacion: data.ubicacion || 'Terminal Principal'
    };
    
    const html = renderTemplate('ausente', templateData);
    const text = generatePlainText('ausente', templateData);
    
    return await sendEmail({
      to: adminEmail,
      subject: `🚨 AUSENCIA - ${data.nombre} ${data.apellido} (Límite superado: ${excesoAtraso} min)`,
      html,
      text
    });
    
  } catch (error) {
    logger.error('Error al enviar notificación de ausencia', { error: error.message });
    throw error;
  }
}

/**
 * Envía un correo de prueba
 * @param {string} to - Destinatario
 * @returns {Promise} Resultado del envío
 */
async function enviarCorreoPrueba(to = adminEmail) {
  try {
    const testData = {
      nombre: 'Juan',
      apellido: 'Pérez',
      rut: '12345678-9',
      email: 'juan.perez@ejemplo.cl',
      tipoMarcaje: 'Entrada',
      fecha: new Date().toLocaleDateString('es-CL'),
      hora: new Date().toLocaleTimeString('es-CL'),
      estado: 'PUNTUAL',
      ubicacion: 'Terminal Principal'
    };
    
    const html = renderTemplate('registro', testData);
    const text = generatePlainText('registro', testData);
    
    return await sendEmail({
      to,
      subject: '✅ Prueba del Sistema de Notificaciones',
      html,
      text
    });
    
  } catch (error) {
    logger.error('Error al enviar correo de prueba', { error: error.message });
    throw error;
  }
}

module.exports = {
  sendEmail,
  enviarNotificacionRegistro,
  enviarNotificacionAtraso,
  enviarNotificacionAusente,
  enviarCorreoPrueba
};
