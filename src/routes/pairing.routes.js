const express = require('express');
const router = express.Router();
const pairingController = require('../controllers/pairing.controller');
const authenticateToken = require('../middlewares/authMiddleware');

// Generar código: requiere que el tutor esté autenticado
router.post('/generate', authenticateToken, pairingController.generateCode);

// Consumir código: no requiere autenticación previa (se envía desde el dispositivo del menor con el PIN)
router.post('/consume', pairingController.consumeCode);

module.exports = router;