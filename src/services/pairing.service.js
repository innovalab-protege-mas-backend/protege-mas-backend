const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

// ============================================================================
// SERVICIOS DE EMPAREJAMIENTO DE DISPOSITIVOS (PAIRING)
// ============================================================================

/**
 * Genera un código PIN aleatorio de 6 dígitos para que el tutor inicie el emparejamiento.
 * El código se almacena encriptado (Bcrypt) y vence a los 15 minutos.
 * @param {string} userId - UUID del tutor autenticado.
 * @returns {Promise<{code: string, expiresAt: Date}>} Código en texto plano para mostrar al tutor y fecha de expiración.
 */
const generatePairingCode = async (userId) => {
  const plainCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(plainCode, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Expiración: 15 minutos

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

/**
 * Valida y consume el código de emparejamiento ingresado desde el dispositivo del menor.
 * Ejecuta una transacción atómica para marcar el código como usado e insertar/actualizar el dispositivo.
 * @param {Object} params - Datos enviados desde la aplicación del menor.
 * @param {string} params.code - Código PIN numérico de 6 dígitos ingresado.
 * @param {string} params.device_uuid - UUID único del hardware del dispositivo.
 * @param {string} params.nombre_alias - Nombre asignado al dispositivo.
 * @param {string} params.modelo_os - Sistema operativo y versión del dispositivo.
 * @param {string} params.push_token - Token de notificación push del dispositivo. 
 * @returns {Promise<Object>} Registro del dispositivo creado o actualizado.
 */
const consumePairingCode = async ({ code, device_uuid, nombre_alias, fecha_nacimiento, genero, modelo_os, push_token }) => {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 1. Consultar todos los códigos activos no consumidos y dentro del rango de tiempo válido
    const activeCodesResult = await client.query(
      `SELECT * FROM pairing_codes 
       WHERE used = false AND expires_at > NOW()`
    );

    if (activeCodesResult.rows.length === 0) {
      throw new Error('INVALID_OR_EXPIRED_CODE');
    }

    // 2. Comparar la clave ingresada contra los hashes de los códigos activos
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

    // 3. Marcar el código de emparejamiento como consumido (used = true)
    await client.query(
      `UPDATE pairing_codes SET used = true WHERE id = $1`,
      [validPairingRecord.id]
    );

    // 4. Generar Credencial Revocable (Device Token)
    const deviceToken = `dev_ak_${crypto.randomBytes(32).toString('hex')}`;

    // 5. Crear o actualizar el dispositivo asociando la nueva credencial
    const deviceResult = await client.query(
      `INSERT INTO devices (id_user, device_uuid, nombre_alias, fecha_nacimiento, genero, modelo_os, device_token, push_token, vinculado, ultimo_ping)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, CURRENT_TIMESTAMP)
       ON CONFLICT (device_uuid) DO UPDATE 
       SET id_user = EXCLUDED.id_user, 
           nombre_alias = EXCLUDED.nombre_alias, 
           fecha_nacimiento = EXCLUDED.fecha_nacimiento,
           genero = EXCLUDED.genero,
           modelo_os = EXCLUDED.modelo_os,
           device_token = EXCLUDED.device_token,
           push_token = EXCLUDED.push_token,
           vinculado = true,
           ultimo_ping = CURRENT_TIMESTAMP
       RETURNING *`,
      [validPairingRecord.id_user, 
        device_uuid, 
        nombre_alias, 
        fecha_nacimiento || null,
        genero || null,
        modelo_os, 
        deviceToken, 
        push_token || null
      ]
    );
    
    await client.query('COMMIT');

    return {
      device: deviceResult.rows[0],
    };

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