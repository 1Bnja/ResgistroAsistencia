const Marcaje = require('../models/Marcaje');
const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const axios = require('axios');
const { notificarNuevoMarcaje, notificarAtraso } = require('../services/websocketClient');

// ==========================================
// HELPER: CALCULAR ESTADO DEL MARCAJE
// ==========================================
const calcularEstadoMarcaje = (horaEntrada, horaMarcaje, toleranciaMinutos, limiteAtrasoMinutos = 30) => {
  const [horaH, horaM] = horaEntrada.split(':').map(Number);
  const [marcajeH, marcajeM] = horaMarcaje.split(':').map(Number);
  
  const horaEntradaMinutos = horaH * 60 + horaM;
  const horaMarcajeMinutos = marcajeH * 60 + marcajeM;
  
  const diferencia = horaMarcajeMinutos - horaEntradaMinutos;
  
  // Si llega muy temprano (15 minutos antes)
  if (diferencia < -15) {
    return {
      estado: 'anticipado',
      minutosAtraso: 0
    };
  }
  
  // Si llega dentro de la tolerancia (puntual)
  if (diferencia <= toleranciaMinutos) {
    return {
      estado: 'puntual',
      minutosAtraso: 0
    };
  }
  
  // Calcular minutos de atraso real (después de la tolerancia)
  const minutosAtrasoReal = diferencia - toleranciaMinutos;
  
  // Si el atraso supera el límite, marcar como ausente
  if (minutosAtrasoReal > limiteAtrasoMinutos) {
    return {
      estado: 'ausente',
      minutosAtraso: minutosAtrasoReal
    };
  }
  
  // Si hay atraso pero no supera el límite
  return {
    estado: 'atraso',
    minutosAtraso: minutosAtrasoReal
  };
};

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
        horaEntrada: horario.horaEntrada,
        tolerancia: horario.toleranciaMinutos
      }
    };

    // Determinar endpoint según el estado
    let endpoint = '/api/notifications/registro';
    
    if (estado === 'ausente') {
      endpoint = '/api/notifications/ausente';
      // Agregar datos específicos para ausencia
      payload.marcaje.limiteAtraso = parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30;
    } else if (estado === 'atraso') {
      endpoint = '/api/notifications/atraso';
      // Agregar hora esperada para atraso
      payload.marcaje.horaEsperada = horario.horaEntrada;
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

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0]; // "HH:mm:ss"
    
    // Calcular estado del marcaje (solo para entradas)
    let estado = 'puntual';
    let minutosAtraso = 0;

    if ((tipo || 'entrada') === 'entrada' && usuario.horarioId) {
      const limiteAtraso = parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30;
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos,
        limiteAtraso
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
      
      console.log(`📊 Estado calculado: ${estado} | Minutos de atraso: ${minutosAtraso}`);
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

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0];
    
    // Calcular estado (solo para entradas)
    let estado = 'puntual';
    let minutosAtraso = 0;

    if (tipo === 'entrada' && usuario.horarioId) {
      const limiteAtraso = parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30;
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos,
        limiteAtraso
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
      
      console.log('📝 Estado calculado:', estado, 'Atraso:', minutosAtraso, 'min');
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

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0];

    // Calcular estado
    let estado = 'puntual';
    let minutosAtraso = 0;

    if (tipo === 'entrada' && usuario.horarioId) {
      const limiteAtraso = parseInt(process.env.LIMITE_ATRASO_MINUTOS) || 30;
      
      const resultado = calcularEstadoMarcaje(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos,
        limiteAtraso
      );
      
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
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
      .populate('usuarioId', 'nombre apellido rut cargo email')
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
      .populate('usuarioId', 'nombre apellido rut cargo email')
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