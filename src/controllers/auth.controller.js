const authService = require('../services/auth.services');

const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    return res.status(201).json({ message: 'Usuario registrado exitosamente', user });
  } catch (error) {
    if (error.message === 'EL_EMAIL_YA_EXISTE') {
      return res.status(400).json({ error: 'El email ya se encuentra registrado' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const login = async (req, res) => {
  try {
    // Extraemos metadatos de la petición para auditoría de sesión
    const reqInfo = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      deviceInfo: req.headers['user-agent'] || 'Desconocido',
      pushToken: req.body.push_token || null
    };

    const data = await authService.login(req.body, reqInfo);
    return res.status(200).json(data);
  } catch (error) {
    if (error.message === 'CREDANCIALES_INVALIDAS') {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  register,
  login
};