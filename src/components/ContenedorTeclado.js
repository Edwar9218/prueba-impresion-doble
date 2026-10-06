// ContenedorTeclado.js
// Evita que el teclado tape los botones. En Android con edge-to-edge (SDK 54) la ventana
// NO se reduce al abrir el teclado, así que se agrega abajo el alto del teclado.
// Si en algún celular la ventana sí se reduce sola, se detecta (cambia el alto del contenedor)
// y no se agrega nada para no duplicar el espacio.
// Mientras el teclado está abierto el espacio solo crece (nunca se encoge): algunos teclados cambian
// de alto al escribir (barra de sugerencias) y los botones daban un brinco cada vez.
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

// Espacio extra entre los botones y el teclado (súbelo si aún quedan muy pegados).
const MARGEN_EXTRA = 44;

export default function ContenedorTeclado({ style, children }) {
  const [extra, setExtra] = useState(0);
  const alturaLibre = useRef(0); // alto del contenedor con el teclado cerrado
  const alturaActual = useRef(0);
  const tecladoAbierto = useRef(false);
  const temporizador = useRef(null);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', (e) => {
      tecladoAbierto.current = true;
      const alto = (e.endCoordinates && e.endCoordinates.height) || 0;
      if (temporizador.current) clearTimeout(temporizador.current);
      // Esperar un instante para saber si el sistema ya redujo la ventana por su cuenta.
      temporizador.current = setTimeout(() => {
        const reducida = alturaLibre.current > 0 && alturaActual.current < alturaLibre.current - alto * 0.5;
        if (reducida) return;
        setExtra((previo) => Math.max(previo, alto + MARGEN_EXTRA)); // solo crece
      }, 150);
    });
    const ocultar = Keyboard.addListener('keyboardDidHide', () => {
      tecladoAbierto.current = false;
      if (temporizador.current) clearTimeout(temporizador.current);
      setExtra(0);
    });
    return () => {
      mostrar.remove();
      ocultar.remove();
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  const alMedir = (e) => {
    const h = e.nativeEvent.layout.height;
    alturaActual.current = h;
    if (!tecladoAbierto.current) alturaLibre.current = h;
  };

  const plano = StyleSheet.flatten(style) || {};
  const base = plano.paddingBottom != null ? plano.paddingBottom : plano.padding || 0;

  return (
    <View style={s.externo} onLayout={alMedir}>
      <View style={[style, { paddingBottom: base + extra }]}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  externo: { flex: 1 },
});
