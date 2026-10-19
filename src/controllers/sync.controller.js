const syncService = require('../services/sync.services');

class SyncController {
  async getSystemSync(req, res) {
    try {
      // Extraemos versión y checksum opcionales enviados por la app cliente en los query params
      const clientVersion = req.query.version ? parseInt(req.query.version, 10) : null;
      const clientChecksum = req.query.checksum || null;

      const result = await syncService.getSystemRules({ clientVersion, clientChecksum });

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error en sync system controller:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error interno al sincronizar reglas del sistema'
      });
    }
  }

  async getCustomSync(req, res) {
    try {
      const { deviceUuid } = req.params;
      
      // Extraemos el token del header (ej: Bearer <token> o directamente el token)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Token de dispositivo ausente en los headers'
        });
      }

      // Limpiamos el formato "Bearer <token>" si se usa esa convención, o tomamos el string directo
      const deviceToken = authHeader.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : authHeader;

      const result = await syncService.getCustomRules(deviceUuid, deviceToken);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error en sync custom controller:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Error interno al sincronizar reglas personalizadas'
      });
    }
  }
}

module.exports = new SyncController();