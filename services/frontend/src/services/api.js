import axios from 'axios';

// MODO MOCK - Para desarrollo sin backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false; // BACKEND LISTO - Modo mock desactivado

// Datos mock
const mockData = {
  usuarios: [
    {
      _id: '1',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@asistencia.cl',
      rut: '12345678-9',
      rol: 'admin',
      horarioId: '1',
      activo: true,
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@asistencia.cl',
      rut: '11111111-1',
      rol: 'usuario',
      horarioId: '1',
      activo: true,
      createdAt: new Date().toISOString()
    },
    {
      _id: '3',
      nombre: 'María',
      apellido: 'González',
      email: 'maria@asistencia.cl',
      rut: '22222222-2',
      rol: 'usuario',
      horarioId: '2',
      activo: true,
      createdAt: new Date().toISOString()
    }
  ],
  horarios: [
    {
      _id: '1',
      nombre: 'Horario Mañana',
      horaEntrada: '08:00',
      horaSalida: '17:00',
      toleranciaMinutos: 15,
      diasSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
      activo: true
    },
    {
      _id: '2',
      nombre: 'Horario Tarde',
      horaEntrada: '14:00',
      horaSalida: '22:00',
      toleranciaMinutos: 10,
      diasSemana: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
      activo: true
    }
  ],
  marcajes: [
    {
      _id: '1',
      usuarioId: '2',
      usuario: { nombre: 'Juan', apellido: 'Pérez', rut: '11111111-1' },
      tipo: 'entrada',
      fecha: new Date().toISOString(),
      horaRegistro: '08:10',
      estado: 'puntual',
      createdAt: new Date().toISOString()
    },
    {
      _id: '2',
      usuarioId: '3',
      usuario: { nombre: 'María', apellido: 'González', rut: '22222222-2' },
      tipo: 'entrada',
      fecha: new Date().toISOString(),
      horaRegistro: '08:25',
      estado: 'atraso',
      minutosAtraso: 10,
      createdAt: new Date().toISOString()
    }
  ]
};

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si estamos en modo mock, no redirigir
    if (USE_MOCK) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper para simular delay de red
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// ========== AUTH ==========
export const authAPI = {
  login: async (credentials) => {
    if (USE_MOCK) {
      await mockDelay();
      // Validar credenciales mock
      if (credentials.email === 'admin@asistencia.cl' && credentials.password === 'admin123') {
        const usuario = mockData.usuarios[0];
        const token = 'mock-jwt-token-' + Date.now();
        return { data: { success: true, token, usuario } };
      }
      throw new Error('Credenciales inválidas');
    }
    return api.post('/usuarios/login', credentials);
  },
  register: async (userData) => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, message: 'Usuario registrado' } };
    }
    return api.post('/auth/register', userData);
  },
  getProfile: async () => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, user: mockData.usuarios[0] } };
    }
    return api.get('/auth/me');
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
};

