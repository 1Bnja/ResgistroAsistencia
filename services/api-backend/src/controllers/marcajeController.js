const Marcaje = require('../models/Marcaje');
const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const axios = require('axios');
const { notificarNuevoMarcaje, notificarAtraso } = require('../services/websocketClient');

// Helper: Calcular si hay atraso
const calcularAtraso = (horaEntrada, horaMarcaje, toleranciaMinutos) => {
  const [horaH, horaM] = horaEntrada.split(':').map(Number);
  const [marcajeH, marcajeM, marcajeS] = horaMarcaje.split(':').map(Number);
  
  const horaEntradaMinutos = horaH * 60 + horaM;
  const horaMarcajeMinutos = marcajeH * 60 + marcajeM;
  
  const diferencia = horaMarcajeMinutos - horaEntradaMinutos;
  
  if (diferencia > toleranciaMinutos) {
    return {
      estado: 'atraso',
      minutosAtraso: diferencia - toleranciaMinutos
    };
  } else if (diferencia < -15) {
    return {
      estado: 'anticipado',
      minutosAtraso: 0
    };
  } else {
    return {
      estado: 'puntual',
      minutosAtraso: 0
    };
  }
};

// Registrar marcaje desde reconocimiento facial (DESDE API-IA)
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
    
    // Calcular si hay atraso (solo para entradas)
    let estado = 'puntual';
    let minutosAtraso = 0;

    if (tipo === 'entrada') {
      const resultado = calcularAtraso(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos
      );
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
    }

    // Crear marcaje
    const marcaje = await Marcaje.create({
      usuarioId: usuario._id,
      tipo: tipo || 'entrada',
      fecha: ahora,
      hora,
      estado,
      minutosAtraso,
      ubicacion: 'Terminal Reconocimiento Facial',
      confianzaIA: confianza
    });

    // Si hay atraso, enviar notificacion
    if (estado === 'atraso') {
      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
          destinatario: usuario.email,
          asunto: `Registro de atraso - ${usuario.nombre} ${usuario.apellido}`,
          tipo: 'atraso',
          data: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            fecha: ahora.toLocaleDateString('es-CL'),
            hora,
            minutosAtraso,
            horaEsperada: usuario.horarioId.horaEntrada
          }
        });
        
        marcaje.notificacionEnviada = true;
        await marcaje.save();
      } catch (emailError) {
        console.error('Error al enviar notificacion:', emailError.message);
      }
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

    if (estado === 'atraso') {
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
        minutosAtraso
      }
    });

  } catch (error) {
    console.error('Error en registrarMarcajeReconocimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// Registrar marcaje (DESDE EL TERMINAL) - CON RECONOCIMIENTO FACIAL
exports.registrarMarcaje = async (req, res) => {
  try {
    const { imagenFacial, tipo, ubicacion } = req.body;

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

    // 1. Llamar al servicio de IA para reconocimiento facial
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:5000';

    let aiResponse;
    try {
      aiResponse = await axios.post(`${aiServiceUrl}/recognize`, {
        image: imagenFacial
      }, {
        timeout: 10000 // Timeout de 10 segundos
      });
    } catch (aiError) {
      console.error('Error al llamar servicio de IA:', aiError.message);
      return res.status(503).json({
        success: false,
        message: 'Servicio de reconocimiento facial no disponible. Use login manual.',
        error: aiError.message,
        fallbackRequired: true
      });
    }

    // 2. Verificar resultado del reconocimiento
    if (!aiResponse.data.success || !aiResponse.data.rostros || aiResponse.data.rostros.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se pudo reconocer ningún rostro. Use login manual.',
        fallbackRequired: true
      });
    }

    const rostroReconocido = aiResponse.data.rostros[0];
    const usuarioId = rostroReconocido.usuario_id;
    const confianza = rostroReconocido.confianza;

    // 3. Verificar nivel de confianza (mínimo 60%)
    if (confianza < 0.6) {
      return res.status(400).json({
        success: false,
        message: `Confianza muy baja (${(confianza * 100).toFixed(1)}%). Use login manual.`,
        confianza,
        fallbackRequired: true
      });
    }

    // 4. Buscar usuario y su horario
    const usuario = await Usuario.findById(usuarioId).populate('horarioId');

    if (!usuario || !usuario.activo) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // 5. Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0]; // "HH:mm:ss"

    // 6. Calcular si hay atraso (solo para entradas)
    let estado = 'puntual';
    let minutosAtraso = 0;

    if (tipo === 'entrada') {
      const resultado = calcularAtraso(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos
      );
      estado = resultado.estado;
      minutosAtraso = resultado.minutosAtraso;
    }

    // 7. Crear marcaje
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
      metodoMarcaje: 'automatico'
    });

    // 8. Si hay atraso, enviar notificación
    if (estado === 'atraso') {
      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
          destinatario: usuario.email,
          asunto: `Registro de atraso - ${usuario.nombre} ${usuario.apellido}`,
          tipo: 'atraso',
          data: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            fecha: ahora.toLocaleDateString('es-CL'),
            hora,
            minutosAtraso,
            horaEsperada: usuario.horarioId.horaEntrada
          }
        });

        marcaje.notificacionEnviada = true;
        await marcaje.save();
      } catch (emailError) {
        console.error('Error al enviar notificación:', emailError.message);
        // No fallar el marcaje si falla el email
      }
    }

    // 9. Notificar a través de WebSocket
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

    if (estado === 'atraso') {
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

    // 10. Devolver respuesta con datos del usuario
    res.status(201).json({
      success: true,
      message: `Marcaje de ${tipo} registrado exitosamente`,
      metodoMarcaje: 'automatico',
      confianza: confianza,
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          cargo: usuario.cargo,
          rut: usuario.rut
        },
        estado,
        minutosAtraso
      }
    });

  } catch (error) {
    console.error('Error en registrarMarcaje:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// Obtener marcajes con filtros
exports.getMarcajes = async (req, res) => {
  try {
    const { usuarioId, fechaInicio, fechaFin, estado, tipo, establecimientoId } = req.query;

    let filtro = {};
    
    if (usuarioId) filtro.usuarioId = usuarioId;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    
    if (fechaInicio || fechaFin) {
      filtro.fecha = {};
      if (fechaInicio) filtro.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fecha.$lte = new Date(fechaFin);
    }

    // Si se filtra por establecimiento, primero obtener usuarios de ese establecimiento
    if (establecimientoId) {
      const usuariosDelEstablecimiento = await Usuario.find({ establecimientoId }).select('_id');
      const usuarioIds = usuariosDelEstablecimiento.map(u => u._id);
      filtro.usuarioId = { $in: usuarioIds };
    }

    const marcajes = await Marcaje.find(filtro)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido rut cargo departamento email establecimientoId',
        populate: [
          {
            path: 'horarioId',
            select: 'nombre horaEntrada horaSalida toleranciaMinutos'
          },
          {
            path: 'establecimientoId',
            select: 'nombre codigo'
          }
        ]
      })
      .sort({ fecha: -1, hora: -1 })
      .limit(100);

    res.json({
      success: true,
      count: marcajes.length,
      data: marcajes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener marcajes',
      error: error.message
    });
  }
};

