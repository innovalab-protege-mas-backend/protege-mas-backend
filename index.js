const express = require('express');
const config = require('./src/config/config');
const authRoutes = require('./src/routes/auth.routes');
const deviceRoutes = require('./src/routes/device.routes');

const app = express();
app.use(express.json());

// Montar módulos de rutas
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);

app.listen(config.port || 3000, () => {
  console.log(`Servidor corriendo en el puerto ${config.port || 3000}`);
});