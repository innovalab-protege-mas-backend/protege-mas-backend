const deviceService = require('../services/device.service');
const { linkDeviceSchema } = require('../schemas/device.schema');

const linkDevice = async (req, res) => {
  try {
    const validatedData = linkDeviceSchema.parse(req.body);
    const userId = req.user.id; // Obtenido desde el token mediante el authMiddleware

    const device = await deviceService.linkDevice(userId, validatedData);
    return res.status(201).json({
      message: 'Dispositivo vinculado con éxito',
      device
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error al vincular dispositivo:', error);
    return res.status(500).json({ error: 'Error interno al vincular dispositivo' });
  }
};

const getDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await deviceService.getDevicesByUser(userId);
    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Error al obtener dispositivos:', error);
    return res.status(500).json({ error: 'Error interno al obtener dispositivos' });
  }
};

module.exports = {
  linkDevice,
  getDevices
};