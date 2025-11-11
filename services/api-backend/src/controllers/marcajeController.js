const Marcaje = require('../models/Marcaje');
const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const axios = require('axios');
const { notificarNuevoMarcaje, notificarAtraso } = require('../services/websocketClient');

// ==========================================
// HELPER: CALCULAR ESTADO DEL MARCAJE
// ==========================================
/**
 * Calcula el estado del marcaje según las nuevas reglas:
 * - ANTICIPADO: ≥30 minutos antes de la hora de entrada
 * - PUNTUAL: entre 10 minutos antes y 15 minutos después de la hora de entrada
 * - ATRASO: más de 15 minutos después hasta 60 minutos
 * - AUSENTE: más de 60 minutos después de la hora de entrada
 * 
 * @param {string} horaEntrada - Hora de entrada esperada (formato "HH:MM")
 * @param {string} horaMarcaje - Hora real del marcaje (formato "HH:MM")
 * @returns {object} { estado: string, minutosAtraso: number }
 */
const calcularEstadoMarcaje = (horaEntrada, horaMarcaje) => {
  // Obtener configuración desde variables de entorno con valores por defecto
  const TOLERANCIA_ANTICIPADO = parseInt(process.env.TOLERANCIA_ANTICIPADO_MINUTOS) || 30;
  const TOLERANCIA_PUNTUAL_ANTES = parseInt(process.env.TOLERANCIA_PUNTUAL_ANTES_MINUTOS) || 10;
  const TOLERANCIA_PUNTUAL_DESPUES = parseInt(process.env.TOLERANCIA_PUNTUAL_DESPUES_MINUTOS) || 15;
  const LIMITE_AUSENCIA = parseInt(process.env.LIMITE_AUSENCIA_MINUTOS) || 60;

  // Validar formato de horas
  if (!horaEntrada || !horaMarcaje || !horaEntrada.includes(':') || !horaMarcaje.includes(':')) {
    console.warn('⚠️ Formato de hora inválido:', { horaEntrada, horaMarcaje });
    return {
      estado: 'puntual',
      minutosAtraso: 0
    };
  }

  const [horaH, horaM] = horaEntrada.split(':').map(Number);
  const [marcajeH, marcajeM] = horaMarcaje.split(':').map(Number);
  
  const horaEntradaMinutos = horaH * 60 + horaM;
  const horaMarcajeMinutos = marcajeH * 60 + marcajeM;
  
  // Diferencia en minutos (negativo = antes, positivo = después)
  const diferencia = horaMarcajeMinutos - horaEntradaMinutos;
  
  console.log(`⏰ Cálculo de estado ENTRADA:
    - Hora entrada esperada: ${horaEntrada} (${horaEntradaMinutos} minutos)
    - Hora marcaje real: ${horaMarcaje} (${horaMarcajeMinutos} minutos)
    - Diferencia: ${diferencia} minutos ${diferencia < 0 ? '(antes)' : '(después)'}
    - Tolerancias: anticipado=${TOLERANCIA_ANTICIPADO}, puntual_antes=${TOLERANCIA_PUNTUAL_ANTES}, puntual_después=${TOLERANCIA_PUNTUAL_DESPUES}, ausencia=${LIMITE_AUSENCIA}
  `);
  
  // REGLA 1: ANTICIPADO - Llega 30 minutos o más antes
  if (diferencia <= -TOLERANCIA_ANTICIPADO) {
    return {
      estado: 'anticipado',
      minutosAtraso: 0,
      minutosAnticipado: Math.abs(diferencia)
    };
  }
  
  // REGLA 2: PUNTUAL - Entre 10 min antes y 15 min después
  if (diferencia >= -TOLERANCIA_PUNTUAL_ANTES && diferencia <= TOLERANCIA_PUNTUAL_DESPUES) {
    return {
      estado: 'puntual',
      minutosAtraso: 0
    };
  }
  
  // REGLA 3: AUSENTE - Más de 60 minutos después
  if (diferencia > LIMITE_AUSENCIA) {
    return {
      estado: 'ausente',
      minutosAtraso: diferencia
    };
  }
  
  // REGLA 4: ATRASO - Más de 15 min pero menos de 60 min después
  if (diferencia > TOLERANCIA_PUNTUAL_DESPUES) {
    return {
      estado: 'atraso',
      minutosAtraso: diferencia
    };
  }
  
  // Caso por defecto (no debería llegar aquí, pero por seguridad)
  return {
    estado: 'puntual',
    minutosAtraso: 0
  };
};

