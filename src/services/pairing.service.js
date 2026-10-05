const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const deviceService = require('./device.service');

// Generar un código numérico aleatorio de 6 dígitos para el tutor
const generatePairingCode = async (userId) => {
  const plainCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(plainCode, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  const result = await db.query(
    `INSERT INTO pairing_codes (id_user, code_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, expires_at`,
    [userId, codeHash, expiresAt]
  );

  return {
    code: plainCode,
    expiresAt: result.rows[0].expires_at
  };
};

// Consumir el código desde el dispositivo del menor
const consumePairingCode = async ({ code, device_uuid, nombre_alias, modelo_os }) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener los códigos activos no consumidos y no vencidos
    const activeCodesResult = await client.query(
      `SELECT * FROM pairing_codes 
       WHERE used = false AND expires_at > NOW()`
    );

    if (activeCodesResult.rows.length === 0) {
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }

    const pairingRecord = activeCodeResult.rows[0];

    // 2. Buscar el registro que coincida con el hash de bcrypt
    let validPairingRecord = null;
    for (const record of activeCodesResult.rows) {
      const isMatch = await bcrypt.compare(code, record.code_hash);
      if (isMatch) {
        validPairingRecord = record;
        break;
      }
    }

    if (!validPairingRecord) {
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }

    // 3. Marcar código como usado (used = true)
    await client.query(
      `UPDATE pairing_codes SET used = true WHERE id = $1`,
      [validPairingRecord.id]
    );

    // 4. Crear o actualizar el dispositivo asociado al tutor
    const deviceResult = await client.query(
      `INSERT INTO devices (id_user, device_uuid, nombre_alias, modelo_os)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (device_uuid) DO UPDATE 
       SET id_user = EXCLUDED.id_user, 
           nombre_alias = EXCLUDED.nombre_alias, 
           modelo_os = EXCLUDED.modelo_os
       RETURNING *`,
      [validPairingRecord.id_user, device_uuid, nombre_alias, modelo_os]
    );

    await client.query('COMMIT');
    return deviceResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  generatePairingCode,
  consumePairingCode
};