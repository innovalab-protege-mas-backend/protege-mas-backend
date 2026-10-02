const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

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

const login = async ({ email, password }) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    throw new Error('CREDANCIALES_INVALIDAS');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('CREDANCIALES_INVALIDAS');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret || 'secret_key',
    { expiresIn: '24h' }
  );

  return { 
    token, 
    user: { 
      id: user.id, 
      nombre: user.nombre, 
      apellido: user.apellido, 
      email: user.email 
    } 
  };
};

module.exports = {
  register,
  login
};