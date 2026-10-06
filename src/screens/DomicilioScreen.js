import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import { aplicarEnter, cursorTrasCambio, detectarEnter, enZonaPrecio, procesarPrecio } from '../domicilioEditor';
import { esPedidoVacio } from '../ticketText';
import { insertarEnCursor, leerPortapapeles } from '../campo';
import useBorrador from '../useBorrador';
import Boton from '../components/Boton';
import CampoPapel from '../components/CampoPapel';
import ContenedorTeclado from '../components/ContenedorTeclado';
import { SIN_SUGERENCIAS, TECLADO_NUMERICO_EN_PRECIO } from '../ajustes';

export default function DomicilioScreen({ textoInicial = null }) {
  const { imprimir, ocupado } = usePrinter();
  const { texto, textoRef, fijar, limpiar } = useBorrador('domicilio', textoInicial);
  const [seleccion, setSeleccion] = useState(undefined);
  const selRef = useRef(null);

  // La selección controlada se suelta enseguida: si se queda fijada, el cursor podría "retroceder"
  // al siguiente cambio de texto.
  useEffect(() => {
    if (!seleccion) return undefined;
    const t = setTimeout(() => setSeleccion(undefined), 120);
    return () => clearTimeout(t);
  }, [seleccion]);

  // ---- Teclado numérico mientras se escribe un precio (experimento, ver src/ajustes.js) ----
  const [numerico, setNumerico] = useState(false);
  const numericoRef = useRef(false); // modo que ya está aplicado
  const objetivoRef = useRef(false); // modo que se quiere (puede estar pendiente de aplicarse)
  const temporizadorModo = useRef(null);
  const ultimoCambioModo = useRef(0);

  // Cambia el modo con un pequeño retraso y restaura el cursor: al cambiar el tipo de teclado Android puede
  // mover el cursor y avisarlo, y sin este cuidado el modo podría ir y volver sin parar.
  const cambiarModo = (quiere) => {
    if (!TECLADO_NUMERICO_EN_PRECIO || quiere === objetivoRef.current) return;
    objetivoRef.current = quiere;
    if (temporizadorModo.current) clearTimeout(temporizadorModo.current);
    const cursorGuardado = selRef.current;
    temporizadorModo.current = setTimeout(() => {
      numericoRef.current = quiere;
      ultimoCambioModo.current = Date.now();
      setNumerico(quiere);
      if (cursorGuardado) setSeleccion({ start: cursorGuardado.start, end: cursorGuardado.end });
    }, 60);
  };
  useEffect(() => () => temporizadorModo.current && clearTimeout(temporizadorModo.current), []);

  const actualizarModo = (textoFinal, cursor) => cambiarModo(enZonaPrecio(textoFinal, cursor));

  // Aplica un resultado de la lógica (texto + cursor) y revisa si hay que cambiar de teclado.
  const aplicar = (r) => {
    fijar(r.texto);
    selRef.current = { start: r.cursor, end: r.cursor };
    setSeleccion({ start: r.cursor, end: r.cursor });
    actualizarModo(r.texto, r.cursor);
  };

  // Enter inteligente (ver domicilioEditor.js): React Native no permite cancelar Enter,
  // así que se detecta después de escrito y se reemplaza por el separador.
  const procesar = (nuevo) => {
    const anterior = textoRef.current;
    const enter = detectarEnter(anterior, nuevo, selRef.current);
    if (enter) {
      const r = aplicarEnter(anterior, enter.inicio, enter.fin);
      if (r) {
        aplicar(r);
        return;
      }
    }
    // Precio en pesos: lo que va pegado después del "$" se muestra con puntos de miles.
    const precio = procesarPrecio(anterior, nuevo, selRef.current);
    if (precio) {
      aplicar(precio);
      return;
    }
    fijar(nuevo);
    actualizarModo(nuevo, cursorTrasCambio(anterior, nuevo, selRef.current));
  };

  // Si justo después de un Enter del teclado numérico llega también un salto de línea escrito por el
  // teclado, se ignora (si no, el Enter inteligente se aplicaría dos veces).
  const ultimoEnterNumerico = useRef(0);
  const onChangeText = (nuevo) => {
    if (Date.now() - ultimoEnterNumerico.current < 250 && detectarEnter(textoRef.current, nuevo, selRef.current)) {
      return;
    }
    procesar(nuevo);
  };

  // La tecla Enter / "Listo" del teclado numérico hace lo mismo que un Enter del teclado normal:
  // Enter inteligente (salta de línea en el bloque de cobro o crea el separador).
  // Llega por dos caminos posibles (onSubmitEditing y onKeyPress): se atiende solo el primero.
  const enterNumerico = () => {
    if (!numericoRef.current) return;
    const ahora = Date.now();
    if (ahora - ultimoEnterNumerico.current < 250) return;
    ultimoEnterNumerico.current = ahora;
    const t = textoRef.current;
    const sel = selRef.current || { start: t.length, end: t.length };
    procesar(t.slice(0, sel.start) + '\n' + t.slice(sel.end));
  };

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
    Alert.alert('Borrar pedido', '¿Borrar todo lo escrito?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          selRef.current = null;
          cambiarModo(false);
          limpiar();
        },
      },
    ]);
  };

  const imprimirPedido = async () => {
    if (esPedidoVacio(texto)) {
      Alert.alert('Pedido vacío', 'Debe ingresar el pedido antes de imprimir');
      return;
    }
    const ok = await imprimir({ tipo: 'Domicilio', texto });
    if (ok) {
      // El ticket salió (confirmado): se limpia la pantalla y el borrador automáticamente.
      selRef.current = null;
      cambiarModo(false);
      await limpiar();
    }
  };

  return (
    <ContenedorTeclado style={s.root}>
      <CampoPapel
        sinSugerencias={SIN_SUGERENCIAS}
        value={texto}
        onChangeText={onChangeText}
        selection={seleccion}
        onSelectionChange={(e) => {
          const sel = e.nativeEvent.selection;
          selRef.current = sel;
          setSeleccion(undefined); // soltar el control del cursor
          // Al tocar otra parte del texto se revisa si ahí hay un precio (se ignora justo después de un cambio de teclado)
          if (sel.start === sel.end && Date.now() - ultimoCambioModo.current > 400) {
            actualizarModo(textoRef.current, sel.start);
          }
        }}
        tecladoNumerico={numerico}
        onSubmitEditing={enterNumerico}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === 'Enter') enterNumerico();
        }}
        placeholder={'Dirección, barrio, valor, teléfono...\nEnter separa los campos'}
      />
      <View style={s.fila}>
        <Boton titulo="Borrar" tipo="borrar" onPress={borrar} deshabilitado={ocupado || !texto} style={s.borrar} />
        <Boton titulo="Pegar" tipo="secundario" onPress={pegar} deshabilitado={ocupado} style={s.pegar} />
        <Boton
          titulo={ocupado ? 'Imprimiendo...' : 'Imprimir'}
          onPress={imprimirPedido}
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
