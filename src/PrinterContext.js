// PrinterContext.js - estado global: impresora por defecto, tamaño de letra y flujo de impresión.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ensureDisconnected, isBluetoothEnabled, printOnDemand } from './BluetoothPrinterService';
import { buildTicket } from './ticketBuilder';
import * as storage from './storage';

export const ESTADOS = {
  idle: { text: 'Libre', color: '#2e7d32' },
  connecting: { text: 'Conectando...', color: '#f9a825' },
  printing: { text: 'Imprimiendo...', color: '#017CFD' },
  retrying: { text: 'Esperando reintento...', color: '#ef6c00' },
  disconnecting: { text: 'Desconectando...', color: '#0BA2FB' },
  disconnected: { text: 'Desconectado', color: '#5B6B8C' },
};

const preguntarSalio = () =>
  new Promise((resolve) => {
    Alert.alert(
      '¿Salió el ticket?',
      'Confírmalo, por favor, para saber si hay que imprimirlo de nuevo.',
      [
        { text: 'No salió', style: 'destructive', onPress: () => resolve(false) },
        { text: 'Sí, salió', onPress: () => resolve(true) },
      ],
      { cancelable: false }
    );
  });

const preguntarReintento = (titulo, mensaje, textoBoton) =>
  new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: textoBoton, onPress: () => resolve(true) },
      ],
      { cancelable: false }
    );
  });

// Mensajes para el usuario: sin lenguaje técnico.
const AYUDA_CONEXION =
  'No se pudo conectar con la impresora.\n\nRevisa que:\n• Esté encendida.\n• No esté conectada a otro celular o dispositivo.\n• Esté cerca de este celular.';
const AYUDA_ENVIO =
  'La impresora dejó de responder mientras imprimía.\n\nRevisa que esté encendida, que tenga papel y que esté cerca del celular.';
const AYUDA_NO_SALIO = 'Revisa que la impresora esté encendida y tenga papel.';

const Ctx = createContext(null);
export const usePrinter = () => useContext(Ctx);

export function PrinterProvider({ children }) {
  const [printer, setPrinterState] = useState(null); // { name, address }
  const [size, setSizeState] = useState(storage.DEFAULT_SIZE);
  const [cargado, setCargado] = useState(false);
  const [estado, setEstado] = useState('idle');
  const [ocupado, setOcupado] = useState(false);
  const [conectarAbierto, setConectarAbierto] = useState(false);
  const [historialTick, setHistorialTick] = useState(0);
  const ocupadoRef = useRef(false);
  const idleTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([storage.getPrinter(), storage.getSize()]);
      setPrinterState(p);
      setSizeState(s);
      setCargado(true);
    })();
    return () => idleTimer.current && clearTimeout(idleTimer.current);
  }, []);

  const abrirConectar = useCallback(() => setConectarAbierto(true), []);
  const cerrarConectar = useCallback(() => setConectarAbierto(false), []);

  const guardarImpresora = useCallback(async (dispositivo) => {
    const p = { name: dispositivo.name || 'Sin nombre', address: dispositivo.address };
    await storage.setPrinter(p);
    setPrinterState(p);
  }, []);

  const cambiarSize = useCallback(async (n) => {
    setSizeState(n);
    await storage.setSize(n);
  }, []);

  /**
   * Flujo completo: conectar -> imprimir -> desconectar -> verificar -> el usuario confirma.
   * @returns {Promise<boolean>} true si el usuario confirmó que el ticket salió.
   */
  const imprimir = useCallback(
    async ({ tipo, texto, registrar = true }) => {
      if (ocupadoRef.current) return false;

      if (!printer) {
        Alert.alert('Sin impresora', 'Primero conecta tu impresora.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Conectar', onPress: abrirConectar },
        ]);
        return false;
      }
      if (!(await isBluetoothEnabled())) {
        Alert.alert('Bluetooth apagado', 'Enciende el Bluetooth del celular e intenta imprimir de nuevo.');
        return false;
      }

      ocupadoRef.current = true;
      setOcupado(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);

      let registrado = false;
      let confirmado = false;
      try {
        let otra = true;
        while (otra) {
          otra = false;
          let enviado = false;
          let codigoError = '';

          // 1) Conectar -> imprimir -> pausa -> desconectar (el servicio siempre desconecta)
          try {
            const bytes = buildTicket(tipo, texto, size);
            await printOnDemand(printer.address, bytes, {
              maxAttempts: 1, // un solo intento: si no responde, se le avisa al usuario enseguida
              onStatus: setEstado,
              onLog: (m) => console.log('[print]', m),
            });
            enviado = true;
          } catch (e) {
            codigoError = e.code || 'ERROR';
            console.log('[print] error', e.code, e.message);
          }

          // 2) Verificación de seguridad: si quedó conectada, se desconecta
          await ensureDisconnected(printer.address, { onLog: (m) => console.log('[print]', m) });

          // 3) El sistema NO supone que imprimió: lo confirma el usuario
          if (enviado) {
            if (registrar && !registrado) {
              await storage.addHistory({ tipo, texto });
              registrado = true;
              setHistorialTick((t) => t + 1);
            }
            if (await preguntarSalio()) {
              confirmado = true;
            } else {
              otra = await preguntarReintento(
                'El ticket no salió',
                `${AYUDA_NO_SALIO}\n\n¿Quieres imprimir de nuevo?`,
                'Imprimir de nuevo'
              );
            }
          } else {
            otra = await preguntarReintento(
              'No se pudo imprimir',
              `${codigoError === 'WRITE_FAILED' ? AYUDA_ENVIO : AYUDA_CONEXION}\n\n¿Quieres intentarlo de nuevo?`,
              'Intentar de nuevo'
            );
          }
        }
      } finally {
        ocupadoRef.current = false;
        setOcupado(false);
        idleTimer.current = setTimeout(() => setEstado('idle'), 1200);
      }
      return confirmado;
    },
    [printer, size, abrirConectar]
  );

  const value = {
    printer,
    size,
    cargado,
    estado,
    ocupado,
    conectarAbierto,
    historialTick,
    abrirConectar,
    cerrarConectar,
    guardarImpresora,
    cambiarSize,
    imprimir,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
