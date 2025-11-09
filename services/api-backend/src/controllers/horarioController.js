const Horario = require('../models/Horario');

// Obtener todos los horarios
exports.getHorarios = async (req, res) => {
  try {
    const horarios = await Horario.find().sort({ nombre: 1 });

    res.json({
      success: true,
      count: horarios.length,
      data: horarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios',
      error: error.message
    });
  }
};

// Crear horario
exports.createHorario = async (req, res) => {
  try {
    console.log('=== CREATE HORARIO ===');
    console.log('Usuario:', req.user ? req.user.email : 'NO USER');
    console.log('Body recibido:', JSON.stringify(req.body));

    const horario = await Horario.create(req.body);

    console.log('Horario creado exitosamente:', horario._id);
    res.status(201).json({
      success: true,
      message: 'Horario creado exitosamente',
      data: horario
    });
  } catch (error) {
    console.error('ERROR creando horario:', error.message);

    // Error de nombre duplicado
    if (error.code === 11000 && error.keyPattern?.nombre) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un horario con ese nombre',
        error: 'Nombre duplicado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear horario',
      error: error.message
    });
  }
};

// Actualizar horario
exports.updateHorario = async (req, res) => {
  try {
    const horario = await Horario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horario actualizado exitosamente',
      data: horario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar horario',
      error: error.message
    });
  }
};

// Eliminar horario (hard delete - eliminación física)
exports.deleteHorario = async (req, res) => {
  try {
    const horario = await Horario.findByIdAndDelete(req.params.id);

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar horario',
      error: error.message
    });
  }
};