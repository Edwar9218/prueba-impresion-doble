// App.js - DomiPrint: 3 pestañas (Categorías, Historial, Plantillas) + Configuraciones (menú ⋮).
import React, { useEffect, useState } from 'react';
import { BackHandler, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PrinterProvider } from './src/PrinterContext';
import ConectarImpresora from './src/components/ConectarImpresora';
import CategoriasScreen from './src/screens/CategoriasScreen';
import TextoScreen from './src/screens/TextoScreen';
import DomicilioScreen from './src/screens/DomicilioScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import PlantillasScreen from './src/screens/PlantillasScreen';
import ConfiguracionScreen from './src/screens/ConfiguracionScreen';
import TamanoLetraScreen from './src/screens/TamanoLetraScreen';
import { C } from './src/theme';

const TABS = [
  { id: 'categorias', label: 'Categorías', icono: '🗂️' },
  { id: 'historial', label: 'Historial', icono: '🕘' },
  { id: 'plantillas', label: 'Plantillas', icono: '🧩' },
];

function Root() {
  const [tab, setTab] = useState('categorias');
  const [sub, setSub] = useState(null); // 'texto' | 'domicilio'
  const [config, setConfig] = useState(null); // null | 'menu' | 'tamano'
  const [menu, setMenu] = useState(false);
  const [inicial, setInicial] = useState(null); // { id, texto } cuando se edita desde Historial
  const [origen, setOrigen] = useState(null); // 'historial' si se llegó desde allí

  const abrirSub = (nombre) => {
    setInicial(null);
    setOrigen(null);
    setSub(nombre);
  };
  const editarDesdeHistorial = (tipo, texto) => {
    setInicial({ id: Date.now(), texto });
    setOrigen('historial');
    setTab('categorias');
    setSub(tipo === 'Domicilio' ? 'domicilio' : 'texto');
  };
  // Desde 'Tamaño de letra' se vuelve al menú de Configuraciones; desde el menú se sale.
  const atrasConfig = () => setConfig(config === 'tamano' ? 'menu' : null);
  const cerrarSub = () => {
    setSub(null);
    setInicial(null);
    if (origen === 'historial') {
      setTab('historial');
      setOrigen(null);
    }
  };

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menu) return setMenu(false) || true;
      if (config) return atrasConfig() || true;
      if (sub) return cerrarSub() || true;
      if (tab !== 'categorias') return setTab('categorias') || true;
      return false;
    });
    return () => h.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, config, sub, tab, origen]);

  const titulo = config === 'tamano'
    ? 'Tamaño de letra'
    : config
    ? 'Configuraciones'
    : sub === 'texto'
    ? 'Texto'
    : sub === 'domicilio'
    ? 'Domicilio'
    : tab === 'categorias'
    ? 'Categorías de impresión'
    : tab === 'historial'
    ? 'Historial'
    : 'Plantillas';

  const hayAtras = !!config || !!sub;
  const volver = () => (config ? atrasConfig() : cerrarSub());

  let cuerpo;
  if (config === 'tamano') cuerpo = <TamanoLetraScreen />;
  else if (config) cuerpo = <ConfiguracionScreen onAbrir={setConfig} />;
  else if (tab === 'categorias') {
    const clave = inicial ? inicial.id : 'normal';
    const txt = inicial ? inicial.texto : null;
    cuerpo =
      sub === 'texto' ? (
        <TextoScreen key={`t-${clave}`} textoInicial={txt} />
      ) : sub === 'domicilio' ? (
        <DomicilioScreen key={`d-${clave}`} textoInicial={txt} />
      ) : (
        <CategoriasScreen onAbrir={abrirSub} />
      );
  } else if (tab === 'historial') cuerpo = <HistorialScreen onEditar={editarDesdeHistorial} />;
  else cuerpo = <PlantillasScreen />;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        {hayAtras ? (
          <TouchableOpacity onPress={volver} style={s.btnHeader}>
            <Text style={s.btnHeaderTxt}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.btnHeader} />
        )}
        <Text style={s.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        {!config ? (
          <TouchableOpacity onPress={() => setMenu(true)} style={s.btnHeader}>
            <Text style={s.btnHeaderTxt}>⋮</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.btnHeader} />
        )}
      </View>

      <View style={s.cuerpo}>{cuerpo}</View>

      {!hayAtras && (
        <View style={s.tabbar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={s.tab}
              onPress={() => {
                setTab(t.id);
                setSub(null);
                setInicial(null);
                setOrigen(null);
              }}
            >
              <Text style={s.tabIcono}>{t.icono}</Text>
              <Text style={[s.tabLabel, tab === t.id && s.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <TouchableOpacity style={s.menuFondo} activeOpacity={1} onPress={() => setMenu(false)}>
          <View style={s.menu}>
            <TouchableOpacity
              onPress={() => {
                setMenu(false);
                setConfig('menu');
              }}
            >
              <Text style={s.menuItem}>Configuraciones</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConectarImpresora />
    </View>
  );
}

export default function App() {
  return (
    <PrinterProvider>
      <Root />
    </PrinterProvider>
  );
}

const TOP = StatusBar.currentHeight || 24;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.navy, paddingTop: TOP, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  titulo: { flex: 1, color: '#fff', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  btnHeader: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
  btnHeaderTxt: { color: '#fff', fontSize: 26, fontWeight: '700' },
  cuerpo: { flex: 1 },
  tabbar: { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, paddingBottom: 28 },
  tab: { flex: 1, alignItems: 'center' },
  tabIcono: { fontSize: 22 },
  tabLabel: { fontSize: 12, color: C.sub, marginTop: 2 },
  tabLabelOn: { color: C.primary, fontWeight: '800' },
  menuFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  menu: { position: 'absolute', top: TOP + 44, right: 10, backgroundColor: C.card, borderRadius: 10, paddingVertical: 6, minWidth: 180, elevation: 6 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: C.text },
});
