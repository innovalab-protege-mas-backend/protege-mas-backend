const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta protegida de prueba
router.get('/me', authMiddleware, (req, res) => {
  res.json({ message: 'Acceso concedido', user: req.user });
});

module.exports = router;