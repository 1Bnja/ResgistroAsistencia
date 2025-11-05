// ==========================================
// MOTOR DE TEMPLATES
// Genera HTML dinámico para los correos
// ==========================================

const fs = require('fs');
const path = require('path');

/**
 * Reemplaza las variables en el template HTML
 * @param {string} template - Template HTML
 * @param {object} variables - Variables a reemplazar
 * @returns {string} HTML procesado
 */
function replaceVariables(template, variables) {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

/**
 * Carga y procesa un template
 * @param {string} templateName - Nombre del template (sin extensión)
 * @param {object} data - Datos para el template
 * @returns {string} HTML procesado
 */
function renderTemplate(templateName, data = {}) {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template no encontrado: ${templateName}`);
  }
  
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  // Variables por defecto
  const defaultVariables = {
    appName: process.env.APP_NAME || 'Sistema de Asistencia',
    universityName: process.env.UNIVERSITY_NAME || 'Universidad de Talca',
    departmentName: process.env.DEPARTMENT_NAME || 'Administración de Redes',
    dashboardUrl: process.env.DASHBOARD_URL || '#',
    currentYear: new Date().getFullYear()
  };
  
  // Combinar variables por defecto con las proporcionadas
  const allVariables = { ...defaultVariables, ...data };
  
  return replaceVariables(template, allVariables);
}

/**
 * Genera texto plano a partir de los datos
 * @param {string} tipo - Tipo de notificación
 * @param {object} data - Datos para generar el texto
 * @returns {string} Texto plano
 */
function generatePlainText(tipo, data) {
  switch (tipo) {
    case 'registro':
      return `
Sistema de Asistencia - Registro de ${data.tipoMarcaje || 'Entrada'}

Funcionario: ${data.nombre} ${data.apellido}
RUT: ${data.rut}
Fecha: ${data.fecha}
Hora: ${data.hora}
Estado: ${data.estado}
Ubicación: ${data.ubicacion}

Este es un correo automático del Sistema de Control de Asistencia.
${process.env.UNIVERSITY_NAME || 'Universidad de Talca'}
      `.trim();
      
    case 'atraso':
      return `
Sistema de Asistencia - ATRASO DETECTADO

Funcionario: ${data.nombre} ${data.apellido}
RUT: ${data.rut}
Fecha: ${data.fecha}
Hora de llegada: ${data.hora}
Hora esperada: ${data.horaEsperada}
Minutos de atraso: ${data.minutosAtraso}
Ubicación: ${data.ubicacion}

Este es un correo automático del Sistema de Control de Asistencia.
${process.env.UNIVERSITY_NAME || 'Universidad de Talca'}
      `.trim();
      
    case 'ausente':
      return `
Sistema de Asistencia - AUSENCIA REGISTRADA

Funcionario: ${data.nombre} ${data.apellido}
RUT: ${data.rut}
Fecha: ${data.fecha}
Hora de llegada: ${data.hora}
Hora esperada: ${data.horaEsperada}
Minutos de atraso: ${data.minutosAtraso}
Límite de atraso: ${data.limiteAtraso} minutos

El funcionario ha superado el límite de atraso y se registra como AUSENTE.

Este es un correo automático del Sistema de Control de Asistencia.
${process.env.UNIVERSITY_NAME || 'Universidad de Talca'}
      `.trim();
      
    default:
      return 'Sistema de Control de Asistencia - Notificación';
  }
}

module.exports = {
  renderTemplate,
  generatePlainText,
  replaceVariables
};
