const mongoose = require('mongoose');

const marcajeSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo: {
    type: String,
    enum: ['entrada', 'salida'],
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now,
    required: true
  },
  hora: {
    type: String, // Formato "HH:mm:ss"
    required: true
  },
  estado: {
    type: String,
    enum: ['puntual', 'atraso', 'anticipado', 'ausente', 'salida_anticipada', 'salida_normal'],
    default: 'puntual'
  },
  minutosAtraso: {
    type: Number,
    default: 0
  },
  imagenMarcaje: {
    type: String, // Base64 de la imagen capturada
    required: false
  },
  ubicacion: {
    type: String,
    default: 'Terminal Principal'
  },
  confianzaIA: {
    type: Number, // Nivel de confianza del reconocimiento facial (0-1)
    required: false
  },
  metodoMarcaje: {
    type: String,
    enum: ['automatico', 'manual'],
    default: 'automatico' // Por defecto asume reconocimiento facial automático
  },
  observaciones: {
    type: String
  },
  notificacionEnviada: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas
marcajeSchema.index({ usuarioId: 1, fecha: -1 });
marcajeSchema.index({ fecha: -1 });

module.exports = mongoose.model('Marcaje', marcajeSchema);