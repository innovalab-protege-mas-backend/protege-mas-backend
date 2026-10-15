const db = require('../config/db');

// ============================================================================
// SERVICIOS DE GESTIÓN DE DISPOSITIVOS
// ============================================================================
  
const getDevicesByUser = async (userId) => {
  const result = await db.query(
    'SELECT * FROM devices WHERE id_user = $1 ORDER BY creation_time DESC',
    [userId]
  );
  return result.rows;
};

/**
 * Desvincula un dispositivo del tutor (revoca credenciales y apaga el flag de vinculación).
 */
const unlinkDevice = async (deviceUuid, deviceToken) => {
  // 1. Buscamos el dispositivo por su UUID para verificar su existencia y token
  const checkResult = await db.query(
    `SELECT id, device_token, linked FROM devices WHERE device_uuid = $1`,
    [deviceUuid]
  );

  if (checkResult.rows.length === 0) {
    throw new Error('DEVICE_NOT_FOUND');
  }

  const device = checkResult.rows[0];

  // 2. Validación cruzada: verificamos que el device_token del header coincida con el de la BD
  if (device.device_token !== deviceToken) {
    throw new Error('INVALID_DEVICE_CREDENTIALS');
  }

  // Si ya estaba deslinked, podemos manejarlo o proceder a actualizar igual
  if (!device.linked) {
    throw new Error('DEVICE_ALREADY_UNLINKED');
  }

  // 3. Ejecutamos la desvinculación y limpieza de credenciales
  const updateResult = await db.query(
    `UPDATE devices 
      SET linked = false,
          protection_status = false,
          device_token = NULL, 
          push_token = NULL 
      WHERE device_uuid = $1 
      RETURNING id, alias_name, linked, protection_status`,
    [deviceUuid]
  );

  return updateResult.rows[0];
};

module.exports = {
  getDevicesByUser,
  unlinkDevice,
};