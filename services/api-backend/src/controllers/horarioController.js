const Horario = require('../models/Horario');

// Obtener todos los horarios
exports.getHorarios = async (req, res) => {
  try {
    const horarios = await Horario.find({ activo: true }).sort({ nombre: 1 });

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
    const horario = await Horario.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Horario creado exitosamente',
      data: horario
    });
  } catch (error) {
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

// Eliminar horario
exports.deleteHorario = async (req, res) => {
  try {
    const horario = await Horario.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Horario desactivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar horario',
      error: error.message
    });
  }
};