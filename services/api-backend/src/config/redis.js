/**
 * Cliente Redis Singleton para Cache
 * Usa Redis Cloud (AWS sa-east-1)
 */

const Redis = require('ioredis');

// Importar solo si metrics está disponible (evitar error en entorno sin prom-client)
let recordRedisOperation;
try {
  ({ recordRedisOperation } = require('../middleware/metrics'));
} catch (err) {
  // Si metrics no está disponible, usar función vacía
  recordRedisOperation = () => {};
}

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Conectar a Redis Cloud
   */
  async connect() {
    if (this.client) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn('⚠️  REDIS_URL no configurada. Cache deshabilitado.');
      return null;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Solo reconectar en errores READONLY
            return true;
          }
          return false;
        },
        enableReadyCheck: true,
        lazyConnect: false
      });

      // Event handlers
      this.client.on('connect', () => {
        console.log('✅ Redis conectado a cloud');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Error Redis:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️  Conexión Redis cerrada');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Reconectando a Redis...');
      });

      // Test de conexión
      await this.client.ping();
      console.log('🎯 Redis Cloud listo');

      return this.client;
    } catch (error) {
      console.error('❌ Error conectando a Redis:', error.message);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Obtener valor del cache
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    if (!this.client || !this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      recordRedisOperation('get', data ? 'success' : 'miss');
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      recordRedisOperation('get', 'error');
      console.error(`Error obteniendo cache [${key}]:`, error.message);
      return null;
    }
  }

  /**
   * Guardar valor en cache con tags para invalidación eficiente
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttl - Tiempo de vida en segundos (default: 5min)
   * @param {string[]} tags - Tags para agrupar keys (ej: ['usuarios', 'admin'])
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300, tags = []) {
    if (!this.client || !this.isConnected) return false;

    try {
      const serialized = JSON.stringify(value);
      
      // Guardar el valor principal
      await this.client.setex(key, ttl, serialized);
      
      // Si hay tags, agregar la key a los sets de tags
      if (tags && tags.length > 0) {
        const pipeline = this.client.pipeline();
        
        for (const tag of tags) {
          const tagKey = `tag:${tag}`;
          // Agregar la key al set del tag
          pipeline.sadd(tagKey, key);
          // Establecer TTL del tag (un poco más largo que el cache)
          pipeline.expire(tagKey, ttl + 60);
        }
        
        await pipeline.exec();
      }
      
      recordRedisOperation('set', 'success');
      return true;
    } catch (error) {
      recordRedisOperation('set', 'error');
      console.error(`Error guardando cache [${key}]:`, error.message);
      return false;
    }
  }

  /**
   * Invalidar cache por tags (mucho más eficiente que patrones)
   * @param {string|string[]} tags - Tag(s) a invalidar
   * @returns {Promise<number>}
   */
  async invalidateByTags(tags) {
    if (!this.client || !this.isConnected) return 0;

    try {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      let totalDeleted = 0;

      for (const tag of tagArray) {
        const tagKey = `tag:${tag}`;
        
        // Obtener todas las keys del tag
        const keys = await this.client.smembers(tagKey);
        
        if (keys.length > 0) {
          // Eliminar las keys
          const deleted = await this.client.del(...keys);
          totalDeleted += deleted;
          
          // Eliminar el tag
          await this.client.del(tagKey);
          
          console.log(`🗑️  Cache invalidado por tag [${tag}]: ${deleted} keys`);
        }
      }

      return totalDeleted;
    } catch (error) {
      console.error('Error invalidando por tags:', error.message);
      return 0;
    }
  }

  /**
   * Eliminar clave del cache
   * @param {string|string[]} keys 
   * @returns {Promise<number>}
   */
  async del(keys) {
    if (!this.client || !this.isConnected) return 0;

    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const deleted = await this.client.del(...keyArray);
      recordRedisOperation('del', 'success');
      return deleted;
    } catch (error) {
      recordRedisOperation('del', 'error');
      console.error('Error eliminando cache:', error.message);
      return 0;
    }
  }

  /**
   * Eliminar todas las claves que coincidan con un patrón
   * @param {string} pattern - Ej: 'marcajes:*'
   * @param {object} options - Opciones de invalidación
   * @param {number} options.maxIterations - Máximo de iteraciones SCAN (default: 50)
   * @param {number} options.timeout - Timeout en ms (default: 1000ms)
   * @param {boolean} options.background - Ejecutar en background sin esperar (default: false)
   * @returns {Promise<number>}
   */
  async delPattern(pattern, options = {}) {
    if (!this.client || !this.isConnected) return 0;

    const {
      maxIterations = 50,
      timeout = 1000,
      background = false
    } = options;

    const deleteOperation = async () => {
      try {
        let cursor = '0';
        let iterations = 0;
        const keysToDelete = [];

        // Usar SCAN en lugar de KEYS (mejor para producción)
        // Limitar iteraciones para evitar bloqueos largos
        do {
          const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          const keys = result[1];
          
          if (keys.length > 0) {
            keysToDelete.push(...keys);
          }

          iterations++;

          // Limitar iteraciones para evitar bloqueos
          if (iterations >= maxIterations) {
            console.warn(`⚠️  SCAN limitado a ${maxIterations} iteraciones para ${pattern}`);
            break;
          }

        } while (cursor !== '0');

        if (keysToDelete.length === 0) {
          console.log(`🔍 No se encontraron keys para el patrón: ${pattern}`);
          return 0;
        }

        // Eliminar en lotes de 100 keys para evitar comandos muy grandes
        let deleted = 0;
        for (let i = 0; i < keysToDelete.length; i += 100) {
          const batch = keysToDelete.slice(i, i + 100);
          deleted += await this.client.del(...batch);
        }

        console.log(`🗑️  Cache invalidado: ${deleted} keys [${pattern}]`);
        return deleted;
      } catch (error) {
        console.error('Error eliminando patrón:', error.message);
        return 0;
      }
    };

    // Si es background, no esperar a que termine
    if (background) {
      // Fire and forget - no bloqueante
      deleteOperation().catch(err => {
        console.error('Error en invalidación background:', err.message);
      });
      return 0; // Retornar inmediatamente
    }

    // Con timeout para evitar bloqueos
    try {
      return await Promise.race([
        deleteOperation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout invalidando cache')), timeout)
        )
      ]);
    } catch (error) {
      if (error.message.includes('Timeout')) {
        console.warn(`⚠️  Timeout invalidando ${pattern}, continuando en background`);
        // Continuar en background
        deleteOperation().catch(err => {
          console.error('Error en invalidación post-timeout:', err.message);
        });
      }
      return 0;
    }
  }

  /**
   * Limpiar todo el cache
   * @returns {Promise<boolean>}
   */
  async flushAll() {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.flushdb();
      console.log('🗑️  Cache completamente limpiado');
      return true;
    } catch (error) {
      console.error('Error limpiando cache:', error.message);
      return false;
    }
  }

  /**
   * Verificar si hay conexión
   * @returns {boolean}
   */
  isReady() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Cerrar conexión
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('👋 Redis desconectado');
    }
  }
}

// Singleton
const redisClient = new RedisClient();

module.exports = redisClient;
