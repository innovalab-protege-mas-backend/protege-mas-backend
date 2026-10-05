const { z } = require('zod');

const EVENT_TYPES = [
  'blocked_access',
  'uninstall_attempt',
  'app_install_attempt',
  'os_permission_change',
  'lotba',
  'custom',
  'score_exceeded'
];

const singleEventSchema = z.object({
  device_uuid: z.string({ message: 'El device_uuid es obligatorio' }).min(1, { message: 'El device_uuid no puede estar vacío' }),
  tipo_evento: z.enum(EVENT_TYPES, { message: 'Tipo de evento no válido' }),
  url: z.string().nullable().optional(),
  detalle: z.record(z.any()).optional().default({}), 
  es_sensible: z.boolean().optional().default(false),
  event_time: z.string().optional() // Acepta el string ISO enviado por el cliente
});

const reportEventSchema = z.union([
  singleEventSchema,
  z.array(singleEventSchema)
]);

module.exports = {
  reportEventSchema,
  EVENT_TYPES
};