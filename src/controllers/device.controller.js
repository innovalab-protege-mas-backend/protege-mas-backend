const deviceService = require('../services/device.service');

// ============================================================================
// CONTROLADOR DE GESTIÓN DE DISPOSITIVOS
// ============================================================================

/**
 * Consulta la lista de dispositivos asignados al tutor en sesión.
 * @route GET /api/devices
 */
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
  getDevices
};