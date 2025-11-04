const mongoose = require('mongoose');

const establecimientoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  codigo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  direccion: {
    type: String,
    required: true,
    trim: true
  },
  comuna: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  director: {
    type: String,
    trim: true
  },
  tipo: {
    type: String,
    enum: ['basica', 'media', 'tecnico', 'universitario', 'instituto', 'otro'],
    default: 'basica'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
establecimientoSchema.index({ nombre: 1, activo: 1 });
establecimientoSchema.index({ codigo: 1 });

module.exports = mongoose.model('Establecimiento', establecimientoSchema);
