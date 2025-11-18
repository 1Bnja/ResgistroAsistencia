const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  rut: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  cargo: {
    type: String,
    required: true
  },
  departamento: {
    type: String,
    required: true
  },
  rol: {
    type: String,
    enum: ['funcionario', 'admin', 'superadmin'],
    default: 'funcionario'
  },
  password: {
    type: String,
    required: true, // Ahora TODOS los usuarios requieren contraseña
    select: false // No retornar en queries por defecto
  },
  fotoFacial: {
    type: String, // Base64 o URL de la imagen
    required: false
  },
  encodingFacial: {
    type: String, // Encoding procesado por IA
    required: false
  },
  reconocimientoFacialActivo: {
    type: Boolean,
    default: false
  },
  establecimientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Establecimiento',
    required: true
  },
  horarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horario',
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  ultimoAcceso: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password antes de guardar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar passwords
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obtener datos públicos
usuarioSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.encodingFacial;
  return obj;
};

module.exports = mongoose.model('Usuario', usuarioSchema);