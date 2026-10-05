const db = require('../config/db');

// Evalúa si un evento es crítico según el diagrama de clases
const esCritico = (tipoEvento) => {
  const eventosCriticos = ['uninstall_attempt', 'lotba', 'score_exceeded'];
  return eventosCriticos.includes(tipoEvento);
};

// Insertar un único evento en la base de datos
const createSingleEvent = async (eventData) => {
  const { device_uuid, tipo_evento, url, detalle, es_sensible, event_time } = eventData;

  // 1. Obtener ID del dispositivo
  const deviceResult = await db.query(
    'SELECT id FROM devices WHERE device_uuid = $1',
    [device_uuid]
  );

  if (deviceResult.rows.length === 0) {
    throw new Error('DEVICE_NOT_FOUND');
  }

  const deviceId = deviceResult.rows[0].id;

  // 2. Insertar respetando los nombres exactos de la tabla en el DER
  const query = `
    INSERT INTO protection_events (id_device, tipo_evento, url, detalle, event_time)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    deviceId,
    tipo_evento,
    url || null,
    JSON.stringify(detalle || {}),
    event_time || new Date()
  ];

  const result = await db.query(query, values);
  const createdEvent = result.rows[0];

  // Agregamos la respuesta calculada de esCritico()
  return {
    ...createdEvent,
    es_critico: esCritico(createdEvent.tipo_evento)
  };
};

// Reportar uno o varios eventos (Batch processing)
const registrarEvento = async (data) => {
  if (Array.isArray(data)) {
    const results = [];
    for (const singleData of data) {
      const inserted = await createSingleEvent(singleData);
      results.push(inserted);
    }
    return results;
  }

  return await createSingleEvent(data);
};

// Consultar eventos para la app del tutor
const getEventsByTutor = async (userId, filterDeviceId = null) => {
  let query = `
    SELECT 
      pe.id,
      pe.id_device,
      d.nombre_alias,
      d.modelo_os,
      pe.tipo_evento,
      pe.url,
      pe.detalle,
      pe.event_time
    FROM protection_events pe
    INNER JOIN devices d ON pe.id_device = d.id
    WHERE d.id_user = $1
  `;

  const queryParams = [userId];

  if (filterDeviceId) {
    query += ` AND d.id = $2`;
    queryParams.push(filterDeviceId);
  }

  query += ` ORDER BY pe.event_time DESC`;

  const result = await db.query(query, queryParams);

  // Mapeamos los resultados con es_critico
  return result.rows.map(event => ({
    ...event,
    es_critico: esCritico(event.tipo_evento)
  }));
};

module.exports = {
  registrarEvento,
  getEventsByTutor
};