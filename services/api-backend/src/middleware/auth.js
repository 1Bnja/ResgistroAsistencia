const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Proteger rutas
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('=== AUTH MIDDLEWARE ===');
    console.log('URL:', req.method, req.url);
    console.log('Token presente:', !!token);

    if (!token) {
      console.log('ERROR: No token');
      return res.status(401).json({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado - User ID:', decoded.id);

    // Buscar usuario
    req.user = await Usuario.findById(decoded.id);
    console.log('Usuario encontrado:', req.user ? req.user.email : 'NULL');
    console.log('Usuario activo:', req.user ? req.user.activo : 'N/A');

    if (!req.user || !req.user.activo) {
      console.log('ERROR: Usuario no válido o inactivo');
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    console.log('AUTH OK - Usuario:', req.user.email, 'Rol:', req.user.rol);
    next();
  } catch (error) {
    console.error('ERROR en auth middleware:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Autorizar por roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('=== AUTHORIZE MIDDLEWARE ===');
    console.log('Roles permitidos:', roles);
    console.log('Rol del usuario:', req.user ? req.user.rol : 'NO USER');

    if (!roles.includes(req.user.rol)) {
      console.log('ERROR: Rol no autorizado');
      return res.status(403).json({
        success: false,
        message: `El rol '${req.user.rol}' no tiene permisos para esta acción`
      });
    }

    console.log('AUTHORIZE OK');
    next();
  };
};