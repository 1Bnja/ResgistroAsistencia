// Middleware que hace al servicio read-only cuando ROLE=slave
module.exports = function slaveGuard(req, res, next) {
  const role = (process.env.ROLE || '').toLowerCase();
  // permitir salud y opciones siempre
  const isHealth = req.path === '/health' || req.path === '/';
  if (role === 'slave' && !isHealth) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (!safeMethods.includes(req.method)) {
      return res.status(405).json({
        success: false,
        error: 'Service is read-only (slave mode). Writes are disabled.'
      });
    }
  }
  next();
};
