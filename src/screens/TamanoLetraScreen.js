import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import { TAMANOS } from '../ticketText';
import { C } from '../theme';

const MONO = Platform.OS === 'android' ? 'monospace' : 'Courier';
const BASE = 9; // tamaño de letra del ejemplo cuando es "1 vez"

// Ejemplo visual: la letra se agranda al ancho (w) y se estira al alto (h) igual que en el papel.
function Ejemplo({ w, h, spacing = 0 }) {
  return (
    <View style={s.ejemploCaja}>
      <Text
        style={[
          s.ejemplo,
          // 1 punto de la impresora = (ancho de una letra) / 12
          { fontSize: BASE * w, letterSpacing: (spacing * BASE * w * 0.6) / 12, transform: [{ scaleY: h / w }] },
        ]}
      >
        Aa12
      </Text>
    </View>
  );
}

export default function TamanoLetraScreen() {
  const { size, cambiarSize } = usePrinter();
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.titulo}>Tamaño de letra por defecto</Text>
      <Text style={s.sub}>
        Se usa en todas las impresiones (Texto y Domicilio). A la derecha ves cómo se ve cada tamaño; al escribir, la
        letra de la pantalla cambia para que veas cómo saldrá en el papel.
      </Text>
      {TAMANOS.map((t) => {
        const activo = t.n === size;
        return (
          <TouchableOpacity key={t.n} style={[s.fila, activo && s.activa]} onPress={() => cambiarSize(t.n)}>
            <View style={[s.radio, activo && s.radioOn]} />
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>Tamaño {t.n}</Text>
              <Text style={s.etiqueta}>{t.etiqueta}</Text>
              <Text style={s.detalle}>{t.detalle}</Text>
            </View>
            <Ejemplo w={t.w} h={t.h} spacing={t.spacing} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16 },
  titulo: { fontSize: 18, fontWeight: '800', color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 4, marginBottom: 14 },
  fila: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  activa: { borderColor: C.primary, borderWidth: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.sub, marginRight: 12 },
  radioOn: { borderColor: C.primary, backgroundColor: C.primary },
  nombre: { fontSize: 16, fontWeight: '700', color: C.text },
  etiqueta: { fontSize: 13, color: C.text, marginTop: 1 },
  detalle: { fontSize: 11, color: C.sub, marginTop: 2 },
  ejemploCaja: { width: 92, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: 8, backgroundColor: '#F6F9FF', borderRadius: 8 },
  ejemplo: { fontFamily: MONO, color: C.text },
});
