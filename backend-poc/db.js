const { Pool } = require('pg');

// Configuración de la conexión a PostgreSQL local
const pool = new Pool({
  user: 'postgres',           // Tu usuario de postgres (suele ser 'postgres')
  host: 'localhost',
  database: 'alerta_infantil_db', // El nombre de la BBDD que creaste
  password: 'tu_password',    // La contraseña que le pusiste a postgres
  port: 5432,
});

module.exports = pool;