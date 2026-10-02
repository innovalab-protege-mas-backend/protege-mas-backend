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
const consumePairingCode = async (data) => {
  const { code, ...deviceData } = data;

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

  // 4. Reutilizar el servicio de devices para crear o actualizar el equipo
  const userId = matchedRecord.id_user;
  const device = await deviceService.linkDevice(userId, deviceData);

  // 5. Registrar la sesión de dispositivo en device_sessions
  const deviceToken = crypto.randomBytes(32).toString('hex');
  const deviceTokenHash = await bcrypt.hash(deviceToken, 10);
  const sessionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año

  await db.query(
    `INSERT INTO device_sessions (id_device, device_token_hash, is_active, expires_at)
     VALUES ($1, $2, true, $3)`,
    [device.id, deviceTokenHash, sessionExpiresAt]
  );
  
  return {
    device,
    deviceToken // Devolvemos el token en texto plano para que la app del menor lo guarde
  };
};

module.exports = {
  generatePairingCode,
  consumePairingCode
};