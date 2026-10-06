import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { C } from '../theme';

// tipo: 'primario' | 'secundario' | 'peligro' | 'borrar'
export default function Boton({ titulo, onPress, tipo = 'primario', deshabilitado, style }) {
  const st = [s.base, tipo === 'secundario' && s.sec, tipo === 'peligro' && s.peligro, tipo === 'borrar' && s.borrar, deshabilitado && s.dis, style];
  const tx = [s.txt, tipo === 'secundario' && s.txtSec, tipo === 'borrar' && s.txtBorrar];
  return (
    <TouchableOpacity style={st} onPress={onPress} disabled={deshabilitado} activeOpacity={0.8}>
      <Text style={tx}>{titulo}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center' },
  sec: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.primary },
  peligro: { backgroundColor: C.danger },
  borrar: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.danger },
  dis: { opacity: 0.45 },
  txt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  txtSec: { color: C.primary },
  txtBorrar: { color: C.danger },
});
