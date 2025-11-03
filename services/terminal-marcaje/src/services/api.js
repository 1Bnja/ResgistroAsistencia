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
  // Registrar marcaje con reconocimiento facial
  registrarMarcaje: async (data) => {
    const response = await api.post('/marcajes', data);
    return response.data;
  },

  // Obtener marcajes de hoy
  getMarcajesHoy: async () => {
    const response = await api.get('/marcajes/hoy');
    return response.data;
  },
};

// Servicio de reconocimiento facial (cuando lo implementes)
export const faceRecognitionService = {
  // Enviar imagen para reconocimiento
  recognizeFace: async (imageData) => {
    const response = await api.post('/ai/recognize', {
      image: imageData,
    });
    return response.data;
  },
};

export default api;
