require('dotenv').config();
const mongoose = require('mongoose');

const updateAdminToSuperadmin = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_WRITE_URI;
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');

    const result = await mongoose.connection.db.collection('usuarios').updateOne(
      { email: 'admin@asistencia.cl' },
      { $set: { rol: 'superadmin' } }
    );

    console.log('Documentos actualizados:', result.modifiedCount);

    const user = await mongoose.connection.db.collection('usuarios').findOne({ email: 'admin@asistencia.cl' });
    console.log('\n✅ Usuario actualizado:');
    console.log('Email:', user.email);
    console.log('Nombre:', user.nombre, user.apellido);
    console.log('Rol:', user.rol);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateAdminToSuperadmin();
