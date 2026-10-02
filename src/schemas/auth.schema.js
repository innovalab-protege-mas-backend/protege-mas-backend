const { z } = require('zod');

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  genero: z.string().optional(),
  fecha_nacimiento: z.string().optional() // Formato YYYY-MM-DD
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

module.exports = {
  registerSchema,
  loginSchema
};