const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');
const authenticateToken = require('../middlewares/authMiddleware');

// Todas las rutas de dispositivos requieren autenticación del tutor
router.use(authenticateToken);

router.get('/', deviceController.getDevices);

module.exports = router;