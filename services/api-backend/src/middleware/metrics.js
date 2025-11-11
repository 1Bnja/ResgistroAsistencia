const promClient = require('prom-client');

// Crear registro de métricas
const register = new promClient.Registry();

// Agregar métricas por defecto (memory, CPU, etc)
promClient.collectDefaultMetrics({ register });

// =====================================================
// MÉTRICAS HTTP
// =====================================================

// Contador de requests HTTP por método, ruta y código de estado
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de peticiones HTTP recibidas',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Histograma de duración de requests HTTP
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// =====================================================
// MÉTRICAS DE BASE DE DATOS
// =====================================================

// Contador de queries a MongoDB
const mongodbQueriesTotal = new promClient.Counter({
  name: 'mongodb_queries_total',
  help: 'Total de queries ejecutadas en MongoDB',
  labelNames: ['collection', 'operation'],
  registers: [register]
});

// Histograma de duración de queries MongoDB
const mongodbQueryDuration = new promClient.Histogram({
  name: 'mongodb_query_duration_seconds',
  help: 'Duración de queries MongoDB en segundos',
  labelNames: ['collection', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
});

// =====================================================
// MIDDLEWARE EXPRESS
// =====================================================

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Capturar el fin de la respuesta
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // segundos
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const status = res.statusCode;

    // Incrementar contador de requests
    httpRequestsTotal.inc({ method, route, status });

    // Observar duración
    httpRequestDuration.observe({ method, route, status }, duration);
  });

  next();
};

// =====================================================
// FUNCIONES DE AYUDA PARA MÉTRICAS
// =====================================================

// Registrar query MongoDB
const recordMongoQuery = (collection, operation, duration) => {
  mongodbQueriesTotal.inc({ collection, operation });
  mongodbQueryDuration.observe({ collection, operation }, duration);
};

module.exports = {
  register,
  metricsMiddleware,
  recordMongoQuery,
  // Exportar métricas individuales para uso directo si es necesario
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    mongodbQueriesTotal,
    mongodbQueryDuration
  }
};
