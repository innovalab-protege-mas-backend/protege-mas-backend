const eventService = require('../services/event.service');
const { reportEventSchema } = require('../schemas/event.schema');

const recibirEvento = async (req, res) => {
  try {
    const validatedData = reportEventSchema.parse(req.body);
    const result = await eventService.registrarEvento(validatedData);

    return res.status(201).json({
      message: Array.isArray(result) 
        ? `${result.length} eventos registrados con éxito` 
        : 'Evento registrado con éxito',
      events: result
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues?.[0].message });
    }
    if (error.message === 'DEVICE_NOT_FOUND') {
      return res.status(404).json({ error: 'Dispositivo no encontrado o no vinculado' });
    }
    console.error('Error al recibir evento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.query;

    const events = await eventService.getEventsByTutor(userId, deviceId);

    return res.status(200).json({
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getAlerts = async (req, res) => {
  try {
    const userId = req.user.id; // Del JWT
    const { soloNoLeidas, limite } = req.query;

    const alerts = await eventService.getAlertsForTutor(userId, { soloNoLeidas, limite });
    
    return res.status(200).json({
      count: alerts.length,
      alerts
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return res.status(500).json({ error: 'Error interno al consultar alertas' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const updatedAlert = await eventService.markAlertAsRead(id, userId);

    if (!updatedAlert) {
      return res.status(404).json({ error: 'Alerta no encontrada o no pertenece al tutor' });
    }

    return res.status(200).json({
      message: 'Alerta marcada como leída',
      alert: updatedAlert
    });
  } catch (error) {
    console.error('Error al actualizar alerta:', error);
    return res.status(500).json({ error: 'Error interno al actualizar la alerta' });
  }
};

module.exports = {
  recibirEvento,
  getEvents,
  getAlerts,
  markAsRead
};