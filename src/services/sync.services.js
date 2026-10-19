const db = require('../config/db');

class SyncService {
  async getSystemRules({ clientVersion, clientChecksum }) {
    // 1. Obtenemos el conteo total de dominios activos y el ID máximo actual
    // Con esto generamos un checksum y una versión dinámica instantánea.
    const metaQuery = await db.query(
      `SELECT COUNT(*)::int as total, COALESCE(MAX(version_id), MAX(id), 0) as max_version FROM system_blocklist WHERE activo = true`
    );

    const { total, max_version } = metaQuery.rows[0];

    // La versión puede ser el total de reglas o el max_version (o una combinación)
    const serverVersion = max_version; 
    // Hacemos que el checksum sea puramente numérico (el total de registros activos)
    const serverChecksum = total;

    // 2. Doble verificación numérica estricta: versión y checksum deben coincidir
    const isUpToDate = 
      Number(clientVersion) === serverVersion && 
      Number(clientChecksum) === serverChecksum;

    if (isUpToDate) {
      return {
        status: 'UP_TO_DATE',
        current_version: serverVersion,
        checksum: serverChecksum,
        syncedAt: new Date().toISOString()
      };
    }

    // 3. Si difieren o es la primera sincronización -> Traemos la lista completa
    const rulesResult = await db.query(
      `SELECT domain, rule_type FROM system_blocklist WHERE activo = true`
    );

    const rules = rulesResult.rows;

    const lotba = rules.filter(item => item.rule_type === 'lotba').map(item => item.domain);
    const keyword = rules.filter(item => item.rule_type === 'keyword').map(item => item.domain);
    const regex = rules.filter(item => item.rule_type === 'regex').map(item => item.domain);

    return {
      status: 'RESET',
      current_version: serverVersion,
      checksum: serverChecksum,
      data: {
        total: rules.length,
        lotba,
        keyword,
        regex,
        syncedAt: new Date().toISOString()
      }
    };
  }

  async getCustomRules(deviceUuid, deviceToken) {
    // 1. Validar las credenciales del dispositivo (Validación cruzada: device_uuid + device_token)
    const { data: device, error: deviceError } = await db
      .from('devices')
      .select('id, device_uuid, device_token')
      .eq('device_uuid', deviceUuid)
      .single();

    if (deviceError || !device) {
      const err = new Error('Dispositivo no encontrado o UUID inválido');
      err.statusCode = 404;
      throw err;
    }

    // Verificar que el token del header coincida exactamente con el de la base de datos
    if (device.device_token !== deviceToken) {
      const err = new Error('Inconsistencia en las credenciales del dispositivo (device_token inválido)');
      err.statusCode = 401;
      throw err;
    }

    // 2. Si la validación es correcta, consultamos la tabla custom_blocklists
    const { data: customRules, error: rulesError } = await db
      .from('custom_blocklists')
      .select('domain, activo')
      .eq('device_id', device.id); // o filtrado por device_uuid según tu esquema

    if (rulesError) {
      throw new Error(`Error al obtener las reglas personalizadas: ${rulesError.message}`);
    }

    return {
      deviceUuid,
      customRules: customRules || [],
      syncedAt: new Date().toISOString()
    };
  }
}

module.exports = new SyncService();