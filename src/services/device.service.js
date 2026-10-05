const db = require('../config/db');

// ============================================================================
// SERVICIOS DE GESTIÓN Y VINCULACIÓN DE DISPOSITIVOS
// ============================================================================

/**
 * Vincula un nuevo dispositivo a la cuenta de un tutor o actualiza su información si ya existía.
 * @param {string} userId - UUID del tutor autenticado.
 * @param {Object} data - Información técnica y perfil del dispositivo.
 * @param {string} data.nombre_alias - Nombre o alias asignado al dispositivo (ej. "Teléfono de Santi").
 * @param {string} [data.fecha_nacimiento] - Fecha de nacimiento del menor.
 * @param {string} [data.genero] - Género del menor.
 * @param {string} data.device_uuid - Identificador único de hardware/SO.
 * @param {string} data.modelo_os - Modelo y versión del sistema operativo.
 * @param {string} [data.push_token] - Token para notificaciones push asignado al dispositivo.
 * @returns {Promise<Object>} Registro del dispositivo guardado o actualizado en BD.
 */
const linkDevice = async (userId, data) => {
  const {
    nombre_alias,
    fecha_nacimiento,
    genero,
    device_uuid,
    modelo_os,
    push_token
  } = data;

  // 1. Verificar si el dispositivo ya fue registrado previamente mediante su UUID
  const existingDevice = await db.query(
    'SELECT id FROM devices WHERE device_uuid = $1',
    [device_uuid]
  );

  if (existingDevice.rows.length > 0) {
    // Si ya existe, se reactiva la vinculación y se actualiza al nuevo tutor y datos
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

  // 2. Si no existe, se crea un nuevo registro en la tabla 'devices'
  const result = await db.query(
    `INSERT INTO devices (id_user, nombre_alias, fecha_nacimiento, genero, device_uuid, modelo_os, push_token, ultimo_ping)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, nombre_alias, fecha_nacimiento || null, genero || null, device_uuid, modelo_os, push_token || null]
  );

  return result.rows[0];
};

/**
 * Obtiene el listado de todos los dispositivos vinculados a un tutor.
 * @param {string} userId - UUID del tutor autenticado.
 * @returns {Promise<Array<Object>>} Colección de dispositivos ordenados por fecha de creación.
 */
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