/**
 * Middleware de Cache con Redis
 * Cachea automáticamente respuestas GET
 */

const redis = require('../config/redis');
const { recordCacheHit, recordCacheMiss } = require('./metrics');

/**
 * Middleware de cache
 * @param {number} ttl - Time To Live en segundos (default: 5min)
 * @param {function|object} options - Función keyGenerator o objeto de opciones
 * @param {function} options.keyGenerator - Función para generar la cache key
 * @param {string[]} options.tags - Tags para agrupar el cache (ej: ['usuarios', 'admin'])
 * @returns {function} Express middleware
 * 
 * @example
 * // Cache simple
 * router.get('/usuarios', cache(60), usuarioController.getUsuarios);
 * 
 * // Cache con tags (recomendado para invalidación eficiente)
 * router.get('/usuarios', cache(60, { tags: ['usuarios'] }), controller.getUsuarios);
 * 
 * // Cache con key personalizada y tags
 * router.get('/marcajes', cache(30, { 
 *   keyGenerator: (req) => `marcajes:${req.user.id}`,
 *   tags: ['marcajes', `user:${req.user.id}`]
 * }), controller.getMarcajes);
 */
const cache = (ttl = 300, options = null) => {
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
      // Parsear opciones
      let keyGenerator = null;
      let tags = [];

      if (typeof options === 'function') {
        // Retrocompatibilidad: si options es función, es el keyGenerator
        keyGenerator = options;
      } else if (options && typeof options === 'object') {
        keyGenerator = options.keyGenerator || null;
        tags = options.tags || [];
      }

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
          redis.set(cacheKey, body, ttl, tags)
            .then(() => {
              const tagInfo = tags.length > 0 ? ` [tags: ${tags.join(', ')}]` : '';
              console.log(`✅ Cacheado [${ttl}s]${tagInfo}: ${cacheKey}`);
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
 * @param {object} options - Opciones de invalidación
 * @param {boolean} options.background - Ejecutar en background (default: true) 
 * @param {number} options.timeout - Timeout en ms (default: 500ms para mejor UX)
 * @param {number} options.maxIterations - Máximo de iteraciones SCAN (default: 30)
 * @returns {function} Express middleware
 * 
 * @example
 * // Invalidación rápida en background (recomendado para escrituras)
 * router.post('/marcajes', invalidateCache('cache:*:marcajes*'), controller.createMarcaje);
 * 
 * // Invalidación síncrona si necesitas garantizar limpieza
 * router.put('/usuarios/:id', invalidateCache(['cache:*:usuarios*'], { background: false }), controller.update);
 */
const invalidateCache = (patterns, options = {}) => {
  const {
    background = true,  // Por defecto en background para no bloquear
    timeout = 500,      // Timeout corto para operaciones síncronas
    maxIterations = 30  // Limitar iteraciones para evitar bloqueos
  } = options;

  return async (req, res, next) => {
    // Ejecutar ANTES de enviar la respuesta para operaciones síncronas
    // o DESPUÉS para background
    if (background) {
      // Modo background: invalidar después de enviar respuesta
      res.on('finish', async () => {
        // Solo invalidar en respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!redis.isReady()) return;

          try {
            const patternArray = Array.isArray(patterns) ? patterns : [patterns];
            
            // Invalidar en background (no bloqueante)
            for (const pattern of patternArray) {
              await redis.delPattern(pattern, { 
                background: true,
                maxIterations 
              });
            }
          } catch (error) {
            // No afectar la respuesta del usuario
            console.error('Error invalidando cache (background):', error.message);
          }
        }
      });

      // Continuar inmediatamente sin esperar
      next();
    } else {
      // Modo síncrono: invalidar antes de enviar respuesta
      // (usar solo si es crítico que el cache esté limpio)
      const originalJson = res.json.bind(res);
      
      res.json = async function(body) {
        // Solo invalidar en respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (redis.isReady()) {
            try {
              const patternArray = Array.isArray(patterns) ? patterns : [patterns];
              
              // Invalidar con timeout para no bloquear mucho
              for (const pattern of patternArray) {
                await redis.delPattern(pattern, { 
                  background: false,
                  timeout,
                  maxIterations 
                });
              }
            } catch (error) {
              console.error('Error invalidando cache (sync):', error.message);
              // Continuar aunque falle la invalidación
            }
          }
        }

        return originalJson(body);
      };

      next();
    }
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

/**
 * Invalidar cache por tags (MUY EFICIENTE - recomendado)
 * Usa Redis Sets para tracking de keys por tag
 * 
 * @param {string|string[]} tags - Tag(s) a invalidar
 * @param {boolean} background - Ejecutar en background (default: true)
 * @returns {function} Express middleware
 * 
 * @example
 * // Invalidación ultrarrápida por tags (recomendado)
 * router.post('/usuarios', invalidateByTags(['usuarios']), controller.createUsuario);
 * router.put('/usuarios/:id', invalidateByTags(['usuarios', 'admin']), controller.update);
 */
const invalidateByTags = (tags, background = true) => {
  return async (req, res, next) => {
    if (background) {
      // Modo background: invalidar después de enviar respuesta
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!redis.isReady()) return;

          try {
            // Invalidar por tags (O(n) donde n = número de keys, muy rápido)
            await redis.invalidateByTags(tags);
          } catch (error) {
            console.error('Error invalidando cache por tags (background):', error.message);
          }
        }
      });

      next();
    } else {
      // Modo síncrono (normalmente no necesario con tags, es muy rápido)
      const originalJson = res.json.bind(res);
      
      res.json = async function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (redis.isReady()) {
            try {
              await redis.invalidateByTags(tags);
            } catch (error) {
              console.error('Error invalidando cache por tags (sync):', error.message);
            }
          }
        }

        return originalJson(body);
      };

      next();
    }
  };
};

module.exports = {
  cache,
  invalidateCache,
  invalidateByTags,
  cacheHeaders
};
