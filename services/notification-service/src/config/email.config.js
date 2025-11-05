// ==========================================
// CONFIGURACIÓN SMTP
// Configuración del transportador de nodemailer
// ==========================================

const nodemailer = require('nodemailer');
const logger = require('./logger.config');

// Validar variables de entorno requeridas
const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Faltan variables de entorno requeridas:', { missing: missingEnvVars });
  throw new Error(`Faltan variables de entorno: ${missingEnvVars.join(', ')}`);
}

// Configuración del transporter
const transporterConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Crear transporter
const transporter = nodemailer.createTransport(transporterConfig);

// Verificar conexión SMTP al inicio
transporter.verify()
  .then(() => {
    logger.info('✅ Conexión SMTP establecida correctamente', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER
    });
  })
  .catch((error) => {
    logger.error('❌ Error al conectar con el servidor SMTP:', {
      error: error.message,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT
    });
  });

// Exportar transporter y configuración
module.exports = {
  transporter,
  defaultFrom: process.env.FROM_EMAIL || `"${process.env.FROM_NAME}" <${process.env.SMTP_USER}>`,
  adminEmail: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
  appName: process.env.APP_NAME || 'Sistema de Asistencia',
  universityName: process.env.UNIVERSITY_NAME || 'Universidad de Talca',
  departmentName: process.env.DEPARTMENT_NAME || 'Administración de Redes'
};
