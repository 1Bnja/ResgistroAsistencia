require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

const usuarioSchema = new mongoose.Schema({
  rut: String,
  nombre: String,
  apellido: String,
  email: String,
  cargo: String,
  departamento: String,
  rol: String,
  password: String,
  reconocimientoFacialActivo: Boolean,
  establecimientoId: mongoose.Schema.Types.ObjectId,
  horarioId: mongoose.Schema.Types.ObjectId,
  activo: Boolean
}, { timestamps: true });

const horarioSchema = new mongoose.Schema({
  nombre: String,
  horaEntrada: String,
  horaSalida: String,
  toleranciaMinutos: Number,
  diasSemana: [Number],
  activo: Boolean
}, { timestamps: true });

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
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', usuarioSchema);
const Horario = mongoose.model('Horario', horarioSchema);
const Establecimiento = mongoose.model('Establecimiento', establecimientoSchema);

async function createAdminUser() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const adminExistente = await Usuario.findOne({ email: 'admin@asistencia.cl' });
    if (adminExistente) {
      console.log('⚠️  El usuario admin ya existe');
      process.exit(0);
    }

    // Crear o buscar establecimiento por defecto
    console.log('🔄 Verificando establecimiento por defecto...');
    let establecimiento = await Establecimiento.findOne({ codigo: 'EST001' });
    if (!establecimiento) {
      establecimiento = await Establecimiento.create({
        nombre: 'Establecimiento Principal',
        codigo: 'EST001',
        direccion: 'Dirección Principal',
        comuna: 'Santiago',
        region: 'Metropolitana',
        telefono: '+56 2 2345 6789',
        email: 'contacto@establecimiento.cl',
        director: 'Director Principal',
        tipo: 'basica',
        activo: true
      });
      console.log('✅ Establecimiento creado:', establecimiento.nombre);
    } else {
      console.log('✅ Establecimiento encontrado:', establecimiento.nombre);
    }

    // Crear horario por defecto
    console.log('🔄 Creando horario por defecto...');
    const horario = await Horario.create({
      nombre: 'Horario Oficina',
      horaEntrada: '08:00',
      horaSalida: '17:00',
      toleranciaMinutos: 15,
      diasSemana: [1, 2, 3, 4, 5], // Lunes a Viernes
      activo: true
    });
    console.log('✅ Horario creado:', horario.nombre);

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Crear usuario admin
    console.log('🔄 Creando usuario administrador...');
    const admin = await Usuario.create({
      rut: '12345678-9',
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@asistencia.cl',
      cargo: 'Administrador del Sistema',
      departamento: 'TI',
      rol: 'superadmin',
      password: hashedPassword,
      reconocimientoFacialActivo: false,
      establecimientoId: establecimiento._id,
      horarioId: horario._id,
      activo: true
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('');
    console.log('📋 Credenciales de acceso:');
    console.log('   Email: admin@asistencia.cl');
    console.log('   Contraseña: admin123');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
