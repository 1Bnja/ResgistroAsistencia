const mongoose = require('mongoose');

// --- MEJORA ---
// Es una mejor práctica registrar los 'listeners' de eventos
// globales una sola vez, fuera de la función de conexión.
// Así se asegura de que siempre estén escuchando.
mongoose.connection.on('error', (err) => {
  console.error('❌ Error de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB desconectado');
});

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
     
     // Los 'listeners' ya fueron movidos arriba.

     } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
         process.exit(1);
     }
};

module.exports = connectDB;