// CampoPapel.js - campo de escritura que simula el papel de 58 mm.
// El tamaño de la letra cambia según el tamaño elegido en Configuraciones, y el ancho se ajusta
// para que cada renglón en pantalla tenga los mismos caracteres que tendrá en el ticket.
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePrinter } from '../PrinterContext';
import { presetDeTamano } from '../ticketText';
import { C } from '../theme';

const MONO = Platform.OS === 'android' ? 'monospace' : 'Courier';
const REF = 20; // tamaño de letra de referencia para medir el ancho real de un carácter
const PAD = 12;
const BORDE = 1;

export default function CampoPapel({
  value,
  onChangeText,
  selection,
  onSelectionChange,
  placeholder,
  sinSugerencias = false,
  tecladoNumerico = false,
  onSubmitEditing,
  onKeyPress,
}) {
  const { size } = usePrinter();
  const p = presetDeTamano(size);
  const [ancho, setAncho] = useState(0);
  const [factor, setFactor] = useState(0.6); // ancho de un carácter / tamaño de letra (se calibra solo)

  const util = Math.max(0, ancho - 2 * (PAD + BORDE));
  const fontSize = ancho ? Math.max(8, Math.floor(((util / (p.cols * factor)) * 0.99) * 10) / 10) : 16;
  // Interlineado fijo y compacto. (Antes se abría el interlineado en los tamaños "altos", pero Android no
  // lo aplicaba igual después de que la app reescribía el texto y las líneas cambiaban de separación.)
  const lineHeight = Math.round(fontSize * 1.25);

  return (
    <View style={s.root}>
      <Text style={s.leyenda}>
        Vista del papel · {p.etiqueta} · ≈ {p.cols} caracteres por renglón
      </Text>

      {/* Texto oculto: mide el ancho real de un carácter en este celular */}
      <Text
        style={s.medidor}
        numberOfLines={1}
        pointerEvents="none"
        onTextLayout={(e) => {
          const l = e.nativeEvent.lines && e.nativeEvent.lines[0];
          if (l && l.width) {
            const f = l.width / (REF * 10);
            setFactor((prev) => (Math.abs(prev - f) > 0.002 ? f : prev));
          }
        }}
      >
        0000000000
      </Text>

      <View style={s.caja} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        <TextInput
          style={[s.input, { fontSize, lineHeight }]}
          multiline
          value={value}
          onChangeText={onChangeText}
          selection={selection}
          onSelectionChange={onSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={C.sub}
          textAlignVertical="top"
          // sinSugerencias: sin predicción ni corrección, para que el teclado no "componga" palabras
          // y la app pueda reescribir el texto (puntos de miles) sin que el teclado lo vuelva a insertar.
          // OJO: NO usar keyboardType="visible-password": en ese modo la tecla Enter deja de escribir
          // un salto de línea (hace "Listo") y se rompe el Enter inteligente.
          // Sin mayúscula automática: el teclado no pone en mayúscula la primera letra de cada renglón nuevo
          // (después de un Enter) ni después de un punto; lo que se escribe sale como se teclea.
          autoCapitalize="none"
          autoCorrect={sinSugerencias ? false : undefined}
          spellCheck={sinSugerencias ? false : undefined}
          autoComplete={sinSugerencias ? 'off' : undefined}
          importantForAutofill={sinSugerencias ? 'no' : undefined}
          // Teclado numérico (experimento): en Android solo existe para campos de una línea, así que el
          // campo puede verse aplanado mientras está activo, y la tecla Enter pasa a ser "Listo"
          // (onSubmitEditing), que la pantalla trata como Enter.
          // OJO: usar 'number-pad' y NO 'numeric'. En Android, 'numeric' activa los bits "con signo" y "decimal", que son
          // los mismos bits de "TODO EN MAYÚSCULA" y "Cada Palabra"; React Native no los borra al volver al teclado
          // normal y el teclado se queda en mayúsculas para siempre. 'number-pad' no usa esos bits.
          keyboardType={tecladoNumerico ? 'number-pad' : 'default'}
          onSubmitEditing={onSubmitEditing}
          onKeyPress={onKeyPress}
          // 'submit' = la tecla Enter/Listo del teclado numérico solo avisa a la app (no cierra el teclado
          // ni escribe nada); con el teclado normal sigue insertando el salto de línea.
          submitBehavior={tecladoNumerico ? 'submit' : 'newline'}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  leyenda: { fontSize: 12, color: C.sub, marginBottom: 6, textAlign: 'center' },
  medidor: { position: 'absolute', opacity: 0, fontFamily: MONO, fontSize: REF },
  caja: { flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: BORDE, borderColor: C.border },
  input: { flex: 1, padding: PAD, color: C.text, fontFamily: MONO },
});
