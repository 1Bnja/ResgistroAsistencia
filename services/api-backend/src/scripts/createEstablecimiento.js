require('dotenv').config();
const mongoose = require('mongoose');
const Establecimiento = require('../models/Establecimiento');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_WRITE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB conectado');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

const createEstablecimiento = async () => {
  try {
    await connectDB();

    // Verificar si ya existe
    const existente = await Establecimiento.findOne({ codigo: 'EST001' });
    if (existente) {
      console.log('⚠️ Establecimiento EST001 ya existe');
      console.log('Establecimiento:', existente);
      process.exit(0);
    }

    // Crear establecimiento por defecto
    const establecimiento = await Establecimiento.create({
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

    console.log('✅ Establecimiento creado exitosamente');
    console.log('ID:', establecimiento._id);
    console.log('Nombre:', establecimiento.nombre);
    console.log('Código:', establecimiento.codigo);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando establecimiento:', error.message);
    process.exit(1);
  }
};

createEstablecimiento();