// ==========================================
// HELPER: CALCULAR ESTADO DEL MARCAJE DE SALIDA
// ==========================================
/**
 * Calcula el estado del marcaje de salida según las reglas:
 * - SALIDA_ANTICIPADA: Sale antes de la hora de salida configurada
 * - SALIDA_NORMAL: Sale en o después de la hora de salida configurada
 * 
 * @param {string} horaSalida - Hora de salida esperada (formato "HH:MM")
 * @param {string} horaMarcaje - Hora real del marcaje de salida (formato "HH:MM")
 * @returns {object} { estado: string, minutosAnticipado: number, minutosDespues: number }
 */
const calcularEstadoSalida = (horaSalida, horaMarcaje) => {
  // Obtener configuración desde variables de entorno con valores por defecto
  const TOLERANCIA_SALIDA_ANTICIPADA = parseInt(process.env.TOLERANCIA_SALIDA_ANTICIPADA_MINUTOS) || 0;

  // Validar formato de horas
  if (!horaSalida || !horaMarcaje || !horaSalida.includes(':') || !horaMarcaje.includes(':')) {
    console.warn('⚠️ Formato de hora inválido:', { horaSalida, horaMarcaje });
    return {
      estado: 'salida_normal',
      minutosAnticipado: 0,
      minutosDespues: 0
    };
  }

  const [salidaH, salidaM] = horaSalida.split(':').map(Number);
  const [marcajeH, marcajeM] = horaMarcaje.split(':').map(Number);
  
  const horaSalidaMinutos = salidaH * 60 + salidaM;
  const horaMarcajeMinutos = marcajeH * 60 + marcajeM;
  
  // Diferencia en minutos (negativo = antes, positivo = después)
  const diferencia = horaMarcajeMinutos - horaSalidaMinutos;
  
  // REGLA 1: SALIDA ANTICIPADA - Sale antes de la hora (considerando tolerancia si existe)
  if (diferencia < -TOLERANCIA_SALIDA_ANTICIPADA) {
    return {
      estado: 'salida_anticipada',
      minutosAnticipado: Math.abs(diferencia),
      minutosDespues: 0
    };
  }
  
  // REGLA 2: SALIDA NORMAL - Sale en la hora o después (o dentro de la tolerancia)
  return {
    estado: 'salida_normal',
    minutosAnticipado: 0,
    minutosDespues: Math.max(0, diferencia)
  };
};

