import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import { presetDeTamano } from '../ticketText';
import { C } from '../theme';

// Para agregar una opción nueva: añade un objeto a OPCIONES y una pantalla en App.js.
export default function ConfiguracionScreen({ onAbrir }) {
  const { size } = usePrinter();
  const p = presetDeTamano(size);

  const OPCIONES = [
    {
      id: 'tamano',
      icono: '🔠',
      titulo: 'Tamaño de letra',
      subtitulo: `Ahora: Tamaño ${p.n} · ${p.etiqueta}`,
    },
  ];

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.seccion}>¿Qué quieres configurar?</Text>
      {OPCIONES.map((o) => (
        <TouchableOpacity key={o.id} style={s.card} onPress={() => onAbrir(o.id)} activeOpacity={0.8}>
          <Text style={s.icono}>{o.icono}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitulo}>{o.titulo}</Text>
            <Text style={s.cardSub}>{o.subtitulo}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16 },
  seccion: { fontSize: 15, fontWeight: '700', color: C.sub, marginBottom: 10 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: C.border },
  icono: { fontSize: 32, marginRight: 14 },
  cardTitulo: { fontSize: 19, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 2 },
});