// Obtener marcajes de HOY
exports.getMarcajesHoy = async (req, res) => {
  try {
    const { establecimientoId } = req.query;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    let filtro = {
      fecha: { $gte: hoy, $lt: manana }
    };

    // Si se filtra por establecimiento
    if (establecimientoId) {
      const usuariosDelEstablecimiento = await Usuario.find({ establecimientoId }).select('_id');
      const usuarioIds = usuariosDelEstablecimiento.map(u => u._id);
      filtro.usuarioId = { $in: usuarioIds };
    }

    const marcajes = await Marcaje.find(filtro)
      .populate({
        path: 'usuarioId',
        select: 'nombre apellido cargo rut email establecimientoId',
        populate: [
          {
            path: 'horarioId',
            select: 'nombre horaEntrada horaSalida toleranciaMinutos'
          },
          {
            path: 'establecimientoId',
            select: 'nombre codigo'
          }
        ]
      })
      .sort({ fecha: -1, hora: -1 });

    res.json({
      success: true,
      count: marcajes.length,
      data: marcajes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener marcajes de hoy',
      error: error.message
    });
  }
};

// Registrar marcaje con credenciales (FALLBACK manual cuando IA falla)
exports.registrarMarcajeConCredenciales = async (req, res) => {
  try {
    const { email, password, tipo, ubicacion, imagenFacial } = req.body;

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    if (!tipo || !['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de marcaje inválido (debe ser "entrada" o "salida")'
      });
    }

    // Buscar usuario con password
    const usuario = await Usuario.findOne({ email }).select('+password').populate('horarioId');

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar password
    const passwordValido = await usuario.comparePassword(password);
    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Usuario desactivado. Contacte al administrador.'
      });
    }

    // Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0]; // "HH:mm:ss"

    // Calcular si hay atraso (solo para entradas)
    let estado = 'puntual';
    let minutosAtraso = 0;

    if (tipo === 'entrada') {
      const resultado = calcularAtraso(
        usuario.horarioId.horaEntrada,
        hora,
        usuario.horarioId.toleranciaMinutos
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
      imagenMarcaje: imagenFacial,
      ubicacion: ubicacion || 'Terminal Principal - Login Manual',
      confianzaIA: null, // No hay confianza de IA porque fue login manual
      metodoMarcaje: 'manual' // Indicar que fue manual
    });

    // Si hay atraso, enviar notificación
    if (estado === 'atraso') {
      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notify`, {
          destinatario: usuario.email,
          asunto: `Registro de atraso - ${usuario.nombre} ${usuario.apellido}`,
          tipo: 'atraso',
          data: {
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            fecha: ahora.toLocaleDateString('es-CL'),
            hora,
            minutosAtraso,
            horaEsperada: usuario.horarioId.horaEntrada
          }
        });

        marcaje.notificacionEnviada = true;
        await marcaje.save();
      } catch (emailError) {
        console.error('Error al enviar notificación:', emailError.message);
      }
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
      tipo,
      estado,
      minutosAtraso
    }).catch(err => console.error('Error notificando WebSocket:', err));

    if (estado === 'atraso') {
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

    // Devolver respuesta con datos del usuario
    res.status(201).json({
      success: true,
      message: `Marcaje de ${tipo} registrado exitosamente`,
      metodoMarcaje: 'manual',
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          cargo: usuario.cargo,
          rut: usuario.rut
        },
        estado,
        minutosAtraso
      }
    });

  } catch (error) {
    console.error('Error en registrarMarcajeConCredenciales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar marcaje',
      error: error.message
    });
  }
};

// Estadísticas de marcajes
exports.getEstadisticas = async (req, res) => {
  try {
    const { mes, anio, periodo, establecimientoId } = req.query;

    let fechaInicio, fechaFin;

    // Si no hay mes/año, usar HOY
    if (!mes && !anio && (!periodo || periodo === 'hoy')) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaInicio = hoy;
      
      fechaFin = new Date(hoy);
      fechaFin.setDate(fechaFin.getDate() + 1);
    } else {
      fechaInicio = new Date(anio, mes - 1, 1);
      fechaFin = new Date(anio, mes, 0);
    }

    // Filtro base
    let matchFilter = {
      fecha: { $gte: fechaInicio, $lt: fechaFin },
      tipo: 'entrada'
    };

    // Si se filtra por establecimiento
    if (establecimientoId) {
      const usuariosDelEstablecimiento = await Usuario.find({ establecimientoId }).select('_id');
      const usuarioIds = usuariosDelEstablecimiento.map(u => u._id);
      matchFilter.usuarioId = { $in: usuarioIds };
    }

    // Obtener estadísticas agrupadas por estado
    const stats = await Marcaje.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
          minutosAtrasoProm: { $avg: '$minutosAtraso' }
        }
      }
    ]);

    // Calcular hora promedio de entrada
    const marcajesHoy = await Marcaje.find(matchFilter);

    let horaPromedio = '--:--';
    if (marcajesHoy.length > 0) {
      const totalMinutos = marcajesHoy.reduce((sum, m) => {
        const [h, min] = m.hora.split(':').map(Number);
        return sum + (h * 60 + min);
      }, 0);
      const promedioMinutos = Math.floor(totalMinutos / marcajesHoy.length);
      const horas = Math.floor(promedioMinutos / 60);
      const minutos = promedioMinutos % 60;
      horaPromedio = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }

    // Formatear respuesta
    const puntuales = stats.find(s => s._id === 'puntual')?.total || 0;
    const atrasos = stats.find(s => s._id === 'atraso')?.total || 0;
    const anticipados = stats.find(s => s._id === 'anticipado')?.total || 0;
    const totalHoy = puntuales + atrasos + anticipados;

    res.json({
      success: true,
      periodo: periodo || { mes, anio },
      totalHoy,
      puntuales,
      atrasos,
      anticipados,
      ausentes: 0, // TODO: Calcular ausentes
      horaPromedio,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};