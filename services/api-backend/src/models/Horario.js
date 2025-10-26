const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  horaEntrada: {
    type: String, // Formato "HH:mm" (ej: "09:00")
    required: true
  },
  horaSalida: {
    type: String,
    required: true
  },
  toleranciaMinutos: {
    type: Number,
    default: 15 // 15 minutos de tolerancia
  },
  diasLaborales: {
    type: [Number], // 1=Lunes, 2=Martes, ..., 7=Domingo
    default: [1, 2, 3, 4, 5] // Lunes a Viernes
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Horario', horarioSchema);