// ConectarImpresora.js - flujo de la sección 5: permisos -> Bluetooth -> lista -> prueba -> guardar -> soltar.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { usePrinter } from '../PrinterContext';
import { isBluetoothEnabled, probeConnection } from '../BluetoothPrinterService';
import { ensurePermissions } from '../permissions';
import Boton from './Boton';
import { C } from '../theme';

export default function ConectarImpresora() {
  const { conectarAbierto, cerrarConectar, guardarImpresora, printer } = usePrinter();
  const [fase, setFase] = useState('cargando'); // cargando | sinBluetooth | lista | conectando | exito | error
  const [lista, setLista] = useState([]);
  const [elegida, setElegida] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const iniciar = useCallback(async () => {
    setFase('cargando');
    try {
      if (!(await ensurePermissions())) {
        setMensaje('Se necesitan los permisos de Bluetooth para buscar tu impresora. Acéptalos e intenta de nuevo.');
        setFase('error');
        return;
      }
      if (!(await isBluetoothEnabled())) {
        setFase('sinBluetooth');
        return;
      }
      const vinculados = await RNBluetoothClassic.getBondedDevices();
      setLista(vinculados.map((d) => ({ name: d.name || 'Sin nombre', address: d.address })));
      setFase('lista');
    } catch (e) {
      setMensaje('No se pudieron cargar las impresoras. Revisa que el Bluetooth esté encendido e intenta de nuevo.');
      setFase('error');
    }
  }, []);

  useEffect(() => {
    if (conectarAbierto) iniciar();
  }, [conectarAbierto, iniciar]);

  // Al elegir la impresora queda como predeterminada DE INMEDIATO (aunque la prueba falle).
  // Solo cambia si el usuario la cambia a mano con "Cambiar impresora".
  const conectar = async (dispositivo) => {
    setElegida(dispositivo);
    await guardarImpresora(dispositivo);
    probar(dispositivo);
  };

  const probar = async (dispositivo) => {
    setFase('conectando');
    try {
      await probeConnection(dispositivo.address, { onLog: (m) => console.log('[conectar]', m) });
      setFase('exito'); // la prueba conectó y la impresora ya quedó libre
    } catch (e) {
      setFase('noResponde');
    }
  };

  const abrirAjustesBluetooth = () => {
    Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => Linking.openSettings());
  };

  return (
    <Modal
      visible={conectarAbierto}
      transparent
      animationType="fade"
      onRequestClose={() => fase !== 'conectando' && cerrarConectar()}
    >
      <View style={s.fondo}>
        <View style={s.tarjeta}>
          <Text style={s.titulo}>Conectar impresora</Text>

          {fase === 'cargando' && (
            <View style={s.centro}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.texto}>Cargando impresoras emparejadas...</Text>
            </View>
          )}

          {fase === 'sinBluetooth' && (
            <View>
              <Text style={s.texto}>
                El Bluetooth está apagado. Enciéndelo y vuelve a conectar la impresora.
              </Text>
              <Boton titulo="Abrir ajustes de Bluetooth" tipo="secundario" onPress={abrirAjustesBluetooth} style={s.gap} />
              <Boton titulo="Ya lo encendí" onPress={iniciar} style={s.gap} />
              <Boton titulo="Cerrar" tipo="secundario" onPress={cerrarConectar} style={s.gap} />
            </View>
          )}

          {fase === 'lista' && (
            <View>
              <Text style={s.sub}>Selecciona tu impresora</Text>
              {lista.length === 0 ? (
                <Text style={s.texto}>
                  No hay impresoras emparejadas. Vincula la PT-210 desde Ajustes de Android (Bluetooth) y toca Actualizar.
                </Text>
              ) : (
                <ScrollView style={s.scroll}>
                  {lista.map((d) => (
                    <TouchableOpacity key={d.address} style={s.item} onPress={() => conectar(d)}>
                      <Text style={s.itemNombre}>
                        {printer && printer.address === d.address ? '✔ ' : ''}
                        {d.name}
                      </Text>
                      <Text style={s.itemMac}>{d.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <Boton titulo="Actualizar" tipo="secundario" onPress={iniciar} style={s.gap} />
              <Boton titulo="Cancelar" tipo="secundario" onPress={cerrarConectar} style={s.gap} />
            </View>
          )}

          {fase === 'conectando' && (
            <View style={s.centro}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={s.texto}>Conectando a {elegida ? elegida.name : ''}...</Text>
            </View>
          )}

          {fase === 'exito' && (
            <View>
              <Text style={s.ok}>✔ Impresora conectada</Text>
              <Text style={s.texto}>
                {elegida ? elegida.name : ''} quedó guardada como predeterminada y ya está libre para usarla.
              </Text>
              <Boton titulo="Listo" onPress={cerrarConectar} style={s.gap} />
            </View>
          )}

          {fase === 'noResponde' && (
            <View>
              <Text style={s.error}>No respondió</Text>
              <Text style={s.texto}>
                {elegida ? elegida.name : ''} quedó guardada como predeterminada, pero no se pudo conectar ahora.
                {'\n\n'}Revisa que:{'\n'}• Esté encendida.{'\n'}• No esté conectada a otro celular o dispositivo.{'\n'}• Esté cerca de este celular.
              </Text>
              <Boton titulo="Reintentar" onPress={() => elegida && probar(elegida)} style={s.gap} />
              <Boton titulo="Elegir otra impresora" tipo="secundario" onPress={iniciar} style={s.gap} />
              <Boton titulo="Cerrar" tipo="secundario" onPress={cerrarConectar} style={s.gap} />
            </View>
          )}

          {fase === 'error' && (
            <View>
              <Text style={s.error}>No se pudo conectar</Text>
              <Text style={s.texto}>{mensaje}</Text>
              <Boton titulo="Elegir otra impresora" onPress={iniciar} style={s.gap} />
              <Boton titulo="Cerrar" tipo="secundario" onPress={cerrarConectar} style={s.gap} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  tarjeta: { backgroundColor: C.card, borderRadius: 16, padding: 18, maxHeight: '85%' },
  titulo: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 12 },
  sub: { fontSize: 14, color: C.sub, marginBottom: 8 },
  texto: { fontSize: 15, color: C.text, marginTop: 6, lineHeight: 21 },
  centro: { alignItems: 'center', paddingVertical: 18 },
  ok: { fontSize: 18, fontWeight: '800', color: C.ok },
  error: { fontSize: 18, fontWeight: '800', color: C.danger },
  scroll: { maxHeight: 260 },
  item: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  itemNombre: { fontSize: 16, fontWeight: '700', color: C.text },
  itemMac: { fontSize: 12, color: C.sub, marginTop: 2 },
  gap: { marginTop: 10 },
});
