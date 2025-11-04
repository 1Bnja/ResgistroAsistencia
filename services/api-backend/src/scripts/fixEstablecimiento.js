require('dotenv').config();
const mongoose = require('mongoose');

const fixEstablecimiento = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_WRITE_URI;
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');

    const estCollection = mongoose.connection.db.collection('establecimientos');
    
    // Buscar o crear establecimiento
    let est = await estCollection.findOne({ codigo: 'EST001' });
    
    if (!est) {
      const result = await estCollection.insertOne({
        nombre: 'Establecimiento Principal',
        codigo: 'EST001',
        direccion: 'Dirección Principal',
        comuna: 'Santiago',
        region: 'Metropolitana',
        telefono: '+56 2 2345 6789',
        email: 'contacto@establecimiento.cl',
        director: 'Director Principal',
        tipo: 'basica',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      est = await estCollection.findOne({ _id: result.insertedId });
      console.log('✅ Establecimiento creado:', est.nombre);
    } else {
      console.log('✅ Establecimiento encontrado:', est.nombre);
    }

    // Actualizar todos los usuarios que no tienen establecimiento
    const usuCollection = mongoose.connection.db.collection('usuarios');
    const updateResult = await usuCollection.updateMany(
      { $or: [{ establecimientoId: { $exists: false } }, { establecimientoId: null }] },
      { $set: { establecimientoId: est._id } }
    );

    console.log('✅ Usuarios actualizados:', updateResult.modifiedCount);

    // Verificar el usuario admin
    const admin = await usuCollection.findOne({ email: 'admin@asistencia.cl' });
    console.log('\nUsuario Admin:');
    console.log('- Email:', admin.email);
    console.log('- Rol:', admin.rol);
    console.log('- Establecimiento ID:', admin.establecimientoId ? 'Sí' : 'No');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixEstablecimiento();
