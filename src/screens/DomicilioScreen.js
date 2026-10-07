import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import {
  aplicarEnter,
  cursorTrasCambio,
  detectarEnter,
  enZonaCobro,
  enZonaPrecio,
  procesarPrecio,
} from '../domicilioEditor';
import { esPedidoVacio } from '../ticketText';
import { insertarEnCursor, leerPortapapeles } from '../campo';
import useBorrador from '../useBorrador';
import Boton from '../components/Boton';
import CampoPapel from '../components/CampoPapel';
import ContenedorTeclado from '../components/ContenedorTeclado';
import { SIN_SUGERENCIAS, TECLADO_NUMERICO_EN_PRECIO } from '../ajustes';

// Dos Enter seguidos dentro de este tiempo (milisegundos) cuentan como "doble Enter".
const DOBLE_ENTER_MS = 600;

// El teclado numérico avisa el mismo Enter por varios caminos casi a la vez (unos pocos milisegundos).
// Todo Enter que llegue dentro de esta ventana se toma como repetido del anterior y se ignora. Debe ser menor
// que lo que tarda una persona en dar dos Enter seguidos; si fuera más grande, el doble Enter rápido no funcionaría.
const VENTANA_DUPLICADO_MS = 90;

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
    temporizadorModo.current = setTimeout(() => {
      const cursorGuardado = selRef.current; // el más reciente, por si se escribió algo durante la espera
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

  // Cambio normal del texto (sin lógica especial): se fija el texto y se anota YA dónde quedó el cursor.
  // Así, si al escribir el espacio o el Enter el teclado pasa de numérico a normal, el cursor se restaura
  // en su lugar nuevo (después del espacio / salto) y no en el anterior (pegado al precio).
  const fijarNormal = (nuevo, anterior) => {
    const c = cursorTrasCambio(anterior, nuevo, selRef.current);
    selRef.current = { start: c, end: c };
    fijar(nuevo);
    actualizarModo(nuevo, c);
  };

  // Enter inteligente (ver domicilioEditor.js): React Native no permite cancelar Enter,
  // así que se detecta después de escrito.
  //  - Un Enter solo (fuera de la zona de cobro): salto de línea normal.
  //  - Doble Enter rápido: se deshace el primer salto y se pone el separador (y el bloque Total /
  //    domicilio / A cobrar si todavía no existe).
  //  - Dentro de la zona de cobro: Enter en "Total" y "domicilio" pasa al siguiente renglón; al final de
  //    "A cobrar" un Enter es salto de línea normal y el doble Enter pone solo el separador (sin repetir el bloque).
  const ultimoEnter = useRef(null); // { t: hora, pos: dónde quedó el salto de línea }
  const procesar = (nuevo) => {
    const anterior = textoRef.current;
    const enter = detectarEnter(anterior, nuevo, selRef.current);
    if (enter) {
      const ahora = Date.now();
      const previo = ultimoEnter.current;
      ultimoEnter.current = null;
      const esDoble =
        previo &&
        ahora - previo.t < DOBLE_ENTER_MS &&
        enter.inicio === enter.fin &&
        enter.inicio === previo.pos + 1 &&
        anterior[previo.pos] === '\n';
      if (esDoble) {
        const base = anterior.slice(0, previo.pos) + anterior.slice(previo.pos + 1); // sin el primer salto
        const r = aplicarEnter(base, previo.pos, previo.pos);
        if (r) {
          aplicar(r);
          return;
        }
      } else if (!enZonaCobro(anterior, enter.inicio)) {
        // Enter solo: únicamente el salto de línea. Se recuerda por si llega el segundo Enter.
        ultimoEnter.current = { t: ahora, pos: enter.inicio };
        fijarNormal(nuevo, anterior);
        return;
      } else {
        // Dentro de la zona de cobro.
        const r = aplicarEnter(anterior, enter.inicio, enter.fin);
        if (r && r.texto === anterior) {
          // Enter al final de "Total" o "domicilio": solo pasa al final del siguiente renglón.
          aplicar(r);
          return;
        }
        if (r) {
          // Enter al final de "A cobrar": ahora solo hace el salto de línea; el separador lo pone el doble Enter.
          ultimoEnter.current = { t: ahora, pos: enter.inicio };
          fijarNormal(nuevo, anterior);
          return;
        }
      }
    }
    // Precio en pesos: lo que va pegado después del "$" se muestra con puntos de miles.
    const precio = procesarPrecio(anterior, nuevo, selRef.current);
    if (precio) {
      aplicar(precio);
      return;
    }
    fijarNormal(nuevo, anterior);
  };

  // Si justo después de un Enter del teclado numérico llega también un salto de línea escrito por el
  // teclado, se ignora (si no, el Enter inteligente se aplicaría dos veces).
  const ultimoEnterNumerico = useRef(0);
  const onChangeText = (nuevo) => {
    if (Date.now() - ultimoEnterNumerico.current < VENTANA_DUPLICADO_MS && detectarEnter(textoRef.current, nuevo, selRef.current)) {
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
    if (ahora - ultimoEnterNumerico.current < VENTANA_DUPLICADO_MS) return;
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
        placeholder={'Dirección, barrio, valor, teléfono...\nDoble Enter separa los campos'}
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
