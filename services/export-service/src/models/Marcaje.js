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
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: ['puntual', 'atraso', 'anticipado', 'ausente'],
    default: 'puntual'
  },
  minutosAtraso: {
    type: Number,
    default: 0
  },
  ubicacion: {
    type: String,
    default: 'Terminal Principal'
  },
  observaciones: String,
  notificacionEnviada: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'marcajes'
});

module.exports = mongoose.model('Marcaje', marcajeSchema);
