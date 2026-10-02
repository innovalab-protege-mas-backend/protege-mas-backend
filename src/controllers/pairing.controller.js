const pairingService = require('../services/pairing.service');
const { consumeCodeSchema } = require('../schemas/pairing.schema');

const generateCode = async (req, res) => {
  try {
    const userId = req.user.id; // Extraído por el authMiddleware
    const result = await pairingService.generatePairingCode(userId);

    return res.status(201).json({
      message: 'Código de vinculación generado con éxito',
      code: result.code,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Error al generar código:', error);
    return res.status(500).json({ error: 'Error interno al generar código' });
  }
};

const consumeCode = async (req, res) => {
  try {
    const validatedData = consumeCodeSchema.parse(req.body);
    const device = await pairingService.consumePairingCode(validatedData);

    return res.status(200).json({
      message: 'Dispositivo vinculado con éxito mediante código',
      device
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ errors: error.errors });
    }
    return res.status(400).json({ error: error.message || 'Error al vincular con código' });
  }
};

module.exports = {
  generateCode,
  consumeCode
};