// ==========================================
// FUNCIÓN PARA ENVIAR NOTIFICACIONES
// ==========================================
// FUNCIÓN PARA ENVIAR NOTIFICACIONES
// ==========================================
const enviarNotificacion = async (usuario, marcaje, horario, estado, minutosAtraso) => {
  try {
    const notificationUrl = process.env.NOTIFICATION_SERVICE_URL;
    
    // Validar que la URL del servicio esté configurada
    if (!notificationUrl) {
      console.error('⚠️ NOTIFICATION_SERVICE_URL no está configurada');
      return;
    }

    // Preparar payload común
    const payload = {
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rut: usuario.rut,
        email: usuario.email
      },
      marcaje: {
        tipo: marcaje.tipo,
        fecha: marcaje.fecha.toLocaleDateString('es-CL'),
        hora: marcaje.hora,
        estado: estado,
        minutosAtraso: minutosAtraso || 0,
        ubicacion: marcaje.ubicacion
      },
      horario: {
        horaEntrada: horario?.horaEntrada || 'N/A',
        horaSalida: horario?.horaSalida || 'N/A',
        toleranciaPuntualAntes: parseInt(process.env.TOLERANCIA_PUNTUAL_ANTES_MINUTOS) || 10,
        toleranciaPuntualDespues: parseInt(process.env.TOLERANCIA_PUNTUAL_DESPUES_MINUTOS) || 15
      }
    };

    // Determinar endpoint según el estado y tipo de marcaje
    let endpoint = '/api/notifications/registro';
    
    // Estados de ENTRADA
    if (estado === 'ausente') {
      endpoint = '/api/notifications/ausente';
      payload.marcaje.limiteAusencia = parseInt(process.env.LIMITE_AUSENCIA_MINUTOS) || 60;
    } else if (estado === 'atraso') {
      endpoint = '/api/notifications/atraso';
      payload.marcaje.horaEsperada = horario.horaEntrada;
    } else if (estado === 'anticipado') {
      endpoint = '/api/notifications/registro';
      payload.marcaje.esAnticipado = true;
    } 
    // Estados de SALIDA
    else if (estado === 'salida_anticipada') {
      endpoint = '/api/notifications/salida';
      payload.marcaje.esSalidaAnticipada = true;
      payload.marcaje.horaSalidaEsperada = horario.horaSalida;
    } else if (estado === 'salida_normal') {
      endpoint = '/api/notifications/salida';
      payload.marcaje.esSalidaNormal = true;
      payload.marcaje.horaSalidaEsperada = horario.horaSalida;
    }

    // Enviar notificación
    console.log(`📧 Enviando notificación [${estado.toUpperCase()}] a: ${notificationUrl}${endpoint}`);
    
    const response = await axios.post(`${notificationUrl}${endpoint}`, payload, {
      timeout: 5000 // Timeout de 5 segundos
    });

    if (response.data && response.data.success) {
      console.log(`✅ Notificación enviada correctamente para ${usuario.nombre} ${usuario.apellido} [${estado}]`);
      return true;
    } else {
      console.error('❌ Respuesta inesperada del servicio de notificaciones:', response.data);
      return false;
    }

  } catch (error) {
    console.error('❌ Error al enviar notificación:', error.message);
    
    // Si es error de conexión, loggear más detalles
    if (error.code === 'ECONNREFUSED') {
      console.error('   → El servicio de notificaciones no está disponible');
    } else if (error.response) {
      console.error('   → Respuesta del servidor:', error.response.status, error.response.data);
    }
    
    return false;
  };
};

// ==========================================
// HELPER: VALIDAR MARCAJE DUPLICADO
// ==========================================
/**
 * Valida si el usuario puede registrar un marcaje según las reglas:
 * - ENTRADA: No puede tener otra entrada el mismo día sin salida
 * - SALIDA: Debe tener una entrada previa el mismo día sin salida
 * 
 * @param {string} usuarioId - ID del usuario
 * @param {string} tipo - Tipo de marcaje ('entrada' o 'salida')
 * @returns {object} { valido: boolean, mensaje: string, ultimoMarcaje: object }
 */
