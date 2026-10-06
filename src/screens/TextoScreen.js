import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import { insertarEnCursor, leerPortapapeles } from '../campo';
import useBorrador from '../useBorrador';
import Boton from '../components/Boton';
import CampoPapel from '../components/CampoPapel';
import ContenedorTeclado from '../components/ContenedorTeclado';

export default function TextoScreen({ textoInicial = null }) {
  const { imprimir, ocupado } = usePrinter();
  const { texto, textoRef, fijar, limpiar } = useBorrador('texto', textoInicial);
  const [seleccion, setSeleccion] = useState(undefined);
  const selRef = useRef(null);

  // La selección controlada se suelta enseguida: si se queda fijada, el cursor podría "retroceder"
  // al siguiente cambio de texto.
  useEffect(() => {
    if (!seleccion) return undefined;
    const t = setTimeout(() => setSeleccion(undefined), 120);
    return () => clearTimeout(t);
  }, [seleccion]);

  const pegar = async () => {
    try {
      const clip = await leerPortapapeles();
      if (!clip || !clip.trim()) {
        Alert.alert('Portapapeles', 'No hay texto en el portapapeles');
        return;
      }
      const r = insertarEnCursor(textoRef.current, selRef.current, clip);
      fijar(r.texto);
      selRef.current = { start: r.cursor, end: r.cursor };
      setSeleccion({ start: r.cursor, end: r.cursor });
    } catch (e) {
      Alert.alert(
        'Portapapeles',
        e.code === 'NO_DISPONIBLE'
          ? `${e.message}\n\nMientras tanto, mantén pulsado en el campo y elige Pegar.`
          : 'No se pudo leer el portapapeles. Revisa el permiso.'
      );
    }
  };

  // Borrar queda a la izquierda, lejos de Imprimir, y pide confirmar si hay texto.
  const borrar = () => {
    if (!texto) return;
    Alert.alert('Borrar texto', '¿Borrar todo lo escrito?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          selRef.current = null;
          limpiar();
        },
      },
    ]);
  };

  const imprimirTexto = async () => {
    if (!texto.trim()) {
      Alert.alert('Texto vacío', 'Debe ingresar el texto antes de imprimir');
      return;
    }
    const ok = await imprimir({ tipo: 'Texto', texto });
    if (ok) {
      // El ticket salió (confirmado): se limpia la pantalla y el borrador automáticamente.
      selRef.current = null;
      await limpiar();
    }
  };

  return (
    <ContenedorTeclado style={s.root}>
      <CampoPapel
        value={texto}
        onChangeText={fijar}
        selection={seleccion}
        onSelectionChange={(e) => {
          selRef.current = e.nativeEvent.selection;
          setSeleccion(undefined);
        }}
        placeholder="Escribe aquí lo que quieres imprimir"
      />
      <View style={s.fila}>
        <Boton titulo="Borrar" tipo="borrar" onPress={borrar} deshabilitado={ocupado || !texto} style={s.borrar} />
        <Boton titulo="Pegar" tipo="secundario" onPress={pegar} deshabilitado={ocupado} style={s.pegar} />
        <Boton
          titulo={ocupado ? 'Imprimiendo...' : 'Imprimir'}
          onPress={imprimirTexto}
          deshabilitado={ocupado}
          style={s.imprimir}
        />
      </View>
    </ContenedorTeclado>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 14 },
  fila: { flexDirection: 'row', marginTop: 12 },
  borrar: { flex: 1, marginRight: 8, paddingHorizontal: 6 },
  pegar: { flex: 1, marginRight: 10, paddingHorizontal: 6 },
  imprimir: { flex: 2 },
});