// ========== USUARIOS ==========
export const usuariosAPI = {
  getAll: async (params) => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, data: mockData.usuarios } };
    }
    return api.get('/usuarios', { params });
  },
  getById: async (id) => {
    if (USE_MOCK) {
      await mockDelay();
      const usuario = mockData.usuarios.find(u => u._id === id);
      return { data: { success: true, data: usuario } };
    }
    return api.get(`/usuarios/${id}`);
  },
  create: async (userData) => {
    if (USE_MOCK) {
      await mockDelay();
      const newUser = { _id: String(Date.now()), ...userData, createdAt: new Date().toISOString() };
      mockData.usuarios.push(newUser);
      return { data: { success: true, data: newUser } };
    }
    return api.post('/usuarios', userData);
  },
  update: async (id, userData) => {
    if (USE_MOCK) {
      await mockDelay();
      const index = mockData.usuarios.findIndex(u => u._id === id);
      if (index !== -1) {
        mockData.usuarios[index] = { ...mockData.usuarios[index], ...userData };
        return { data: { success: true, data: mockData.usuarios[index] } };
      }
      throw new Error('Usuario no encontrado');
    }
    return api.put(`/usuarios/${id}`, userData);
  },
  delete: async (id) => {
    if (USE_MOCK) {
      await mockDelay();
      mockData.usuarios = mockData.usuarios.filter(u => u._id !== id);
      return { data: { success: true, message: 'Usuario eliminado' } };
    }
    return api.delete(`/usuarios/${id}`);
  },
  uploadPhoto: async (id, formData) => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, message: 'Foto subida' } };
    }
    return api.post(`/usuarios/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  entrenarFacial: async (id, imagenes) => {
    if (USE_MOCK) {
      await mockDelay(2000);
      return { 
        data: { 
          success: true, 
          message: 'Reconocimiento facial entrenado exitosamente',
          data: {
            rostros_procesados: imagenes.length,
            encodings_guardados: imagenes.length
          }
        } 
      };
    }
    return api.post(`/usuarios/${id}/entrenar-facial`, { imagenes });
  },
  getEstadoFacial: async (id) => {
    if (USE_MOCK) {
      await mockDelay();
      return { 
        data: { 
          success: true, 
          data: { activo: Math.random() > 0.5, usuario: 'Mock Usuario' }
        } 
      };
    }
    return api.get(`/usuarios/${id}/estado-facial`);
  },
};

// ========== MARCAJES ==========
export const marcajesAPI = {
  getAll: async (params) => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, data: mockData.marcajes } };
    }
    return api.get('/marcajes', { params });
  },
  getHoy: async () => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, data: mockData.marcajes } };
    }
    return api.get('/marcajes/hoy');
  },
  registrar: async (marcajeData) => {
    if (USE_MOCK) {
      await mockDelay();
      const newMarcaje = {
        _id: String(Date.now()),
        ...marcajeData,
        fecha: new Date().toISOString(),
        horaRegistro: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };
      mockData.marcajes.push(newMarcaje);
      return { data: { success: true, data: newMarcaje } };
    }
    return api.post('/marcajes/registrar', marcajeData);
  },
  getEstadisticas: async (params) => {
    if (USE_MOCK) {
      await mockDelay();
      return {
        data: {
          success: true,
          data: {
            totalHoy: mockData.marcajes.length,
            puntuales: mockData.marcajes.filter(m => m.estado === 'puntual').length,
            atrasos: mockData.marcajes.filter(m => m.estado === 'atraso').length,
            ausentes: 0
          }
        }
      };
    }
    return api.get('/marcajes/estadisticas', { params });
  },
};

// ========== HORARIOS ==========
export const horariosAPI = {
  getAll: async () => {
    if (USE_MOCK) {
      await mockDelay();
      return { data: { success: true, data: mockData.horarios } };
    }
    return api.get('/horarios');
  },
  create: async (horarioData) => {
    if (USE_MOCK) {
      await mockDelay();
      const newHorario = { _id: String(Date.now()), ...horarioData, activo: true };
      mockData.horarios.push(newHorario);
      return { data: { success: true, data: newHorario } };
    }
    return api.post('/horarios', horarioData);
  },
  update: async (id, horarioData) => {
    if (USE_MOCK) {
      await mockDelay();
      const index = mockData.horarios.findIndex(h => h._id === id);
      if (index !== -1) {
        mockData.horarios[index] = { ...mockData.horarios[index], ...horarioData };
        return { data: { success: true, data: mockData.horarios[index] } };
      }
      throw new Error('Horario no encontrado');
    }
    return api.put(`/horarios/${id}`, horarioData);
  },
  delete: async (id) => {
    if (USE_MOCK) {
      await mockDelay();
      mockData.horarios = mockData.horarios.filter(h => h._id !== id);
      return { data: { success: true, message: 'Horario eliminado' } };
    }
    return api.delete(`/horarios/${id}`);
  },
};

// ========== RECONOCIMIENTO FACIAL ==========
export const facialAPI = {
  recognize: async (imageBase64) => {
    if (USE_MOCK) {
      await mockDelay(1000);
      // Simular reconocimiento exitoso con usuario aleatorio
      const randomUser = mockData.usuarios[Math.floor(Math.random() * mockData.usuarios.length)];
      return {
        data: {
          success: true,
          rostros: [{
            usuario_id: randomUser._id,
            nombre: `${randomUser.nombre} ${randomUser.apellido}`,
            confianza: 0.95,
            reconocido: true
          }]
        }
      };
    }
    // En prod, enviar a API-IA
    const response = await axios.post('http://localhost:5000/recognize-and-mark', {
      image: imageBase64,
      tipo: 'entrada'
    });
    return response;
  },
  trainModel: async (userId) => {
    if (USE_MOCK) {
      await mockDelay(1500);
      return { data: { success: true, message: 'Modelo entrenado exitosamente' } };
    }
    return api.post(`/facial/train/${userId}`);
  },
};

export default api;
