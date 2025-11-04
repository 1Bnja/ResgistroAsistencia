const axios = require('axios');

const WEBSOCKET_SERVICE_URL = process.env.WEBSOCKET_SERVICE_URL || 'http://websocket-service:3002';

/**
 * Emitir evento al servicio WebSocket para notificar a todos los clientes conectados
 * @param {string} event - Nombre del evento
 * @param {object} data - Datos del evento
 */
const emitWebSocketEvent = async (event, data) => {
  try {
    await axios.post(`${WEBSOCKET_SERVICE_URL}/emit`, {
      event,
      data
    }, {
      timeout: 3000 // 3 segundos de timeout
    });
    console.log(`✅ Evento WebSocket emitido: ${event}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al emitir evento WebSocket (${event}):`, error.message);
    return false;
  }
};

/**
 * Notificar nuevo marcaje a través de WebSocket
 */
const notificarNuevoMarcaje = async (marcajeData) => {
  return emitWebSocketEvent('nuevo-marcaje', marcajeData);
};

/**
 * Notificar atraso detectado
 */
const notificarAtraso = async (atrasoData) => {
  return emitWebSocketEvent('atraso-detectado', atrasoData);
};

/**
 * Notificar actualización de usuario
 */
const notificarUsuarioActualizado = async (usuarioData) => {
  return emitWebSocketEvent('usuario-actualizado', usuarioData);
};

module.exports = {
  emitWebSocketEvent,
  notificarNuevoMarcaje,
  notificarAtraso,
  notificarUsuarioActualizado
};
