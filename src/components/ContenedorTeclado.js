// ContenedorTeclado.js
// Deja los botones SIEMPRE a la misma altura, justo encima de donde sale el teclado, sin importar si el
// teclado está abierto o cerrado. No escucha eventos del teclado (Android no los avisa bien en algunos
// celulares): simplemente reserva abajo un espacio fijo, proporcional al alto de la pantalla.
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

// Parte del alto de la pantalla que se reserva abajo para el teclado (0.45 = 45 %).
// Si el teclado de ese celular es más alto y aún tapa los botones, súbelo (por ejemplo 0.50).
// Si los botones quedan muy arriba y sobra espacio, bájalo (por ejemplo 0.40).
const RESERVA_TECLADO = 0.40;

export default function ContenedorTeclado({ style, children }) {
  const { height } = useWindowDimensions();
  const plano = StyleSheet.flatten(style) || {};
  const base = plano.paddingBottom != null ? plano.paddingBottom : plano.padding || 0;
  return <View style={[style, { paddingBottom: base + Math.round(height * RESERVA_TECLADO) }]}>{children}</View>;
}
