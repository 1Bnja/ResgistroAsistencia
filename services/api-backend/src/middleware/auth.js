const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Proteger rutas
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    req.user = await Usuario.findById(decoded.id);

    if (!req.user || !req.user.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Autorizar por roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `El rol '${req.user.rol}' no tiene permisos para esta acción`
      });
    }
    next();
  };
};