const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

const register = async ({ nombre, apellido, email, password, genero, fecha_nacimiento }) => {
  // 1. Verificar si el email ya existe
  const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('EL_EMAIL_YA_EXISTE');
  }

  // 2. Hash de contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Insertar con los campos del DER
  const result = await db.query(
    `INSERT INTO users (nombre, apellido, email, password_hash, genero, fecha_nacimiento) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id, nombre, apellido, email, creation_time`,
    [nombre || null, apellido || null, email, hashedPassword, genero || null, fecha_nacimiento || null]
  );

  return result.rows[0];
};

const login = async (credentials, reqInfo = {}) => {
  const { email, password } = credentials;

  // 1. Validar existencia del usuario
  const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error('CREDANCIALES_INVALIDAS');
  }

  // 2. Firmar JWT para el tutor
  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // 3. Crear hash del refresh token y guardar la User Session
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  await db.query(
    `INSERT INTO user_sessions (id_user, refresh_token_hash, push_token, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.id,
      refreshTokenHash,
      reqInfo.pushToken || null,
      reqInfo.deviceInfo || null,
      reqInfo.ipAddress || null,
      expiresAt
    ]
  );

  return {
    message: 'Login exitoso',
    user: { id: user.id, email: user.email, nombre: user.nombre },
    token,
    refreshToken
  };
};

module.exports = {
  register,
  login
};