const validarMarcajeDuplicado = async (usuarioId, tipo) => {
  try {
    // Obtener fecha de hoy (inicio y fin del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finDelDia = new Date(hoy);
    finDelDia.setHours(23, 59, 59, 999);

    // Buscar marcajes del usuario hoy, ordenados por fecha descendente
    const marcajesHoy = await Marcaje.find({
      usuarioId,
      fecha: {
        $gte: hoy,
        $lte: finDelDia
      }
    }).sort({ fecha: -1, hora: -1 });

    if (marcajesHoy.length === 0) {
      // No hay marcajes hoy
      if (tipo === 'salida') {
        return {
          valido: false,
          mensaje: 'No puedes registrar una salida sin haber registrado entrada primero',
          ultimoMarcaje: null
        };
      }
      // Primera entrada del día - OK
      return {
        valido: true,
        mensaje: 'Primera entrada del día',
        ultimoMarcaje: null
      };
    }

    // Obtener el último marcaje
    const ultimoMarcaje = marcajesHoy[0];

    if (tipo === 'entrada') {
      // Si el último marcaje fue entrada, no puede registrar otra entrada
      if (ultimoMarcaje.tipo === 'entrada') {
        return {
          valido: false,
          mensaje: `Ya registraste entrada hoy a las ${ultimoMarcaje.hora}. Debes registrar salida primero.`,
          ultimoMarcaje
        };
      }
      // Si el último fue salida, puede registrar nueva entrada (re-entrada)
      return {
        valido: true,
        mensaje: 'Re-entrada permitida',
        ultimoMarcaje
      };
    }

    if (tipo === 'salida') {
      // Si el último marcaje fue salida, no puede registrar otra salida
      if (ultimoMarcaje.tipo === 'salida') {
        return {
          valido: false,
          mensaje: `Ya registraste salida hoy a las ${ultimoMarcaje.hora}. Debes registrar entrada primero.`,
          ultimoMarcaje
        };
      }
      // Si el último fue entrada, puede registrar salida
      return {
        valido: true,
        mensaje: 'Salida correspondiente a entrada previa',
        ultimoMarcaje
      };
    }

    return {
      valido: true,
      mensaje: 'Validación OK',
      ultimoMarcaje
    };

  } catch (error) {
    console.error('Error validando marcaje duplicado:', error);
    // En caso de error, permitir el marcaje (fail-safe)
    return {
      valido: true,
      mensaje: 'Validación omitida por error',
      ultimoMarcaje: null
    };
  }
};

