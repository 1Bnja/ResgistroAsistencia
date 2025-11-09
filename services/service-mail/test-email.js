// ==========================================
// SCRIPT DE PRUEBA DE CORREO ELECTRÓNICO
// Sistema de Asistencia - Universidad de Talca
// ==========================================

const nodemailer = require('nodemailer');

// Configuración del transporter con tus datos reales
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true para puerto 465, false para otros
  auth: {
    user: 'admnredmail98@gmail.com',
    pass: 'dcdordhfggwgtrzn' // Tu contraseña de aplicación (sin espacios)
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Función para enviar correo de prueba
async function enviarCorreoPrueba() {
  try {
    console.log('🚀 Iniciando envío de correo de prueba...\n');

    const info = await transporter.sendMail({
      from: '"Sistema de Asistencia UTalca" <admnredmail98@gmail.com>',
      to: 'admnredmail98@gmail.com', // Te lo envío a ti mismo para que lo veas
      subject: '✅ Prueba de Sistema de Correo - Asistencia UTalca',
      text: 'Si ves este mensaje, el sistema de correo está funcionando correctamente.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              padding: 0;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px 20px;
              background-color: #f9f9f9;
            }
            .success {
              color: #4CAF50;
              font-size: 32px;
              text-align: center;
              margin: 20px 0;
              font-weight: bold;
            }
            .info {
              background-color: #e3f2fd;
              padding: 20px;
              border-left: 4px solid #2196F3;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info strong {
              color: #1976D2;
              display: block;
              margin-bottom: 10px;
            }
            .info ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .info li {
              margin: 5px 0;
            }
            .check-list {
              background-color: #f1f8e9;
              padding: 20px;
              border-left: 4px solid #4CAF50;
              margin: 20px 0;
              border-radius: 4px;
            }
            .next-steps {
              background-color: #fff3e0;
              padding: 20px;
              border-left: 4px solid #FF9800;
              margin: 20px 0;
              border-radius: 4px;
            }
            .next-steps ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              background-color: #f5f5f5;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Sistema de Correo Funcionando</h1>
            </div>
            <div class="content">
              <div class="success">✅ ¡Prueba Exitosa!</div>
              <p>Hola,</p>
              <p>Este es un correo de prueba del <strong>Sistema de Control de Asistencia con Reconocimiento Facial</strong>.</p>
              
              <div class="info">
                <strong>📋 Información de la prueba:</strong>
                <ul>
                  <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL')}</li>
                  <li><strong>Hora:</strong> ${new Date().toLocaleTimeString('es-CL')}</li>
                  <li><strong>Servicio SMTP:</strong> Gmail</li>
                  <li><strong>Servidor:</strong> smtp.gmail.com:587</li>
                  <li><strong>Cuenta:</strong> admnredmail98@gmail.com</li>
                  <li><strong>Estado:</strong> ✅ Funcionando correctamente</li>
                </ul>
              </div>

              <div class="check-list">
                <p><strong>Si recibes este correo, significa que:</strong></p>
                <ul>
                  <li>✅ La configuración SMTP es correcta</li>
                  <li>✅ Las credenciales están bien configuradas</li>
                  <li>✅ La contraseña de aplicación funciona</li>
                  <li>✅ El sistema puede enviar correos exitosamente</li>
                  <li>✅ Estás listo para integrar en tu proyecto</li>
                </ul>
              </div>

              <div class="next-steps">
                <p><strong>🚀 Próximos pasos:</strong></p>
                <ol>
                  <li>Implementar el servicio de notificaciones en el proyecto</li>
                  <li>Crear templates personalizados para cada tipo de notificación</li>
                  <li>Configurar las notificaciones de atrasos y registros</li>
                  <li>Agregar el límite de atraso para ausencias</li>
                  <li>Integrar con el sistema de reconocimiento facial</li>
                </ol>
              </div>
            </div>
            <div class="footer">
              <p><strong>Sistema de Control de Asistencia</strong></p>
              <p>Universidad de Talca - Proyecto Unidad II</p>
              <p>Administración de Redes</p>
              <p style="margin-top: 10px; font-size: 11px;">Este es un correo automático generado por el sistema</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log('✅ ¡Correo enviado exitosamente!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Destinatario:', info.accepted);
    console.log('\n🎉 ¡El sistema de correo está funcionando correctamente!\n');
    console.log('📮 Revisa tu bandeja de entrada (o spam) en: admnredmail98@gmail.com\n');

  } catch (error) {
    console.error('❌ Error al enviar correo:', error.message);
    console.error('\n📋 Detalles del error:');
    console.error(error);
    
    console.log('\n💡 Posibles soluciones:');
    console.log('1. Verifica que la contraseña de aplicación sea correcta: dcdordhfggwgtrzn');
    console.log('2. Verifica que la autenticación en 2 pasos esté activa');
    console.log('3. Intenta generar una nueva contraseña de aplicación');
    console.log('4. Verifica tu conexión a internet\n');
  }
}

// Ejecutar la prueba
console.log('╔════════════════════════════════════════════╗');
console.log('║   PRUEBA DE SISTEMA DE CORREO SMTP         ║');
console.log('║   Sistema de Control de Asistencia         ║');
console.log('║   Universidad de Talca                     ║');
console.log('╚════════════════════════════════════════════╝\n');

enviarCorreoPrueba();
