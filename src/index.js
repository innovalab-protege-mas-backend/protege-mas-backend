const express = require('express');
const config = require('./config/config');
const authRoutes = require('./routes/auth.routes');
const deviceRoutes = require('./routes/device.routes');
const pairingRoutes = require('./routes/pairing.routes');
const eventRoutes = require('./routes/event.routes');

const app = express();
app.use(express.json());

// Montar módulos de rutas --> index.js envía la petición a los routers correspondientes
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/pairing', pairingRoutes);
app.use('/events', eventRoutes);

app.listen(config.port || 3000, () => {
  console.log(`Servidor corriendo en el puerto ${config.port || 3000}`);
});