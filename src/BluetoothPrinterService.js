// BluetoothPrinterService.js
// Servicio encapsulado: Conectar -> Imprimir -> Pausa -> Desconectar (siempre).
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Buffer } from 'buffer';

// Parámetros ajustables para la PoC (puedes sobreescribirlos por llamada).
export const PRINT_CONFIG = {
  maxAttempts: 3,        // intentos de conexión
  retryDelayMs: 1000,    // espera entre intentos
  retryJitterMs: 250,    // aleatorio extra para que los 2 celulares no choquen siempre
  flushBaseMs: 400,      // pausa táctica mínima antes de desconectar
  flushPerKbMs: 150,     // ms extra por cada KB enviado (tickets largos)
  secureSocket: true,    // si no conecta, prueba con false (socket inseguro)
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Bloqueo local: evita dobles toques / dos impresiones a la vez en ESTE celular.
let printing = false;

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array || Array.isArray(data)) return Buffer.from(data);
  throw makeError('INVALID_DATA', 'Los datos deben ser Uint8Array, Buffer o Array de bytes.');
}

function makeError(code, message, cause) {
  const err = new Error(message);
  err.code = code;
  if (cause) err.cause = cause;
  return err;
}

/**
 * Imprime "bajo demanda": abre conexión, envía, espera, y SIEMPRE desconecta.
 *
 * @param {string} macAddress  MAC de la impresora (ej. "66:32:AB:12:34:56")
 * @param {Uint8Array|Buffer|number[]} data  Bytes ESC/POS ya codificados
 * @param {object} [options]
 * @param {(status: string) => void} [options.onStatus]  connecting | printing | retrying | disconnecting | disconnected
 * @param {(msg: string) => void} [options.onLog]
 * @returns {Promise<{attempts: number, bytes: number, flushMs: number}>}
 */
export async function printOnDemand(macAddress, data, options = {}) {
  const { onStatus, onLog, ...overrides } = options;
  const cfg = { ...PRINT_CONFIG, ...overrides };
  const log = (msg) => onLog && onLog(msg);
  const status = (s) => onStatus && onStatus(s);

  if (!macAddress) throw makeError('NO_PRINTER', 'No hay impresora seleccionada.');
  if (printing) throw makeError('LOCAL_BUSY', 'Ya hay una impresión en curso en este celular.');

  printing = true;
  try {
    const payload = toBuffer(data);
    const flushMs = cfg.flushBaseMs + Math.ceil(payload.length / 1024) * cfg.flushPerKbMs;
    let lastError = null;

    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
      let device = null;
      let connected = false;

      try {
        status('connecting');
        log(`Intento ${attempt}/${cfg.maxAttempts}: conectando...`);
        const t0 = Date.now();
        device = await RNBluetoothClassic.connectToDevice(macAddress, {
          connectorType: 'rfcomm',
          secureSocket: cfg.secureSocket,
        });
        connected = true;
        log(`Conectado en ${Date.now() - t0} ms`);

        status('printing');
        await device.write(payload);
        log(`Enviados ${payload.length} bytes; pausa de ${flushMs} ms`);
        await sleep(flushMs);

        return { attempts: attempt, bytes: payload.length, flushMs };
      } catch (err) {
        if (connected) {
          // Falló DESPUÉS de conectar: no reintentamos para no duplicar tickets.
          throw makeError('WRITE_FAILED', `Falló el envío a la impresora: ${err.message}`, err);
        }
        // Falló la conexión (impresora ocupada / apagada / fuera de alcance): reintentar.
        lastError = err;
        log(`Conexión fallida: ${err.message}`);
      } finally {
        // DESCONEXIÓN OBLIGATORIA, pase lo que pase.
        if (device) {
          status('disconnecting');
          try {
            await device.disconnect();
            log('Desconectado');
          } catch (discErr) {
            log(`Aviso al desconectar: ${discErr.message}`);
          }
        }
      }

      if (attempt < cfg.maxAttempts) {
        status('retrying');
        const wait = cfg.retryDelayMs + Math.floor(Math.random() * cfg.retryJitterMs);
        log(`Impresora ocupada o inaccesible. Reintento en ${wait} ms`);
        await sleep(wait);
      }
    }

    throw makeError(
      'PRINTER_UNAVAILABLE',
      `No se pudo conectar tras ${cfg.maxAttempts} intentos (${lastError ? lastError.message : 'sin detalle'}).`,
      lastError
    );
  } finally {
    printing = false;
    status('disconnected');
  }
}

/**
 * Verificación de seguridad: comprueba si la impresora sigue conectada a ESTE
 * celular y, si es así, la desconecta para dejarla libre.
 * Se usa después de que el usuario confirma (o niega) que el ticket salió.
 *
 * @returns {Promise<{wasConnected: boolean|null}>}  null = no se pudo verificar
 */
export async function ensureDisconnected(macAddress, { onLog } = {}) {
  const log = (msg) => onLog && onLog(msg);
  try {
    const connectedDevices = await RNBluetoothClassic.getConnectedDevices();
    const dev = connectedDevices.find((d) => d.address === macAddress);
    if (!dev) {
      log('Verificación: la impresora ya estaba libre (sin conexión)');
      return { wasConnected: false };
    }
    log('Verificación: seguía conectada, desconectando...');
    await dev.disconnect();
    log('Desconectada tras la verificación');
    return { wasConnected: true };
  } catch (err) {
    log(`Aviso al verificar conexión: ${err.message}`);
    return { wasConnected: null };
  }
}

/** ¿Está encendido el Bluetooth? (no lo enciende: solo informa). */
export async function isBluetoothEnabled() {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch {
    return false;
  }
}

/**
 * Conexión de prueba: conecta y suelta de inmediato (para verificar que la
 * impresora responde y dejarla libre). Reintenta como printOnDemand.
 */
export async function probeConnection(macAddress, options = {}) {
  const { onLog, ...overrides } = options;
  const cfg = { ...PRINT_CONFIG, ...overrides };
  const log = (msg) => onLog && onLog(msg);

  if (!macAddress) throw makeError('NO_PRINTER', 'No hay impresora seleccionada.');
  if (printing) throw makeError('LOCAL_BUSY', 'Hay una impresión en curso en este celular.');

  printing = true;
  try {
    let lastError = null;
    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
      let device = null;
      try {
        log(`Prueba ${attempt}/${cfg.maxAttempts}: conectando...`);
        device = await RNBluetoothClassic.connectToDevice(macAddress, {
          connectorType: 'rfcomm',
          secureSocket: cfg.secureSocket,
        });
        log('Conexión de prueba correcta');
        return true;
      } catch (err) {
        lastError = err;
        log(`Conexión fallida: ${err.message}`);
      } finally {
        if (device) {
          try {
            await device.disconnect();
            log('Impresora liberada');
          } catch (discErr) {
            log(`Aviso al desconectar: ${discErr.message}`);
          }
        }
      }
      if (attempt < cfg.maxAttempts) {
        await sleep(cfg.retryDelayMs + Math.floor(Math.random() * cfg.retryJitterMs));
      }
    }
    throw makeError(
      'PRINTER_UNAVAILABLE',
      `No se pudo conectar tras ${cfg.maxAttempts} intentos (${lastError ? lastError.message : 'sin detalle'}).`,
      lastError
    );
  } finally {
    printing = false;
  }
}
