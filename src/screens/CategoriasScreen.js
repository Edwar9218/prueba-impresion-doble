import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ESTADOS, usePrinter } from '../PrinterContext';
import Boton from '../components/Boton';
import { C } from '../theme';

export default function CategoriasScreen({ onAbrir }) {
  const { printer, estado, abrirConectar } = usePrinter();
  const ui = ESTADOS[estado] || ESTADOS.idle;

  return (
    <ScrollView contentContainerStyle={s.content}>
      {printer ? (
        <View style={s.impresora}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Impresora</Text>
            <Text style={s.nombre}>{printer.name}</Text>
            <View style={[s.chip, { backgroundColor: ui.color }]}>
              <Text style={s.chipTxt}>{ui.text}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={abrirConectar}>
            <Text style={s.link}>Cambiar impresora</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Boton titulo="Conectar impresora" onPress={abrirConectar} style={s.conectar} />
      )}

      <Text style={s.seccion}>¿Qué quieres imprimir?</Text>

      <TouchableOpacity style={s.card} onPress={() => onAbrir('texto')} activeOpacity={0.8}>
        <Text style={s.icono}>📝</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitulo}>Texto</Text>
          <Text style={s.cardSub}>Escribe lo que quieras e imprímelo</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.card} onPress={() => onAbrir('domicilio')} activeOpacity={0.8}>
        <Text style={s.icono}>🛵</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitulo}>Domicilio</Text>
          <Text style={s.cardSub}>Pedido con cobro para el mensajero</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16 },
  conectar: { paddingVertical: 20, marginBottom: 8 },
  impresora: { backgroundColor: C.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  label: { fontSize: 12, color: C.sub },
  nombre: { fontSize: 18, fontWeight: '800', color: C.text, marginVertical: 2 },
  chip: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  chipTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  link: { color: C.primary, fontWeight: '700', fontSize: 14 },
  seccion: { fontSize: 15, fontWeight: '700', color: C.sub, marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: C.border },
  icono: { fontSize: 32, marginRight: 14 },
  cardTitulo: { fontSize: 19, fontWeight: '800', color: C.text },
  cardSub: { fontSize: 13, color: C.sub, marginTop: 2 },
});
