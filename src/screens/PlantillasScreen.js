import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export default function PlantillasScreen() {
  return (
    <View style={s.root}>
      <Text style={s.icono}>🧩</Text>
      <Text style={s.titulo}>Plantillas</Text>
      <Text style={s.sub}>Próximamente</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icono: { fontSize: 48 },
  titulo: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 8 },
  sub: { fontSize: 15, color: C.sub, marginTop: 4 },
});
