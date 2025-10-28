const mongoose = require('mongoose');

// Listeners globales de conexión (registrados una vez)
mongoose.connection.on('error', (err) => {
    console.error('❌ Error de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB desconectado');
});

const connectDB = async () => {
    try {
        // Selección de URI según ROLE
        const role = (process.env.ROLE || '').toLowerCase();
        const writeUri = process.env.MONGODB_WRITE_URI || process.env.MONGODB_URI;
        const readUri = process.env.MONGODB_READ_URI || process.env.MONGODB_URI;

        // Advertencia: si estamos en modo slave pero no hay una URI de lectura explícita
        if (role === 'slave' && !process.env.MONGODB_READ_URI) {
            console.warn('⚠️ ROLE=slave pero MONGODB_READ_URI no está definida. La slave usará MONGODB_URI como fallback — esto no proporciona réplica real.');
        }

        const uri = role === 'slave' ? readUri : writeUri;

        const conn = await mongoose.connect(uri, {
            // opciones: usar URL parser y topologies modernas
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // si se define MONGODB_DB_NAME, explícala para mayor claridad
            dbName: process.env.MONGODB_DB_NAME || undefined,
        });

        console.log(`✅ MongoDB conectado (${role || 'default'}): ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;