// useBorrador.js - texto de una pantalla con borrador automático.
// El borrador se restaura al volver, se guarda mientras se escribe (y al salir de la pantalla)
// y solo se borra cuando el usuario toca Borrar o el ticket salió (lo decide la pantalla).
import { useCallback, useEffect, useRef, useState } from 'react';
import * as storage from './storage';

// clave: 'texto' | 'domicilio'.  textoInicial: si viene (desde Historial), reemplaza al borrador.
export default function useBorrador(clave, textoInicial) {
  const [texto, setTexto] = useState('');
  const [cargado, setCargado] = useState(false);
  const textoRef = useRef('');
  const cargadoRef = useRef(false);

  useEffect(() => {
    (async () => {
      const inicial = textoInicial != null ? textoInicial : await storage.getDraft(clave);
      textoRef.current = inicial;
      setTexto(inicial);
      cargadoRef.current = true;
      setCargado(true);
    })();
    // Al salir de la pantalla se guarda lo último escrito.
    return () => {
      if (cargadoRef.current) storage.setDraft(clave, textoRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cargado) return undefined;
    const t = setTimeout(() => storage.setDraft(clave, texto), 400);
    return () => clearTimeout(t);
  }, [texto, cargado, clave]);

  const fijar = useCallback((t) => {
    textoRef.current = t;
    setTexto(t);
  }, []);

  const limpiar = useCallback(async () => {
    textoRef.current = '';
    setTexto('');
    await storage.setDraft(clave, '');
  }, [clave]);

  return { texto, textoRef, fijar, limpiar };
}
