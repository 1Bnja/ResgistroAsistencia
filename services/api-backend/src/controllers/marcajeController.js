const Marcaje = require('../models/Marcaje');
const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const axios = require('axios');

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

// Registrar marcaje (DESDE EL TERMINAL)
exports.registrarMarcaje = async (req, res) => {
  try {
    const { imagenFacial, tipo, ubicacion } = req.body;

    // 1. Llamar al servicio de IA (LO VEREMOS DESPUÉS)
    // Por ahora, simulamos que recibimos el usuarioId directamente
    const { usuarioId } = req.body; // TEMPORAL

    // 2. Buscar usuario y su horario
    const usuario = await Usuario.findById(usuarioId).populate('horarioId');
    
    if (!usuario || !usuario.activo) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // 3. Obtener hora actual
    const ahora = new Date();
    const hora = ahora.toTimeString().split(' ')[0]; // "HH:mm:ss"
    
    // 4. Calcular si hay atraso (solo para entradas)
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

    // 5. Crear marcaje
    const marcaje = await Marcaje.create({
      usuarioId: usuario._id,
      tipo,
      fecha: ahora,
      hora,
      estado,
      minutosAtraso,
      imagenMarcaje: imagenFacial,
      ubicacion: ubicacion || 'Terminal Principal'
    });

    // 6. Si hay atraso, enviar notificación
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

    // 7. Devolver respuesta con datos del usuario
    res.status(201).json({
      success: true,
      message: `Marcaje de ${tipo} registrado exitosamente`,
      data: {
        marcaje,
        usuario: {
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          cargo: usuario.cargo
        },
        estado,
        minutosAtraso
      }
    });

  } catch (error) {
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
    const { usuarioId, fechaInicio, fechaFin, estado, tipo } = req.query;

    let filtro = {};
    
    if (usuarioId) filtro.usuarioId = usuarioId;
    if (estado) filtro.estado = estado;
    if (tipo) filtro.tipo = tipo;
    
    if (fechaInicio || fechaFin) {
      filtro.fecha = {};
      if (fechaInicio) filtro.fecha.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fecha.$lte = new Date(fechaFin);
    }

    const marcajes = await Marcaje.find(filtro)
      .populate('usuarioId', 'nombre apellido rut cargo departamento')
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
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const marcajes = await Marcaje.find({
      fecha: { $gte: hoy, $lt: manana }
    })
      .populate('usuarioId', 'nombre apellido cargo')
      .sort({ hora: -1 });

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

// Estadísticas de marcajes
exports.getEstadisticas = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);

    const stats = await Marcaje.aggregate([
      {
        $match: {
          fecha: { $gte: fechaInicio, $lte: fechaFin },
          tipo: 'entrada'
        }
      },
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
          minutosAtrasoProm: { $avg: '$minutosAtraso' }
        }
      }
    ]);

    res.json({
      success: true,
      periodo: { mes, anio },
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