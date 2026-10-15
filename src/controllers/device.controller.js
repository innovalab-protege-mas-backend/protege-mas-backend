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

/**
 * Desvincula un dispositivo del tutor (revoca credencial y cambia estado a no vinculado).
 */
const unlinkDevice = async (req, res) => {
  try {
    const { deviceUuid } = req.params;
    
    // Extraemos el token del header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Token de dispositivo ausente en los headers' 
      });
    }

    const deviceToken = authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : authHeader;

    const unlinkedDevice = await deviceService.unlinkDevice(deviceUuid, deviceToken);

    return res.status(200).json({
      message: 'Dispositivo desvinculado y credencial revocada con éxito',
      device: unlinkedDevice
    });
  } catch (error) {
    if (error.message === 'DEVICE_NOT_FOUND') {
      return res.status(404).json({ error: 'El dispositivo no existe' });
    }
    if (error.message === 'INVALID_DEVICE_CREDENTIALS') {
      return res.status(401).json({ error: 'Inconsistencia en las credenciales del dispositivo (device_token inválido)' });
    }
    if (error.message === 'DEVICE_ALREADY_UNLINKED') {
      return res.status(400).json({ error: 'El dispositivo ya se encuentra desvinculado' });
    }

    console.error('Error al desvincular dispositivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getDevices,
  unlinkDevice
};