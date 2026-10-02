const { z } = require('zod');

const consumeCodeSchema = z.object({
  code: z.string().length(6, 'El código debe tener exactamente 6 dígitos'),
  nombre_alias: z.string().min(2, 'El alias del menor es requerido'),
  fecha_nacimiento: z.string().optional(),
  genero: z.string().optional(),
  device_uuid: z.string().min(1, 'El identificador del dispositivo es requerido'),
  modelo_os: z.string().min(1, 'El modelo u SO es requerido'),
  push_token: z.string().optional()
});

module.exports = {
  consumeCodeSchema
};