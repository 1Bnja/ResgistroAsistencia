import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Servicio de marcaje
export const marcajeService = {
  // Registrar marcaje con reconocimiento facial (LEGACY - no usar directamente)
  registrarMarcaje: async (data) => {
    const response = await api.post('/marcajes/registrar', data);
    return response.data;
  },

  // Registrar marcaje con credenciales (fallback manual)
  registrarMarcajeConCredenciales: async (data) => {
    const response = await api.post('/marcajes/credenciales', data);
    return response.data;
  },

  // Obtener marcajes de hoy
  getMarcajesHoy: async () => {
    const response = await api.get('/marcajes/hoy');
    return response.data;
  },
};

// Servicio de reconocimiento facial
export const faceRecognitionService = {
  // Enviar imagen para reconocimiento y marcaje automático
  recognizeAndMark: async (imageData, tipo, ubicacion = 'Terminal de Entrada Principal') => {
    try {
      const response = await api.post('/marcajes/registrar', {
        imagenFacial: imageData,
        tipo,
        ubicacion
      });
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      // Si el backend devuelve un error, lo manejamos aquí
      return {
        success: false,
        error: error.response?.data?.message || 'Error al procesar reconocimiento facial',
        statusCode: error.response?.status
      };
    }
  },

  // Solo reconocer sin marcar (para validación previa)
  recognizeFace: async (imageData) => {
    try {
      const response = await api.post('/ai/recognize', {
        image: imageData,
      });
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al reconocer rostro',
        statusCode: error.response?.status
      };
    }
  }
};

export default api;
