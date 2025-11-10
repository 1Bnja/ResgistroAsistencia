const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  rut: String,
  nombre: String,
  apellido: String,
  email: String,
  cargo: String,
  departamento: String,
  rol: String,
  reconocimientoFacialActivo: Boolean,
  establecimientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establecimiento'
  },
  horarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horario'
  },
  activo: Boolean
}, { 
  timestamps: true,
  collection: 'usuarios'
});

module.exports = mongoose.model('Usuario', usuarioSchema);
