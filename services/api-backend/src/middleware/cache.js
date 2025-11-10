/**
 * Middleware de Cache con Redis
 * Cachea automáticamente respuestas GET
 */

const redis = require('../config/redis');
const { recordCacheHit, recordCacheMiss } = require('./metrics');

/**
 * Middleware de cache
 * @param {number} ttl - Time To Live en segundos (default: 5min)
 * @param {function} keyGenerator - Función para generar la cache key (opcional)
 * @returns {function} Express middleware
 * 
 * @example
 * router.get('/usuarios', cache(60), usuarioController.getUsuarios);
 * router.get('/marcajes', cache(30, (req) => `marcajes:${req.user.id}`), controller.getMarcajes);
 */
const cache = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Si Redis no está disponible, continuar sin cache
    if (!redis.isReady()) {
      return next();
    }

    try {
      // Generar cache key
      let cacheKey;
      
      if (keyGenerator && typeof keyGenerator === 'function') {
        // Usar generador personalizado
        cacheKey = keyGenerator(req);
      } else {
        // Generar automáticamente desde URL + query params
        const baseKey = req.originalUrl || req.url;
        const queryString = JSON.stringify(req.query);
        const userId = req.user?.id || 'anonymous';
        cacheKey = `cache:${userId}:${baseKey}:${queryString}`;
      }

      // Buscar en cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        console.log(`💾 Cache HIT: ${cacheKey}`);
        
        // Registrar métrica de cache hit
        const route = req.route?.path || req.path || 'unknown';
        recordCacheHit(route);
        
        // Devolver data cacheada
        return res.status(200).json({
          ...cachedData,
          cached: true,
          cachedAt: new Date().toISOString()
        });
      }

      console.log(`🔍 Cache MISS: ${cacheKey}`);

      // Registrar métrica de cache miss
      const route = req.route?.path || req.path || 'unknown';
      recordCacheMiss(route);

      // Interceptar res.json para cachear la respuesta
      const originalJson = res.json.bind(res);

      res.json = function(body) {
        // Solo cachear respuestas exitosas (200-299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Guardar en cache de forma asíncrona (no bloqueante)
          redis.set(cacheKey, body, ttl)
            .then(() => {
              console.log(`✅ Cacheado [${ttl}s]: ${cacheKey}`);
            })
            .catch(err => {
              console.error('Error cacheando respuesta:', err.message);
            });
        }

        // Enviar respuesta original
        return originalJson(body);
      };

      next();

    } catch (error) {
      console.error('Error en middleware cache:', error.message);
      // En caso de error, continuar sin cache
      next();
    }
  };
};

/**
 * Invalidar cache por patrón
 * Usar en POST/PUT/DELETE para limpiar cache relacionado
 * 
 * @param {string|string[]} patterns - Patrón(es) de keys a eliminar
 * @returns {function} Express middleware
 * 
 * @example
 * router.post('/marcajes', invalidateCache('cache:*:marcajes*'), controller.createMarcaje);
 * router.put('/usuarios/:id', invalidateCache(['cache:*:usuarios*', 'cache:*:estadisticas*']), controller.update);
 */
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    // Ejecutar después de la respuesta
    res.on('finish', async () => {
      // Solo invalidar en respuestas exitosas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (!redis.isReady()) return;

        try {
          const patternArray = Array.isArray(patterns) ? patterns : [patterns];
          
          for (const pattern of patternArray) {
            await redis.delPattern(pattern);
          }
        } catch (error) {
          console.error('Error invalidando cache:', error.message);
        }
      }
    });

    next();
  };
};

/**
 * Middleware para agregar header con info de cache
 */
const cacheHeaders = (req, res, next) => {
  res.setHeader('X-Cache-Status', 'MISS');
  
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    if (body && body.cached) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cached-At', body.cachedAt || '');
    }
    return originalJson(body);
  };

  next();
};

module.exports = {
  cache,
  invalidateCache,
  cacheHeaders
};
