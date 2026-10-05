const db = require('../config/db');
const notificationService = require('./notifications/notification.service');

// Evalúa si un evento es crítico según el diagrama de clases
const esCritico = (tipoEvento) => {
  const eventosCriticos = ['uninstall_attempt', 'lotba', 'score_exceeded'];
  return eventosCriticos.includes(tipoEvento);
};

// Genera un título y cuerpo amigable para la notificación según el evento
const construirMensajeNotificacion = (tipoEvento, aliasDispositivo, url) => {
  switch (tipoEvento) {
    case 'lotba':
      return {
        title: `🚨 Alerta de Apuestas en ${aliasDispositivo}`,
        body: `Se detectó e interrumpió un intento de acceso a sitio de apuestas${url ? `: ${url}` : '.'}`
      };
    case 'uninstall_attempt':
      return {
        title: `⚠️ Intento de Desinstalación`,
        body: `Se intentó desinstalar la app de protección en el dispositivo de ${aliasDispositivo}.`
      };
    case 'score_exceeded':
      return {
        title: `🔴 Umbral de Riesgo Excedido`,
        body: `El nivel de riesgo acumulado en ${aliasDispositivo} superó el límite permitido.`
      };
    default:
      return {
        title: `🔔 Alerta de Protección en ${aliasDispositivo}`,
        body: `Se registró un evento crítico de tipo: ${tipoEvento}`
      };
  }
};

// Busca los push_tokens del tutor y despacha las notificaciones
const procesarAlertaSiCorresponde = async (evento, deviceId) => {
  if (!esCritico(evento.tipo_evento)) {
    return null; // No es crítico, no se envía notificación
  }

  // 1. Obtener los push_tokens de las sesiones activas del tutor dueño del dispositivo
  const query = `
    SELECT us.push_token, d.nombre_alias
    FROM devices d
    INNER JOIN user_sessions us ON us.id_user = d.id_user
    WHERE d.id = $1 
      AND us.is_active = true 
      AND us.push_token IS NOT NULL
  `;

  const result = await db.query(query, [deviceId]);

  if (result.rows.length === 0) {
    console.log(`[Alertas] Evento crítico detectado (${evento.tipo_evento}), pero no hay tokens Push activos para el tutor.`);
    return null;
  }

  const aliasDispositivo = result.rows[0].nombre_alias || 'Dispositivo Protegido';
  const { title, body } = construirMensajeNotificacion(evento.tipo_evento, aliasDispositivo, evento.url);

  // 2. Enviar notificación a cada sesión activa del tutor
  const notificacionesEnviadas = [];
  for (const row of result.rows) {
    const response = await notificationService.enviarNotificacion(row.push_token, {
      title,
      body,
      data: {
        eventId: evento.id,
        deviceId: deviceId,
        tipoEvento: evento.tipo_evento,
        eventTime: evento.event_time
      }
    });
    notificacionesEnviadas.push(response);
  }

  return notificacionesEnviadas;
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

  // Disparar procesamiento de alerta asincrónico
  procesarAlertaSiCorresponde(createdEvent, deviceId).catch(err => {
    console.error('Error al procesar la alerta de notificación:', err);
  });

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