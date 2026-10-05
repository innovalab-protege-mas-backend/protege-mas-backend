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

module.exports = {
  recibirEvento,
  getEvents
};