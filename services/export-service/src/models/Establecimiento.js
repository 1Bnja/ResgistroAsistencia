const mongoose = require('mongoose');

const establecimientoSchema = new mongoose.Schema({
  nombre: String,
  codigo: String,
  direccion: String,
  comuna: String,
  region: String,
  telefono: String,
  email: String,
  director: String,
  tipo: String,
  activo: Boolean
}, {
  timestamps: true,
  collection: 'establecimientos'
});

module.exports = mongoose.model('Establecimiento', establecimientoSchema);
