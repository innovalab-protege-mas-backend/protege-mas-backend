const { z } = require('zod');

const linkDeviceSchema = z.object({
  nombre_alias: z.string().min(2, 'El alias o nombre del menor debe tener al menos 2 caracteres'),
  fecha_nacimiento: z.string().optional(),
  genero: z.string().optional(),
  device_uuid: z.string().min(1, 'El identificador único del dispositivo es requerido'),
  modelo_os: z.string().min(1, 'El modelo/SO del dispositivo es requerido'),
  push_token: z.string().optional()
});

module.exports = {
  linkDeviceSchema
};