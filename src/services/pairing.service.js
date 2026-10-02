const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Generar un código numérico aleatorio de 6 dígitos para el tutor
const generatePairingCode = async (userId) => {
  // 1. Generar código de 6 dígitos (ej. "482910")
  const plainCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Hashear el código por seguridad
  const codeHash = await bcrypt.hash(plainCode, 10);

  // 3. Expiración en 15 minutos
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // 4. Guardar en DB
  const result = await db.query(
    `INSERT INTO pairing_codes (id_user, code_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, expires_at`,
    [userId, codeHash, expiresAt]
  );

  return {
    code: plainCode, // Se lo mostramos al tutor en pantalla
    expiresAt: result.rows[0].expires_at
  };
};

// Consumir el código desde el dispositivo del menor
const consumePairingCode = async (data) => {
  const {
    code,
    nombre_alias,
    fecha_nacimiento,
    genero,
    device_uuid,
    modelo_os,
    push_token
  } = data;

  // 1. Buscar códigos vigentes no usados
  const activeCodesResult = await db.query(
    `SELECT * FROM pairing_codes 
     WHERE used = false AND expires_at > CURRENT_TIMESTAMP`
  );

  const activeCodes = activeCodesResult.rows;

  if (activeCodes.length === 0) {
    throw new Error('Código de vinculación inválido o expirado.');
  }

  // 2. Verificar cuál código coincide con el hash
  let matchedRecord = null;
  for (const record of activeCodes) {
    const isMatch = await bcrypt.compare(code, record.code_hash);
    if (isMatch) {
      matchedRecord = record;
      break;
    }
  }

  if (!matchedRecord) {
    throw new Error('Código de vinculación incorrecto o expirado.');
  }

  // 3. Marcar código como usado
  await db.query(
    'UPDATE pairing_codes SET used = true WHERE id = $1',
    [matchedRecord.id]
  );

  // 4. Registrar o actualizar el dispositivo asociado al id_user del tutor
  const userId = matchedRecord.id_user;

  const existingDevice = await db.query(
    'SELECT id FROM devices WHERE device_uuid = $1',
    [device_uuid]
  );

  let device;
  if (existingDevice.rows.length > 0) {
    const updated = await db.query(
      `UPDATE devices 
       SET id_user = $1, nombre_alias = $2, fecha_nacimiento = $3, genero = $4, 
           modelo_os = $5, vinculado = true, push_token = $6, ultimo_ping = CURRENT_TIMESTAMP
       WHERE device_uuid = $7
       RETURNING *`,
      [userId, nombre_alias, fecha_nacimiento || null, genero || null, modelo_os, push_token || null, device_uuid]
    );
    device = updated.rows[0];
  } else {
    const inserted = await db.query(
      `INSERT INTO devices (id_user, nombre_alias, fecha_nacimiento, genero, device_uuid, modelo_os, push_token, ultimo_ping)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, nombre_alias, fecha_nacimiento || null, genero || null, device_uuid, modelo_os, push_token || null]
    );
    device = inserted.rows[0];
  }

  return device;
};

module.exports = {
  generatePairingCode,
  consumePairingCode
};