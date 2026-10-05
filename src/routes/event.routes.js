const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const authenticateToken = require('../middlewares/authMiddleware');

// Endpoint para que la app del menor envíe 1 evento o un lote (Público mediante device_uuid)
router.post('/', eventController.recibirEvento);

// Endpoint para que el tutor consulte sus eventos (Protegido por JWT)
router.get('/', authenticateToken, eventController.getEvents);
router.patch('/:id/read', authenticateToken, eventController.markAsRead);

module.exports = router;