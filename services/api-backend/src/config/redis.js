/**
 * Cliente Redis Singleton para Cache
 * Usa Redis Cloud (AWS sa-east-1)
 */

const Redis = require('ioredis');

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
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error(`Error obteniendo cache [${key}]:`, error.message);
      return null;
    }
  }

  /**
   * Guardar valor en cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttl - Tiempo de vida en segundos (default: 5min)
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = 300) {
    if (!this.client || !this.isConnected) return false;

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Error guardando cache [${key}]:`, error.message);
      return false;
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
      return deleted;
    } catch (error) {
      console.error('Error eliminando cache:', error.message);
      return 0;
    }
  }

  /**
   * Eliminar todas las claves que coincidan con un patrón
   * @param {string} pattern - Ej: 'marcajes:*'
   * @returns {Promise<number>}
   */
  async delPattern(pattern) {
    if (!this.client || !this.isConnected) return 0;

    try {
      let cursor = '0';
      let deletedTotal = 0;
      const keysToDelete = [];

      // Usar SCAN en lugar de KEYS (mejor para producción)
      do {
        const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        
        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }
      } while (cursor !== '0');

      if (keysToDelete.length === 0) {
        console.log(`🔍 No se encontraron keys para el patrón: ${pattern}`);
        return 0;
      }

      const deleted = await this.client.del(...keysToDelete);
      console.log(`🗑️  Cache invalidado: ${deleted} keys [${pattern}]`);
      return deleted;
    } catch (error) {
      console.error('Error eliminando patrón:', error.message);
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
