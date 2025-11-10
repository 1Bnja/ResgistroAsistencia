const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  nombre: String,
  horaEntrada: String,
  horaSalida: String,
  toleranciaMinutos: Number,
  diasSemana: [Number],
  activo: Boolean
}, {
  timestamps: true,
  collection: 'horarios'
});

module.exports = mongoose.model('Horario', horarioSchema);