// ==========================================
// REGISTRAR MARCAJE DESDE RECONOCIMIENTO FACIAL
// ==========================================
exports.registrarMarcajeReconocimiento = async (req, res) => {
  try {
    const { usuarioId, confianza, tipo } = req.body;

    // Validar datos
    if (!usuarioId) {
      return res.status(400).json({
        success: false,
        message: 'usuarioId es requerido'
      });
    }

    // Buscar usuario y su horario
    const usuario = await Usuario.findById(usuarioId).populate('horarioId');
    
    if (!usuario || !usuario.activo) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // VALIDAR MARCAJE DUPLICADO
    const validacion = await validarMarcajeDuplicado(usuarioId, tipo || 'entrada');
    
    if (!validacion.valido) {
      console.log(`⚠️ Marcaje duplicado detectado: ${validacion.mensaje}`);
      return res.status(400).json({
        success: false,
        message: validacion.mensaje,
        ultimoMarcaje: validacion.ultimoMarcaje ? {
          tipo: validacion.ultimoMarcaje.tipo,
          hora: validacion.ultimoMarcaje.hora,
          fecha: validacion.ultimoMarcaje.fecha
        } : null
      });
    }

    console.log(`✅ Validación OK: ${validacion.mensaje}`);

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0]; // "HH:mm:ss"
    
    // Calcular estado del marcaje según el tipo
    let estado = 'puntual';
    let minutosAtraso = 0;
    let minutosAnticipado = 0;
    let minutosDespues = 0;

    if ((tipo || 'entrada') === 'entrada' && usuario.horarioId) {
      // Lógica para ENTRADA
      console.log(`🔍 Calculando estado para ENTRADA:
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaEntrada}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
      
      console.log(`📊 Estado calculado (ENTRADA): ${estado} | Minutos de atraso: ${minutosAtraso}`);
    } else if (tipo === 'salida' && usuario.horarioId) {
      // Lógica para SALIDA
      console.log(`🔍 Calculando estado para SALIDA:
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaSalida}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoSalida(
        usuario.horarioId.horaSalida,
        hora
      );
      
      estado = resultado.estado;
      minutosAnticipado = resultado.minutosAnticipado;
      minutosDespues = resultado.minutosDespues;
      
      console.log(`📊 Estado calculado (SALIDA): ${estado} | Minutos anticipado: ${minutosAnticipado} | Minutos después: ${minutosDespues}`);
    }

    // Crear marcaje en la base de datos
    const marcaje = await Marcaje.create({
      usuarioId: usuario._id,
      tipo: tipo || 'entrada',
      fecha: ahora,
      hora,
      estado,
      minutosAtraso,
      ubicacion: 'Terminal Reconocimiento Facial',
      confianzaIA: confianza,
      notificacionEnviada: false
    });

    console.log(`✅ Marcaje creado exitosamente para ${usuario.nombre} ${usuario.apellido}`);

    // ENVIAR NOTIFICACIÓN SIEMPRE (para todos los estados)
    const notificacionEnviada = await enviarNotificacion(
      usuario,
      marcaje,
      usuario.horarioId,
      estado,
      minutosAtraso
    );

    // Actualizar flag de notificación
    if (notificacionEnviada) {
      marcaje.notificacionEnviada = true;
      await marcaje.save();
    }

    // Notificar a través de WebSocket
    const marcajeCompleto = await Marcaje.findById(marcaje._id)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido cargo rut email',
        populate: {
          path: 'horarioId',
          select: 'nombre horaEntrada horaSalida toleranciaMinutos'
        }
      });

    notificarNuevoMarcaje({
      marcaje: marcajeCompleto,
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        cargo: usuario.cargo,
        rut: usuario.rut
      },
      tipo: tipo || 'entrada',
      estado,
      minutosAtraso,
      confianza
    }).catch(err => console.error('Error notificando WebSocket:', err));

    // Notificar atraso adicional por WebSocket si aplica
    if (estado === 'atraso' || estado === 'ausente') {
      notificarAtraso({
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rut: usuario.rut
        },
        minutosAtraso,
        hora,
        fecha: ahora
      }).catch(err => console.error('Error notificando atraso WebSocket:', err));
    }

    // Devolver respuesta con datos del usuario
    res.status(201).json({
      success: true,
      message: `Marcaje de ${tipo || 'entrada'} registrado exitosamente`,
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          cargo: usuario.cargo,
          rut: usuario.rut
        },
        estado,
        minutosAtraso,
        notificacionEnviada
      }
    });

  } catch (error) {
    console.error('❌ Error en registrarMarcajeReconocimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// ==========================================
// REGISTRAR MARCAJE CON IMAGEN FACIAL
// (Desde terminal con cámara)
// ==========================================
exports.registrarMarcaje = async (req, res) => {
  try {
    const { imagenFacial, tipo, ubicacion } = req.body;

    console.log('📝 ===== REGISTRAR MARCAJE CON IA =====');
    console.log('📝 Tipo:', tipo);
    console.log('📝 Ubicación:', ubicacion);
    console.log('📝 Imagen recibida:', imagenFacial ? `${imagenFacial.length} caracteres` : 'NO');

    // Validar datos requeridos
    if (!imagenFacial) {
      return res.status(400).json({
        success: false,
        message: 'Imagen facial es requerida'
      });
    }

    if (!tipo || !['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de marcaje inválido (debe ser "entrada" o "salida")'
      });
    }

    // Llamar al servicio de IA para reconocimiento facial
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:5000';
    console.log('📝 Llamando a servicio IA:', aiServiceUrl);

    let aiResponse;
    try {
      aiResponse = await axios.post(`${aiServiceUrl}/recognize`, {
        image: imagenFacial
      }, {
        timeout: 10000
      });
      
      console.log('📝 Respuesta IA:', JSON.stringify(aiResponse.data, null, 2));
    } catch (aiError) {
      console.error('❌ Error al llamar servicio de IA:', aiError.message);
      return res.status(503).json({
        success: false,
        message: 'Servicio de reconocimiento facial no disponible. Use login manual.',
        error: aiError.message,
        fallbackRequired: true
      });
    }

    // Validar respuesta de IA - CORREGIDO: acceder a rostros[0]
    if (!aiResponse.data || !aiResponse.data.rostros || aiResponse.data.rostros.length === 0) {
      console.log('❌ No se detectaron rostros en la imagen');
      return res.status(404).json({
        success: false,
        message: 'No se detectó ningún rostro en la imagen. Intente nuevamente o use login manual.'
      });
    }

    const rostroDetectado = aiResponse.data.rostros[0];
    
    if (!rostroDetectado.reconocido || !rostroDetectado.usuario_id) {
      console.log('❌ Rostro detectado pero no reconocido. Confianza:', rostroDetectado.confianza);
      return res.status(404).json({
        success: false,
        message: 'No se pudo reconocer el rostro. Intente nuevamente o use login manual.',
        confianza: rostroDetectado.confianza
      });
    }

    const usuarioId = rostroDetectado.usuario_id;
    const confianza = rostroDetectado.confianza;

    console.log('📝 Usuario reconocido:', usuarioId, 'con confianza:', confianza);

    // Buscar usuario
    const usuario = await Usuario.findById(usuarioId).populate('horarioId');
    
    if (!usuario || !usuario.activo) {
      console.log('❌ Usuario no encontrado o inactivo:', usuarioId);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    console.log('📝 Usuario encontrado:', usuario.nombre, usuario.apellido);

    // VALIDAR MARCAJE DUPLICADO
    const validacion = await validarMarcajeDuplicado(usuarioId, tipo);
    
    if (!validacion.valido) {
      console.log(`⚠️ Marcaje duplicado detectado: ${validacion.mensaje}`);
      return res.status(400).json({
        success: false,
        message: validacion.mensaje,
        ultimoMarcaje: validacion.ultimoMarcaje ? {
          tipo: validacion.ultimoMarcaje.tipo,
          hora: validacion.ultimoMarcaje.hora,
          fecha: validacion.ultimoMarcaje.fecha
        } : null
      });
    }

    console.log(`✅ Validación OK: ${validacion.mensaje}`);

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0];
    
    // Calcular estado según el tipo
    let estado = 'puntual';
    let minutosAtraso = 0;
    let minutosAnticipado = 0;
    let minutosDespues = 0;

    if (tipo === 'entrada' && usuario.horarioId) {
      // Lógica para ENTRADA
      console.log(`🔍 Calculando estado para ENTRADA (AI):
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaEntrada}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
      
      console.log('📝 Estado calculado (ENTRADA):', estado, 'Atraso:', minutosAtraso, 'min');
    } else if (tipo === 'salida' && usuario.horarioId) {
      // Lógica para SALIDA
      console.log(`🔍 Calculando estado para SALIDA (AI):
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaSalida}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoSalida(
        usuario.horarioId.horaSalida,
        hora
      );
      
      estado = resultado.estado;
      minutosAnticipado = resultado.minutosAnticipado;
      minutosDespues = resultado.minutosDespues;
      
      console.log('📝 Estado calculado (SALIDA):', estado, 'Anticipado:', minutosAnticipado, 'min, Después:', minutosDespues, 'min');
    }

    // Crear marcaje
    const marcaje = await Marcaje.create({
      usuarioId: usuario._id,
      tipo,
      fecha: ahora,
      hora,
      estado,
      minutosAtraso,
      imagenMarcaje: imagenFacial,
      ubicacion: ubicacion || 'Terminal Principal',
      confianzaIA: confianza,
      metodoMarcaje: 'automatico',
      notificacionEnviada: false
    });

    console.log('✅ Marcaje creado:', marcaje._id);

    // ENVIAR NOTIFICACIÓN SIEMPRE
    const notificacionEnviada = await enviarNotificacion(
      usuario,
      marcaje,
      usuario.horarioId,
      estado,
      minutosAtraso
    );

    if (notificacionEnviada) {
      marcaje.notificacionEnviada = true;
      await marcaje.save();
    }

    // Notificar por WebSocket
    const marcajeCompleto = await Marcaje.findById(marcaje._id)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido cargo rut email',
        populate: {
          path: 'horarioId',
          select: 'nombre horaEntrada horaSalida toleranciaMinutos'
        }
      });

    notificarNuevoMarcaje({
      marcaje: marcajeCompleto,
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        cargo: usuario.cargo,
        rut: usuario.rut
      },
      tipo,
      estado,
      minutosAtraso,
      confianza
    }).catch(err => console.error('Error notificando WebSocket:', err));

    if (estado === 'atraso' || estado === 'ausente') {
      notificarAtraso({
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rut: usuario.rut
        },
        minutosAtraso,
        hora,
        fecha: ahora
      }).catch(err => console.error('Error notificando atraso:', err));
    }

    res.status(201).json({
      success: true,
      message: `Marcaje registrado exitosamente`,
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido
        },
        estado,
        minutosAtraso,
        notificacionEnviada
      }
    });

  } catch (error) {
    console.error('❌ Error en registrarMarcaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// ==========================================
// REGISTRAR MARCAJE CON CREDENCIALES
// (Login manual)
// ==========================================
exports.registrarMarcajeConCredenciales = async (req, res) => {
  try {
    const { rut, password, tipo, ubicacion } = req.body;

    // Validar datos
    if (!rut || !password) {
      return res.status(400).json({
        success: false,
        message: 'RUT y contraseña son requeridos'
      });
    }

    if (!tipo || !['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de marcaje inválido'
      });
    }

    // Buscar usuario y validar contraseña
    const usuario = await Usuario.findOne({ rut }).select('+password').populate('horarioId');
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const isPasswordValid = await usuario.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador.'
      });
    }

    console.log('📝 Usuario autenticado:', usuario.nombre, usuario.apellido);

    // VALIDAR MARCAJE DUPLICADO
    const validacion = await validarMarcajeDuplicado(usuario._id, tipo);
    
    if (!validacion.valido) {
      console.log(`⚠️ Marcaje duplicado detectado: ${validacion.mensaje}`);
      return res.status(400).json({
        success: false,
        message: validacion.mensaje,
        ultimoMarcaje: validacion.ultimoMarcaje ? {
          tipo: validacion.ultimoMarcaje.tipo,
          hora: validacion.ultimoMarcaje.hora,
          fecha: validacion.ultimoMarcaje.fecha
        } : null
      });
    }

    console.log(`✅ Validación OK: ${validacion.mensaje}`);

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0];

    // Calcular estado según el tipo
    let estado = 'puntual';
    let minutosAtraso = 0;
    let minutosAnticipado = 0;
    let minutosDespues = 0;

    if (tipo === 'entrada' && usuario.horarioId) {
      // Lógica para ENTRADA
      console.log(`🔍 Calculando estado para ENTRADA (Credenciales):
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaEntrada}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
      
      console.log('📝 Estado calculado (ENTRADA):', estado, 'Atraso:', minutosAtraso, 'min');
    } else if (tipo === 'salida' && usuario.horarioId) {
      // Lógica para SALIDA
      console.log(`🔍 Calculando estado para SALIDA (Credenciales):
        - Usuario: ${usuario.nombre} ${usuario.apellido}
        - Hora configurada: ${usuario.horarioId.horaSalida}
        - Hora de marcaje: ${hora}
      `);
      
      const resultado = calcularEstadoSalida(
        usuario.horarioId.horaSalida,
        hora
      );
      
      estado = resultado.estado;
      minutosAnticipado = resultado.minutosAnticipado;
      minutosDespues = resultado.minutosDespues;
    }

    // Crear marcaje
    const marcaje = await Marcaje.create({
      usuarioId: usuario._id,
      tipo,
      fecha: ahora,
      hora,
      estado,
      minutosAtraso,
      ubicacion: ubicacion || 'Terminal Principal - Login Manual',
      confianzaIA: null,
      metodoMarcaje: 'manual',
      notificacionEnviada: false
    });

    // ENVIAR NOTIFICACIÓN SIEMPRE
    const notificacionEnviada = await enviarNotificacion(
      usuario,
      marcaje,
      usuario.horarioId,
      estado,
      minutosAtraso
    );

    if (notificacionEnviada) {
      marcaje.notificacionEnviada = true;
      await marcaje.save();
    }

    // WebSocket
    const marcajeCompleto = await Marcaje.findById(marcaje._id)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido cargo rut email',
        populate: {
          path: 'horarioId',
          select: 'nombre horaEntrada horaSalida toleranciaMinutos'
        }
      });

    notificarNuevoMarcaje({
      marcaje: marcajeCompleto,
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        cargo: usuario.cargo,
        rut: usuario.rut
      },
      tipo,
      estado,
      minutosAtraso,
      confianza: null
    }).catch(err => console.error('Error notificando WebSocket:', err));

    if (estado === 'atraso' || estado === 'ausente') {
      notificarAtraso({
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          rut: usuario.rut
        },
        minutosAtraso,
        hora,
        fecha: ahora
      }).catch(err => console.error('Error notificando atraso:', err));
    }

    res.status(201).json({
      success: true,
      message: `Marcaje registrado exitosamente`,
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido
        },
        estado,
        minutosAtraso,
        notificacionEnviada
      }
    });

  } catch (error) {
    console.error('❌ Error en registrarMarcajeConCredenciales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// ==========================================
// OBTENER MARCAJES (con filtros)
// ==========================================
exports.getMarcajes = async (req, res) => {
  try {
    const { fecha, usuarioId, estado, tipo } = req.query;
    
    let filtros = {};
    
    if (fecha) {
      const fechaBuscar = new Date(fecha);
      filtros.fecha = {
        $gte: new Date(fechaBuscar.setHours(0, 0, 0, 0)),
        $lt: new Date(fechaBuscar.setHours(23, 59, 59, 999))
      };
    }
    
    if (usuarioId) filtros.usuarioId = usuarioId;
    if (estado) filtros.estado = estado;
    if (tipo) filtros.tipo = tipo;
    
    const marcajes = await Marcaje.find(filtros)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido rut cargo email horarioId establecimientoId',
        populate: [
          {
            path: 'horarioId',
            select: 'nombre horaEntrada horaSalida toleranciaMinutos'
          },
          {
            path: 'establecimientoId',
            select: 'nombre codigo direccion'
          }
        ]
      })
      .sort({ fecha: -1, hora: -1 })
      .limit(100);
    
    res.status(200).json({
      success: true,
      count: marcajes.length,
      data: marcajes
    });
    
  } catch (error) {
    console.error('Error en getMarcajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener marcajes',
      error: error.message
    });
  }
};

// ==========================================
// OBTENER MARCAJES DE HOY
// ==========================================
exports.getMarcajesHoy = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const marcajes = await Marcaje.find({
      fecha: {
        $gte: hoy,
        $lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
      }
    })
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido rut cargo email horarioId establecimientoId',
        populate: [
          {
            path: 'horarioId',
            select: 'nombre horaEntrada horaSalida toleranciaMinutos'
          },
          {
            path: 'establecimientoId',
            select: 'nombre codigo direccion'
          }
        ]
      })
      .sort({ hora: -1 });
    
    res.status(200).json({
      success: true,
      count: marcajes.length,
      data: marcajes
    });
    
  } catch (error) {
    console.error('Error en getMarcajesHoy:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener marcajes de hoy',
      error: error.message
    });
  }
};

// ==========================================
// OBTENER ESTADÍSTICAS
// ==========================================
exports.getEstadisticas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const marcajesHoy = await Marcaje.find({
      fecha: {
        $gte: hoy,
        $lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    const stats = {
      total: marcajesHoy.length,
      puntuales: marcajesHoy.filter(m => m.estado === 'puntual').length,
      atrasos: marcajesHoy.filter(m => m.estado === 'atraso').length,
      ausentes: marcajesHoy.filter(m => m.estado === 'ausente').length,
      anticipados: marcajesHoy.filter(m => m.estado === 'anticipado').length
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error en getEstadisticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};