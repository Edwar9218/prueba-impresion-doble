import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import * as storage from '../storage';
import { C } from '../theme';

const p2 = (n) => String(n).padStart(2, '0');
const claveFecha = (ts) => {
  const d = new Date(ts);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

function etiquetaFecha(ts) {
  const hoy = claveFecha(Date.now());
  const ayer = claveFecha(Date.now() - 24 * 3600 * 1000);
  const k = claveFecha(ts);
  if (k === hoy) return 'Hoy';
  if (k === ayer) return 'Ayer';
  return k;
}

function hace(ts) {
  const seg = Math.floor((Date.now() - ts) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const primeraLinea = (texto) => {
  const l = String(texto).split('\n').find((x) => x.trim() && !/^-+$/.test(x.trim()));
  return l ? l.trim() : '(sin contenido)';
};

export default function HistorialScreen({ onEditar }) {
  const { imprimir, ocupado, historialTick } = usePrinter();
  const [items, setItems] = useState([]);

  const cargar = useCallback(async () => setItems(await storage.getHistory()), []);
  useEffect(() => {
    cargar();
  }, [cargar, historialTick]);

  // Editar: abre el mensaje en Texto o Domicilio para cambiarlo, pegar e imprimir.
  const editar = async (it) => {
    const clave = it.tipo === 'Domicilio' ? 'domicilio' : 'texto';
    const borrador = await storage.getDraft(clave);
    const abrir = () => onEditar(it.tipo, it.texto);
    if (borrador && borrador.trim() && borrador !== it.texto) {
      Alert.alert('Reemplazar texto', 'Ya tienes un texto escrito en esa pantalla. ¿Quieres reemplazarlo con este mensaje?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar', onPress: abrir },
      ]);
    } else {
      abrir();
    }
  };

  const limpiar = () => {
    if (items.length === 0) return;
    Alert.alert('Limpiar historial', '¿Borrar todas las impresiones guardadas?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar',
        style: 'destructive',
        onPress: async () => {
          await storage.clearHistory();
          setItems([]);
        },
      },
    ]);
  };

  // Agrupar por fecha manteniendo el orden (más reciente primero)
  const grupos = [];
  items.forEach((it) => {
    const etiqueta = etiquetaFecha(it.ts);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.etiqueta === etiqueta) ultimo.items.push(it);
    else grupos.push({ etiqueta, items: [it] });
  });

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.barra}>
        <Text style={s.cuenta}>{items.length} impresiones</Text>
        <TouchableOpacity onPress={limpiar}>
          <Text style={s.limpiar}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 && <Text style={s.vacio}>Todavía no hay impresiones.</Text>}

      {grupos.map((g) => (
        <View key={g.etiqueta}>
          <Text style={s.fecha}>{g.etiqueta}</Text>
          {g.items.map((it) => (
            <View key={it.id} style={s.item}>
              <View style={{ flex: 1 }}>
                <Text style={s.linea} numberOfLines={1}>
                  {primeraLinea(it.texto)}
                </Text>
                <Text style={s.meta}>
                  {it.tipo} · {hace(it.ts)}
                </Text>
              </View>
              <TouchableOpacity style={s.accion} onPress={() => editar(it)} disabled={ocupado}>
                <Text style={s.accionIcono}>✏️</Text>
                <Text style={s.accionTxt}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.accion, ocupado && { opacity: 0.4 }]}
                disabled={ocupado}
                onPress={() => imprimir({ tipo: it.tipo, texto: it.texto, registrar: false })}
              >
                <Text style={s.accionIcono}>🖨️</Text>
                <Text style={s.accionTxt}>Imprimir</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 14 },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cuenta: { color: C.sub, fontSize: 13 },
  limpiar: { color: C.danger, fontWeight: '700', fontSize: 14 },
  vacio: { color: C.sub, marginTop: 30, textAlign: 'center' },
  fecha: { fontSize: 14, fontWeight: '800', color: C.primary, marginTop: 14, marginBottom: 6 },
  item: { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  linea: { fontSize: 16, fontWeight: '600', color: C.text },
  meta: { fontSize: 12, color: C.sub, marginTop: 2 },
  accion: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4 },
  accionIcono: { fontSize: 22 },
  accionTxt: { fontSize: 11, color: C.sub, marginTop: 1 },
});
