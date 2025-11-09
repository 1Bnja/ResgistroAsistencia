const Establecimiento = require('../models/Establecimiento');
const Usuario = require('../models/Usuario');

// Obtener todos los establecimientos
exports.getEstablecimientos = async (req, res) => {
  try {
    const { activo, tipo } = req.query;

    let filtro = {};
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (tipo) filtro.tipo = tipo;

    const establecimientos = await Establecimiento.find(filtro)
      .sort({ nombre: 1 });

    res.json({
      success: true,
      count: establecimientos.length,
      data: establecimientos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener establecimientos',
      error: error.message
    });
  }
};

// Obtener establecimiento por ID
exports.getEstablecimientoById = async (req, res) => {
  try {
    const establecimiento = await Establecimiento.findById(req.params.id);

    if (!establecimiento) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }

    // Obtener estadísticas de usuarios del establecimiento
    const totalUsuarios = await Usuario.countDocuments({
      establecimientoId: req.params.id
    });

    const usuariosActivos = await Usuario.countDocuments({
      establecimientoId: req.params.id,
      activo: true
    });

    res.json({
      success: true,
      data: {
        ...establecimiento.toObject(),
        estadisticas: {
          totalUsuarios,
          usuariosActivos
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener establecimiento',
      error: error.message
    });
  }
};

// Crear establecimiento
exports.createEstablecimiento = async (req, res) => {
  try {
    console.log('=== CREATE ESTABLECIMIENTO ===');
    console.log('Body recibido:', JSON.stringify(req.body));

    const { nombre, codigo } = req.body;

    // Verificar nombre y código únicos
    const existe = await Establecimiento.findOne({
      $or: [{ nombre }, { codigo }]
    });

    if (existe) {
      console.log('ERROR: Nombre o código duplicado');
      return res.status(400).json({
        success: false,
        message: 'El nombre o código del establecimiento ya están registrados'
      });
    }

    const establecimiento = await Establecimiento.create(req.body);

    console.log('Establecimiento creado exitosamente:', establecimiento._id);
    res.status(201).json({
      success: true,
      message: 'Establecimiento creado exitosamente',
      data: establecimiento
    });
  } catch (error) {
    console.error('ERROR creando establecimiento:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear establecimiento',
      error: error.message
    });
  }
};

// Actualizar establecimiento
exports.updateEstablecimiento = async (req, res) => {
  try {
    const establecimiento = await Establecimiento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!establecimiento) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Establecimiento actualizado exitosamente',
      data: establecimiento
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar establecimiento',
      error: error.message
    });
  }
};

// Eliminar establecimiento (solo si no tiene usuarios asignados)
exports.deleteEstablecimiento = async (req, res) => {
  try {
    // Verificar si hay usuarios asignados
    const usuariosAsignados = await Usuario.countDocuments({
      establecimientoId: req.params.id
    });

    if (usuariosAsignados > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el establecimiento porque tiene ${usuariosAsignados} usuario(s) asignado(s)`
      });
    }

    const establecimiento = await Establecimiento.findByIdAndDelete(req.params.id);

    if (!establecimiento) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Establecimiento eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar establecimiento',
      error: error.message
    });
  }
};

// Obtener usuarios de un establecimiento
exports.getUsuariosPorEstablecimiento = async (req, res) => {
  try {
    const { id } = req.params;
    
    const establecimiento = await Establecimiento.findById(id);
    if (!establecimiento) {
      return res.status(404).json({
        success: false,
        message: 'Establecimiento no encontrado'
      });
    }

    const usuarios = await Usuario.find({ establecimientoId: id })
      .populate('horarioId', 'nombre horaEntrada horaSalida')
      .select('-encodingFacial')
      .sort({ nombre: 1 });

    res.json({
      success: true,
      establecimiento: establecimiento.nombre,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios del establecimiento',
      error: error.message
    });
  }
};
