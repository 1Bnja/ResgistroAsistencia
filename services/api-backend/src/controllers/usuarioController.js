const Usuario = require('../models/Usuario');
const Horario = require('../models/Horario');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Obtener todos los usuarios
exports.getUsuarios = async (req, res) => {
  try {
    const { activo, departamento, rol } = req.query;
    
    let filtro = {};
    if (activo !== undefined) filtro.activo = activo === 'true';
    if (departamento) filtro.departamento = departamento;
    if (rol) filtro.rol = rol;

    const usuarios = await Usuario.find(filtro)
      .populate('horarioId', 'nombre horaEntrada horaSalida')
      .select('-encodingFacial')
      .sort({ nombre: 1 });

    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// Obtener usuario por ID
exports.getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .populate('horarioId');

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

// Crear usuario
exports.createUsuario = async (req, res) => {
  try {
    const { rut, email, horarioId } = req.body;

    // Verificar RUT y email únicos
    const existe = await Usuario.findOne({ $or: [{ rut }, { email }] });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: 'El RUT o email ya están registrados'
      });
    }

    // Verificar que el horario existe
    const horario = await Horario.findById(horarioId);
    if (!horario) {
      return res.status(400).json({
        success: false,
        message: 'El horario especificado no existe'
      });
    }

    const usuario = await Usuario.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
};

// Actualizar usuario
exports.updateUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('horarioId');

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// Eliminar usuario (soft delete)
exports.deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario con password
    const usuario = await Usuario.findOne({ email }).select('+password');

    if (!usuario || !(await usuario.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Usuario desactivado'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Actualizar último acceso
    usuario.ultimoAcceso = new Date();
    await usuario.save();

    res.json({
      success: true,
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

// Entrenar reconocimiento facial del usuario
exports.entrenarReconocimientoFacial = async (req, res) => {
  try {
    const { id } = req.params;
    const { imagenes } = req.body; // Array de imágenes en base64

    if (!imagenes || !Array.isArray(imagenes) || imagenes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una imagen'
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Llamar a API-IA para entrenar el modelo
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai-service:5000';
    
    try {
      const response = await axios.post(`${aiServiceUrl}/train`, {
        usuario_id: usuario._id.toString(),
        nombre: `${usuario.nombre} ${usuario.apellido}`,
        imagenes: imagenes
      }, {
        timeout: 60000 // 60 segundos para procesamiento
      });

      if (response.data.success) {
        // Actualizar flag de reconocimiento facial entrenado
        usuario.reconocimientoFacialActivo = true;
        await usuario.save();

        res.json({
          success: true,
          message: 'Reconocimiento facial entrenado exitosamente',
          data: {
            rostros_procesados: response.data.rostros_procesados,
            encodings_guardados: response.data.encodings_guardados
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: response.data.message || 'Error al entrenar el modelo'
        });
      }
    } catch (aiError) {
      console.error('Error llamando a API-IA:', aiError.message);
      res.status(503).json({
        success: false,
        message: 'Servicio de reconocimiento facial no disponible',
        error: aiError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al entrenar reconocimiento facial',
      error: error.message
    });
  }
};

// Obtener estado del reconocimiento facial
exports.getEstadoReconocimiento = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findById(id).select('reconocimientoFacialActivo nombre apellido');
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        activo: usuario.reconocimientoFacialActivo || false,
        usuario: `${usuario.nombre} ${usuario.apellido}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del reconocimiento',
      error: error.message
    });
  }
};