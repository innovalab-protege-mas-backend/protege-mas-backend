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
    const data = await authService.login(req.body);
    return res.status(200).json(data);
  } catch (error) {
    if (error.message === 'CREDANCIALES_INVALIDAS') {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  register,
  login
};