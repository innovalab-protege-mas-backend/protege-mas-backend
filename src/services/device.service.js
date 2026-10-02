const db = require('../config/db');

const linkDevice = async (userId, data) => {
  const {
    nombre_alias,
    fecha_nacimiento,
    genero,
    device_uuid,
    modelo_os,
    push_token
  } = data;

  // Verificar si el dispositivo ya fue vinculado previamente
  const existingDevice = await db.query(
    'SELECT id FROM devices WHERE device_uuid = $1',
    [device_uuid]
  );

  if (existingDevice.rows.length > 0) {
    // Si ya existe, actualizamos su vinculación al usuario actual
    const result = await db.query(
      `UPDATE devices 
       SET id_user = $1, nombre_alias = $2, fecha_nacimiento = $3, genero = $4, 
           modelo_os = $5, vinculado = true, push_token = $6, ultimo_ping = CURRENT_TIMESTAMP
       WHERE device_uuid = $7
       RETURNING *`,
      [userId, nombre_alias, fecha_nacimiento || null, genero || null, modelo_os, push_token || null, device_uuid]
    );
    return result.rows[0];
  }

  // Si no existe, creamos un nuevo registro de dispositivo
  const result = await db.query(
    `INSERT INTO devices (id_user, nombre_alias, fecha_nacimiento, genero, device_uuid, modelo_os, push_token, ultimo_ping)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, nombre_alias, fecha_nacimiento || null, genero || null, device_uuid, modelo_os, push_token || null]
  );

  return result.rows[0];
};

const getDevicesByUser = async (userId) => {
  const result = await db.query(
    'SELECT * FROM devices WHERE id_user = $1 ORDER BY creation_time DESC',
    [userId]
  );
  return result.rows;
};

module.exports = {
  linkDevice,
  getDevicesByUser
};