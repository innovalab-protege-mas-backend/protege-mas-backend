const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db'); // Importamos la conexión que creamos en db.js
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = express();

const JWT_SECRET = 'secreto_super_seguro_poc';

// Middleware obligatorio para que Express entienda el formato JSON que le mandamos
app.use(express.json());

// -------------------------------------------------------------
// 1. ENDPOINT DE SALUD (GET /health)
// Sirve para probar que el servidor responde sin tocar la BBDD aún.
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'El servidor backend está vivo',
    timestamp: new Date() 
  });
});

// -------------------------------------------------------------
// 2. ENDPOINT DE REGISTRO (POST /api/users/register)
// Guarda un usuario en PostgreSQL con su contraseña encriptada.
// -------------------------------------------------------------
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Encriptar la contraseña recibida
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Insertar en la tabla 'users' de PostgreSQL
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    // 3. Responder con el usuario recién creado (sin devolver la contraseña)
    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

// Arrancar el servidor en el puerto 3000
const PUERTO = 3000;
app.listen(PUERTO, () => {
  console.log(` Servidor corriendo exitosamente en http://localhost:${PUERTO}`);
});

// -------------------------------------------------------------
// 3. ENDPOINT DE LOGIN (POST /api/auth/login)
// Verifica credenciales y devuelve un Token JWT
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // A. Buscar el usuario por email
    const userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];

    // B. Comparar la contraseña ingresada con el hash guardado
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // C. Generar el Token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // D. Responder con el token y datos públicos del usuario
    res.json({
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor: ' + error.message });
  }
});